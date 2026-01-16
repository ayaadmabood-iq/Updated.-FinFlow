import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callAI } from "../_shared/ai-call.ts";
import { rateLimitMiddleware } from "../_shared/rate-limiter.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const authHeader = req.headers.get('Authorization');
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader || '' } }
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }
    // Rate limiting
    const rateLimitResponse = await rateLimitMiddleware(supabase, user.id, 'generate', corsHeaders);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }
), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { assetId, imageUrl } = await req.json();

    if (!assetId || !imageUrl) {
      return new Response(JSON.stringify({ error: 'Asset ID and image URL are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get the media asset
    const { data: asset, error: assetError } = await supabase
      .from('media_assets')
      .select('*')
      .eq('id', assetId)
      .single();

    if (assetError || !asset) {
      return new Response(JSON.stringify({ error: 'Media asset not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create extraction record
    const { data: extraction, error: createError } = await supabase
      .from('visual_extractions')
      .insert({
        media_asset_id: assetId,
        project_id: asset.project_id,
        user_id: user.id,
        extraction_type: 'chart_to_table',
        status: 'processing',
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (createError) {
      throw createError;
    }

    // Use centralized AI call for chart extraction
    const result = await callAI({
      taskType: 'chart_extraction',
      userContent: `Analyze this chart image and extract all data into a structured format. 
                
Identify:
1. The chart type (bar, line, pie, scatter, etc.)
2. The title if visible
3. All axis labels
4. All data points with their exact values
5. Any legend information

Return the data as structured JSON that can be converted into a table.`,
      imageUrl,
      projectId: asset.project_id,
      userId: user.id,
      maxTokens: 3000,
      tools: [
        {
          type: 'function',
          function: {
            name: 'chart_data_extraction',
            description: 'Extract structured data from a chart image',
            parameters: {
              type: 'object',
              properties: {
                chartType: { 
                  type: 'string',
                  enum: ['bar', 'line', 'pie', 'scatter', 'area', 'column', 'donut', 'histogram', 'other']
                },
                title: { type: 'string' },
                xAxisLabel: { type: 'string' },
                yAxisLabel: { type: 'string' },
                dataLabels: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Labels for each data point or category'
                },
                dataSeries: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      name: { type: 'string' },
                      values: { type: 'array', items: { type: 'number' } },
                      color: { type: 'string' }
                    }
                  },
                  description: 'Data series with their values'
                },
                tableData: {
                  type: 'array',
                  items: {
                    type: 'object',
                    additionalProperties: true
                  },
                  description: 'Data formatted as table rows'
                },
                confidence: {
                  type: 'number',
                  description: 'Confidence score 0-1 for the extraction accuracy'
                }
              },
              required: ['chartType', 'dataLabels', 'dataSeries', 'tableData', 'confidence']
            }
          }
        }
      ],
      toolChoice: { type: 'function', function: { name: 'chart_data_extraction' } }
    }, supabase);

    if (!result.success) {
      await supabase
        .from('visual_extractions')
        .update({
          status: 'failed',
          error_message: result.error || 'Chart extraction failed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', extraction.id);

      return new Response(JSON.stringify({ error: result.error || 'Chart extraction failed' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let extractedData = {
      chartType: 'other',
      title: '',
      xAxisLabel: '',
      yAxisLabel: '',
      dataLabels: [] as string[],
      dataSeries: [] as unknown[],
      tableData: [] as unknown[],
      confidence: 0
    };

    if (result.toolCalls?.[0]) {
      const toolCall = result.toolCalls[0] as { function?: { arguments?: string } };
      if (toolCall.function?.arguments) {
        try {
          extractedData = JSON.parse(toolCall.function.arguments);
        } catch {
          await supabase
            .from('visual_extractions')
            .update({
              status: 'failed',
              error_message: 'Failed to parse extraction data',
              completed_at: new Date().toISOString(),
            })
            .eq('id', extraction.id);

          return new Response(JSON.stringify({ error: 'Failed to parse extraction data' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }
    }

    // Update extraction with results
    const { data: updatedExtraction, error: updateError } = await supabase
      .from('visual_extractions')
      .update({
        status: 'completed',
        extracted_data: extractedData,
        structured_table: { rows: extractedData.tableData },
        chart_type: extractedData.chartType,
        data_labels: extractedData.dataLabels,
        data_values: { series: extractedData.dataSeries },
        confidence_score: extractedData.confidence,
        tokens_used: result.tokensUsed,
        completed_at: new Date().toISOString(),
      })
      .eq('id', extraction.id)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    console.log('Chart data extraction completed for asset:', assetId);

    return new Response(JSON.stringify(updatedExtraction), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Extract chart data error:', message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
