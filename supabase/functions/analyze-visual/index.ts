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

    const { projectId, imageUrl, prompt, selectedRegion } = await req.json();

    if (!imageUrl) {
      return new Response(JSON.stringify({ error: 'Image URL is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Build the analysis prompt
    let analysisPrompt = prompt || 'Analyze this image thoroughly. Provide:';
    if (!prompt) {
      analysisPrompt += `
1. A detailed description of what you see
2. Any text visible in the image
3. If this is a chart or diagram, describe the data it represents
4. Key elements and their relationships
5. Suggested tags for categorization (as a JSON array)`;
    }

    if (selectedRegion) {
      analysisPrompt += `\n\nFocus specifically on the region at coordinates: x=${selectedRegion.x}, y=${selectedRegion.y}, width=${selectedRegion.width}, height=${selectedRegion.height}`;
    }

    // Call AI with vision using centralized service
    const result = await callAI({
      taskType: 'visual_analysis',
      userContent: analysisPrompt,
      imageUrl,
      projectId,
      userId: user.id,
      maxTokens: 2000,
      tools: [
        {
          type: 'function',
          function: {
            name: 'image_analysis_result',
            description: 'Return structured image analysis',
            parameters: {
              type: 'object',
              properties: {
                description: { type: 'string', description: 'Detailed description of the image' },
                tags: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Categorization tags'
                },
                extractedText: { type: 'string', description: 'Any text visible in the image' },
                chartData: {
                  type: 'object',
                  description: 'If this is a chart, the extracted data',
                  properties: {
                    chartType: { type: 'string' },
                    labels: { type: 'array', items: { type: 'string' } },
                    values: { type: 'array', items: { type: 'number' } },
                    title: { type: 'string' }
                  }
                },
                diagramElements: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      name: { type: 'string' },
                      type: { type: 'string' },
                      connections: { type: 'array', items: { type: 'string' } }
                    }
                  },
                  description: 'If this is a diagram, the elements and their connections'
                }
              },
              required: ['description', 'tags']
            }
          }
        }
      ],
      toolChoice: { type: 'function', function: { name: 'image_analysis_result' } }
    }, supabase);

    if (!result.success) {
      if (result.error?.includes('Rate limit')) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded, please try again later' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ error: result.error || 'AI analysis failed' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Extract the function call result
    let response = {
      description: '',
      tags: [] as string[],
      extractedData: {} as Record<string, unknown>
    };

    if (result.toolCalls?.[0]) {
      const toolCall = result.toolCalls[0] as { function?: { arguments?: string } };
      if (toolCall.function?.arguments) {
        try {
          const parsed = JSON.parse(toolCall.function.arguments);
          response = {
            description: parsed.description || '',
            tags: parsed.tags || [],
            extractedData: {
              extractedText: parsed.extractedText,
              chartData: parsed.chartData,
              diagramElements: parsed.diagramElements
            }
          };
        } catch {
          response.description = result.content || '';
        }
      }
    } else if (result.content) {
      response.description = result.content;
    }

    console.log('Image analysis completed for project:', projectId);

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Analyze visual error:', message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
