import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { rateLimitMiddleware } from "../_shared/rate-limiter.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Verify user and get claims
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getUser(token);
    
    if (claimsError || !claimsData?.user) {
      console.error('Auth error:', claimsError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = claimsData.user.id;
    // Rate limiting
    const rateLimitResponse = await rateLimitMiddleware(supabase, userId, 'default', corsHeaders);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }


    // Check if user is admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      console.error('Profile error:', profileError);
      return new Response(
        JSON.stringify({ error: 'Profile not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (profile.role !== 'admin' && profile.role !== 'super_admin') {
      return new Response(
        JSON.stringify({ error: 'Forbidden: Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use service role for admin queries
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Get total users
    const { count: totalUsers, error: usersError } = await adminClient
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    if (usersError) {
      console.error('Users count error:', usersError);
    }

    // Get total documents
    const { count: totalDocuments, error: docsError } = await adminClient
      .from('documents')
      .select('*', { count: 'exact', head: true })
      .is('deleted_at', null);

    if (docsError) {
      console.error('Documents count error:', docsError);
    }

    // Get storage and processing stats
    const { data: usageLimits, error: usageError } = await adminClient
      .from('usage_limits')
      .select('storage_bytes, processing_count');

    if (usageError) {
      console.error('Usage limits error:', usageError);
    }

    const totalStorageBytes = usageLimits?.reduce((sum, u) => sum + (u.storage_bytes || 0), 0) || 0;
    const totalProcessingCount = usageLimits?.reduce((sum, u) => sum + (u.processing_count || 0), 0) || 0;

    // Get users by tier
    const { data: tierData, error: tierError } = await adminClient
      .from('profiles')
      .select('subscription_tier');

    if (tierError) {
      console.error('Tier data error:', tierError);
    }

    const usersByTier = tierData?.reduce((acc, p) => {
      const tier = p.subscription_tier || 'free';
      acc[tier] = (acc[tier] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};

    // Get users by role
    const { data: roleData, error: roleError } = await adminClient
      .from('profiles')
      .select('role');

    if (roleError) {
      console.error('Role data error:', roleError);
    }

    const usersByRole = roleData?.reduce((acc, p) => {
      const role = p.role || 'user';
      acc[role] = (acc[role] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};

    const stats = {
      totalUsers: totalUsers || 0,
      totalDocuments: totalDocuments || 0,
      totalStorageBytes,
      totalProcessingCount,
      usersByTier,
      usersByRole,
    };

    

    return new Response(
      JSON.stringify(stats),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Admin stats error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
