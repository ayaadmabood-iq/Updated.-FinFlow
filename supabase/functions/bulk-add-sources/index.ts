import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BulkAddRequest {
  project_id: string;
  urls: string[];
}

function isValidUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }
    // Rate limiting
    const rateLimitResponse = await rateLimitMiddleware(supabase, user.id, 'document_upload', corsHeaders);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }
),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: BulkAddRequest = await req.json();
    

    if (!body.project_id || !body.urls || !Array.isArray(body.urls)) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: project_id, urls (array)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify project ownership
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id')
      .eq('id', body.project_id)
      .eq('owner_id', user.id)
      .single();

    if (projectError || !project) {
      return new Response(
        JSON.stringify({ error: 'Project not found or access denied' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Filter and validate URLs
    const validUrls = body.urls
      .map(url => url.trim())
      .filter(url => url.length > 0 && isValidUrl(url))
      .slice(0, 100); // Limit to 100 URLs per batch

    if (validUrls.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No valid URLs provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create data source records for each URL
    const insertData = validUrls.map(url => {
      try {
        const urlObj = new URL(url);
        return {
          project_id: body.project_id,
          user_id: user.id,
          name: urlObj.hostname + urlObj.pathname.slice(0, 50),
          source_type: 'url',
          original_url: url,
          status: 'pending',
        };
      } catch {
        return null;
      }
    }).filter(Boolean);

    const { data: dataSources, error: insertError } = await supabase
      .from('data_sources')
      .insert(insertData)
      .select();

    if (insertError) {
      console.error('Bulk insert error:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to create data sources', details: insertError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    

    return new Response(
      JSON.stringify({ 
        data: dataSources,
        summary: {
          total_requested: body.urls.length,
          valid_urls: validUrls.length,
          created: dataSources?.length || 0,
        }
      }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in bulk-add-sources:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
