import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AddDataSourceRequest {
  project_id: string;
  source_type: 'file' | 'url' | 'text';
  name: string;
  url?: string;
  raw_content?: string;
  file_path?: string;
  file_name?: string;
  file_size?: number;
  mime_type?: string;
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

    const body: AddDataSourceRequest = await req.json();
    

    // Validate required fields
    if (!body.project_id || !body.source_type || !body.name) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: project_id, source_type, name' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate source type specific fields
    if (body.source_type === 'url' && !body.url) {
      return new Response(
        JSON.stringify({ error: 'URL is required for url source type' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (body.source_type === 'text' && (!body.raw_content || body.raw_content.length < 10)) {
      return new Response(
        JSON.stringify({ error: 'Text content must be at least 10 characters' }),
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

    // Create data source record
    const insertData: Record<string, unknown> = {
      project_id: body.project_id,
      user_id: user.id,
      name: body.name.slice(0, 255),
      source_type: body.source_type,
      status: body.source_type === 'text' ? 'completed' : 'pending',
    };

    if (body.source_type === 'file') {
      insertData.file_path = body.file_path;
      insertData.file_name = body.file_name;
      insertData.file_size = body.file_size;
      insertData.mime_type = body.mime_type;
      insertData.status = 'completed';
    } else if (body.source_type === 'url') {
      insertData.original_url = body.url;
    } else if (body.source_type === 'text') {
      insertData.raw_content = body.raw_content;
    }

    const { data: dataSource, error: insertError } = await supabase
      .from('data_sources')
      .insert(insertData)
      .select()
      .single();

    if (insertError) {
      console.error('Insert error:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to create data source', details: insertError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    

    return new Response(
      JSON.stringify({ data: dataSource }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in add-data-source:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
