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

    const { assetId, mediaUrl } = await req.json();

    if (!assetId || !mediaUrl) {
      return new Response(JSON.stringify({ error: 'Asset ID and media URL are required' }), {
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

    // Create transcription record
    const { data: transcription, error: createError } = await supabase
      .from('media_transcriptions')
      .insert({
        media_asset_id: assetId,
        project_id: asset.project_id,
        user_id: user.id,
        status: 'processing',
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (createError) {
      throw createError;
    }

    // For video files, we need to extract audio or use a multimodal approach
    const isVideo = asset.media_type === 'video';

    const systemPrompt = isVideo
      ? `Analyze this video thoroughly. Provide:
1. A complete transcription of all spoken content with timestamps
2. Description of key visual moments (keyframes)
3. A visual summary combining audio and visual information
4. Speaker identification if multiple speakers are present`
      : `Transcribe this audio file completely. Provide:
1. Full text transcription with timestamps for each segment
2. Speaker identification if multiple speakers
3. Any notable audio elements (music, sound effects)`;

    // Use centralized AI call for transcription
    const result = await callAI({
      taskType: 'transcription',
      systemPrompt,
      userContent: `Media URL: ${mediaUrl}`,
      projectId: asset.project_id,
      userId: user.id,
      maxTokens: 4000,
      tools: [
        {
          type: 'function',
          function: {
            name: 'transcription_result',
            description: 'Return structured transcription and analysis',
            parameters: {
              type: 'object',
              properties: {
                transcriptText: { 
                  type: 'string',
                  description: 'Full transcript text'
                },
                segments: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      startTime: { type: 'number' },
                      endTime: { type: 'number' },
                      text: { type: 'string' },
                      speaker: { type: 'string' }
                    }
                  }
                },
                speakers: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      name: { type: 'string' },
                      speakingTime: { type: 'number' }
                    }
                  }
                },
                keyframes: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      timestamp: { type: 'number' },
                      description: { type: 'string' },
                      significance: { type: 'string' }
                    }
                  }
                },
                visualSummary: { type: 'string' },
                language: { type: 'string' },
                durationSeconds: { type: 'number' },
                wordCount: { type: 'integer' }
              },
              required: ['transcriptText', 'language']
            }
          }
        }
      ],
      toolChoice: { type: 'function', function: { name: 'transcription_result' } }
    }, supabase);

    if (!result.success) {
      await supabase
        .from('media_transcriptions')
        .update({
          status: 'failed',
          error_message: result.error || 'Transcription failed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', transcription.id);

      return new Response(JSON.stringify({ error: result.error || 'Transcription failed' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let transcriptData = {
      transcriptText: '',
      segments: [] as unknown[],
      speakers: [] as unknown[],
      keyframes: [] as unknown[],
      visualSummary: '',
      language: 'en',
      durationSeconds: 0,
      wordCount: 0
    };

    if (result.toolCalls?.[0]) {
      const toolCall = result.toolCalls[0] as { function?: { arguments?: string } };
      if (toolCall.function?.arguments) {
        try {
          transcriptData = JSON.parse(toolCall.function.arguments);
        } catch {
          transcriptData.transcriptText = result.content || '';
          transcriptData.wordCount = transcriptData.transcriptText.split(/\s+/).length;
        }
      }
    } else if (result.content) {
      transcriptData.transcriptText = result.content;
      transcriptData.wordCount = transcriptData.transcriptText.split(/\s+/).length;
    }

    // Update transcription with results
    const { data: updatedTranscription, error: updateError } = await supabase
      .from('media_transcriptions')
      .update({
        status: 'completed',
        transcript_text: transcriptData.transcriptText,
        transcript_segments: { segments: transcriptData.segments },
        language: transcriptData.language,
        duration_seconds: transcriptData.durationSeconds || asset.duration_seconds,
        word_count: transcriptData.wordCount,
        speaker_labels: { speakers: transcriptData.speakers },
        keyframes: { frames: transcriptData.keyframes },
        visual_summary: transcriptData.visualSummary,
        tokens_used: result.tokensUsed,
        completed_at: new Date().toISOString(),
      })
      .eq('id', transcription.id)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    console.log('Media transcription completed for asset:', assetId);

    return new Response(JSON.stringify(updatedTranscription), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Transcribe media error:', message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
