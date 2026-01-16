import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
};

// Hash function for API key verification
async function hashApiKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Get API key from header
    const apiKey = req.headers.get('x-api-key');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'Missing API key', code: 'UNAUTHORIZED' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract prefix and hash full key
    const keyPrefix = apiKey.substring(0, 8);
    const keyHash = await hashApiKey(apiKey);

    // Validate API key
    const { data: apiKeyData, error: keyError } = await supabase
      .from('api_keys')
      .select('*')
      .eq('key_prefix', keyPrefix)
      .eq('key_hash', keyHash)
      .eq('is_active', true)
      .is('revoked_at', null)
      .single();

    if (keyError || !apiKeyData) {
      return new Response(
        JSON.stringify({ error: 'Invalid API key', code: 'UNAUTHORIZED' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check expiration
    if (apiKeyData.expires_at && new Date(apiKeyData.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: 'API key expired', code: 'UNAUTHORIZED' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check rate limit
    const { data: rateLimitResult } = await supabase.rpc('check_api_rate_limit', {
      p_api_key_id: apiKeyData.id,
      p_rate_limit_per_minute: apiKeyData.rate_limit_per_minute,
      p_rate_limit_per_day: apiKeyData.rate_limit_per_day,
    }) as { data: any };

    if (!rateLimitResult?.allowed) {
      return new Response(
        JSON.stringify({ 
          error: 'Rate limit exceeded', 
          code: 'RATE_LIMITED',
          retry_after: rateLimitResult?.retry_after 
        }),
        { 
          status: 429, 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'Retry-After': String(rateLimitResult?.retry_after || 60)
          } 
        }
      );
    }

    // Update usage stats
    await supabase
      .from('api_keys')
      .update({ 
        last_used_at: new Date().toISOString(),
        usage_count: (apiKeyData.usage_count || 0) + 1
      })
      .eq('id', apiKeyData.id);

    // Handle different endpoints
    const url = new URL(req.url);
    const path = url.pathname.replace('/api-ingest', '');

    if (req.method === 'POST' && (path === '' || path === '/')) {
      // Main ingest endpoint
      const contentType = req.headers.get('content-type') || '';
      
      let documentData: {
        name: string;
        content?: string;
        url?: string;
        project_id?: string;
        metadata?: Record<string, any>;
      };

      if (contentType.includes('multipart/form-data')) {
        // Handle file upload
        const formData = await req.formData();
        const file = formData.get('file') as File;
        const projectId = formData.get('project_id') as string;
        const metadata = formData.get('metadata') as string;

        if (!file) {
          return new Response(
            JSON.stringify({ error: 'No file provided', code: 'BAD_REQUEST' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Use project from API key if not specified
        const targetProjectId = projectId || apiKeyData.project_id;
        if (!targetProjectId) {
          return new Response(
            JSON.stringify({ error: 'Project ID required', code: 'BAD_REQUEST' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Upload to storage
        const fileBuffer = await file.arrayBuffer();
        const filePath = `${apiKeyData.user_id}/${targetProjectId}/${Date.now()}-${file.name}`;
        
        const { error: uploadError } = await supabase.storage
          .from('project-documents')
          .upload(filePath, fileBuffer, {
            contentType: file.type,
            upsert: false
          });

        if (uploadError) {
          throw new Error(`Upload failed: ${uploadError.message}`);
        }

        // Create document record
        const { data: document, error: docError } = await supabase
          .from('documents')
          .insert({
            name: file.name,
            original_name: file.name,
            mime_type: file.type,
            size_bytes: file.size,
            storage_path: filePath,
            project_id: targetProjectId,
            owner_id: apiKeyData.user_id,
            status: 'pending',
            processing_metadata: {
              source: 'api',
              api_key_id: apiKeyData.id,
              ...(metadata ? JSON.parse(metadata) : {})
            }
          })
          .select()
          .single();

        if (docError) {
          throw new Error(`Document creation failed: ${docError.message}`);
        }

        // Log integration event
        await supabase.from('integration_events').insert({
          user_id: apiKeyData.user_id,
          project_id: targetProjectId,
          event_type: 'api_ingest',
          title: `File ingested via API: ${file.name}`,
          description: `Document uploaded through API key "${apiKeyData.name}"`,
          metadata: { 
            document_id: document.id,
            file_size: file.size,
            mime_type: file.type
          },
          resource_type: 'document',
          resource_id: document.id,
          resource_name: file.name,
          status: 'success'
        });

        // Trigger processing via pipeline-orchestrator (single execution path)
        await supabase.functions.invoke('pipeline-orchestrator', {
          body: { 
            action: 'enqueue',
            documentId: document.id,
            projectId: targetProjectId,
            storagePath: filePath,
            ownerId: apiKeyData.user_id,
            priority: 0,
          }
        });

        return new Response(
          JSON.stringify({ 
            success: true, 
            document: {
              id: document.id,
              name: document.name,
              status: 'processing'
            },
            rate_limit: {
              minute_remaining: rateLimitResult?.minute_remaining,
              daily_remaining: rateLimitResult?.daily_remaining
            }
          }),
          { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

      } else if (contentType.includes('application/json')) {
        // Handle JSON payload (URL or text content)
        documentData = await req.json();
        
        const targetProjectId = documentData.project_id || apiKeyData.project_id;
        if (!targetProjectId) {
          return new Response(
            JSON.stringify({ error: 'Project ID required', code: 'BAD_REQUEST' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        if (documentData.url) {
          // Create data source for URL
          const { data: dataSource, error: dsError } = await supabase
            .from('data_sources')
            .insert({
              name: documentData.name || documentData.url,
              source_type: 'url',
              original_url: documentData.url,
              project_id: targetProjectId,
              user_id: apiKeyData.user_id,
              status: 'pending',
              metadata: {
                source: 'api',
                api_key_id: apiKeyData.id,
                ...documentData.metadata
              }
            })
            .select()
            .single();

          if (dsError) {
            throw new Error(`Data source creation failed: ${dsError.message}`);
          }

          // Log event
          await supabase.from('integration_events').insert({
            user_id: apiKeyData.user_id,
            project_id: targetProjectId,
            event_type: 'api_ingest',
            title: `URL queued via API: ${documentData.url}`,
            description: `URL added through API key "${apiKeyData.name}"`,
            metadata: { data_source_id: dataSource.id, url: documentData.url },
            resource_type: 'data_source',
            resource_id: dataSource.id,
            resource_name: documentData.name || documentData.url,
            status: 'success'
          });

          return new Response(
            JSON.stringify({ 
              success: true, 
              data_source: {
                id: dataSource.id,
                name: dataSource.name,
                status: 'pending'
              },
              rate_limit: {
                minute_remaining: rateLimitResult?.minute_remaining,
                daily_remaining: rateLimitResult?.daily_remaining
              }
            }),
            { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );

        } else if (documentData.content) {
          // Create data source for text content
          const { data: dataSource, error: dsError } = await supabase
            .from('data_sources')
            .insert({
              name: documentData.name || 'API Text Input',
              source_type: 'text',
              raw_content: documentData.content,
              project_id: targetProjectId,
              user_id: apiKeyData.user_id,
              status: 'ready',
              metadata: {
                source: 'api',
                api_key_id: apiKeyData.id,
                ...documentData.metadata
              }
            })
            .select()
            .single();

          if (dsError) {
            throw new Error(`Data source creation failed: ${dsError.message}`);
          }

          // Log event
          await supabase.from('integration_events').insert({
            user_id: apiKeyData.user_id,
            project_id: targetProjectId,
            event_type: 'api_ingest',
            title: `Text ingested via API: ${documentData.name || 'Untitled'}`,
            description: `Text content added through API key "${apiKeyData.name}"`,
            metadata: { 
              data_source_id: dataSource.id, 
              content_length: documentData.content.length 
            },
            resource_type: 'data_source',
            resource_id: dataSource.id,
            resource_name: documentData.name || 'API Text Input',
            status: 'success'
          });

          return new Response(
            JSON.stringify({ 
              success: true, 
              data_source: {
                id: dataSource.id,
                name: dataSource.name,
                status: 'ready'
              },
              rate_limit: {
                minute_remaining: rateLimitResult?.minute_remaining,
                daily_remaining: rateLimitResult?.daily_remaining
              }
            }),
            { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } else {
          return new Response(
            JSON.stringify({ error: 'Must provide either url or content', code: 'BAD_REQUEST' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      } else {
        return new Response(
          JSON.stringify({ error: 'Unsupported content type', code: 'BAD_REQUEST' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    return new Response(
      JSON.stringify({ error: 'Not found', code: 'NOT_FOUND' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('API Ingest error:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message, code: 'INTERNAL_ERROR' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
