import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { rateLimitMiddleware } from "../_shared/rate-limiter.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation helpers
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const VALID_ROLES = ['user', 'admin', 'super_admin'] as const;
const VALID_TIERS = ['free', 'starter', 'pro', 'enterprise'] as const;
const VALID_STATUSES = ['active', 'suspended'] as const;
const MAX_SEARCH_LENGTH = 100;
const MAX_PAGE_SIZE = 100;

// Sanitize search input to prevent SQL injection via ILIKE
function sanitizeSearchInput(input: string): string {
  // Remove or escape special SQL LIKE/ILIKE pattern characters
  return input
    .replace(/\\/g, '\\\\') // Escape backslashes first
    .replace(/%/g, '\\%')   // Escape percent signs
    .replace(/_/g, '\\_')   // Escape underscores
    .substring(0, MAX_SEARCH_LENGTH); // Enforce max length
}

// Validate and parse query parameters for GET requests
function validateGetParams(url: URL): { 
  valid: true; 
  params: { page: number; pageSize: number; search: string; roleFilter: string; tierFilter: string; statusFilter: string }
} | { valid: false; error: string } {
  const pageStr = url.searchParams.get('page') || '1';
  const pageSizeStr = url.searchParams.get('pageSize') || '10';
  const search = url.searchParams.get('search') || '';
  const roleFilter = url.searchParams.get('role') || '';
  const tierFilter = url.searchParams.get('tier') || '';
  const statusFilter = url.searchParams.get('status') || '';

  // Validate page number
  const page = parseInt(pageStr, 10);
  if (isNaN(page) || page < 1 || page > 10000) {
    return { valid: false, error: 'Invalid page number. Must be between 1 and 10000.' };
  }

  // Validate page size
  const pageSize = parseInt(pageSizeStr, 10);
  if (isNaN(pageSize) || pageSize < 1 || pageSize > MAX_PAGE_SIZE) {
    return { valid: false, error: `Invalid pageSize. Must be between 1 and ${MAX_PAGE_SIZE}.` };
  }

  // Validate role filter if provided
  if (roleFilter && !VALID_ROLES.includes(roleFilter as typeof VALID_ROLES[number])) {
    return { valid: false, error: 'Invalid role filter. Must be one of: user, admin, super_admin.' };
  }

  // Validate tier filter if provided
  if (tierFilter && !VALID_TIERS.includes(tierFilter as typeof VALID_TIERS[number])) {
    return { valid: false, error: 'Invalid tier filter. Must be one of: free, starter, pro, enterprise.' };
  }

  // Validate status filter if provided
  if (statusFilter && !VALID_STATUSES.includes(statusFilter as typeof VALID_STATUSES[number])) {
    return { valid: false, error: 'Invalid status filter. Must be one of: active, suspended.' };
  }

  return {
    valid: true,
    params: {
      page,
      pageSize,
      search: sanitizeSearchInput(search),
      roleFilter,
      tierFilter,
      statusFilter,
    }
  };
}

interface UpdateUserInput {
  userId: string;
  role?: typeof VALID_ROLES[number];
  subscriptionTier?: typeof VALID_TIERS[number];
  status?: typeof VALID_STATUSES[number];
}

// Validate PATCH request body
function validatePatchBody(body: unknown): { valid: true; data: UpdateUserInput } | { valid: false; error: string } {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Invalid request body' };
  }

  const { userId, role, subscriptionTier, status } = body as Record<string, unknown>;

  // Validate userId (required)
  if (!userId || typeof userId !== 'string' || !UUID_REGEX.test(userId)) {
    return { valid: false, error: 'Invalid userId. Must be a valid UUID.' };
  }

  // Validate role if provided
  if (role !== undefined) {
    if (typeof role !== 'string' || !VALID_ROLES.includes(role as typeof VALID_ROLES[number])) {
      return { valid: false, error: 'Invalid role. Must be one of: user, admin, super_admin.' };
    }
  }

  // Validate subscriptionTier if provided
  if (subscriptionTier !== undefined) {
    if (typeof subscriptionTier !== 'string' || !VALID_TIERS.includes(subscriptionTier as typeof VALID_TIERS[number])) {
      return { valid: false, error: 'Invalid subscriptionTier. Must be one of: free, starter, pro, enterprise.' };
    }
  }

  // Validate status if provided
  if (status !== undefined) {
    if (typeof status !== 'string' || !VALID_STATUSES.includes(status as typeof VALID_STATUSES[number])) {
      return { valid: false, error: 'Invalid status. Must be one of: active, suspended.' };
    }
  }

  return {
    valid: true,
    data: {
      userId: userId as string,
      role: role as UpdateUserInput['role'],
      subscriptionTier: subscriptionTier as UpdateUserInput['subscriptionTier'],
      status: status as UpdateUserInput['status'],
    }
  };
}

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

    // Verify user
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getUser(token);
    
    if (claimsError || !claimsData?.user) {
      console.error('Auth error:', claimsError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const currentUserId = claimsData.user.id;

    // Check if user is admin
    const { data: currentProfile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', currentUserId)
      .single();

    if (profileError || !currentProfile) {
      return new Response(
        JSON.stringify({ error: 'Profile not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const isAdmin = currentProfile.role === 'admin' || currentProfile.role === 'super_admin';
    const isSuperAdmin = currentProfile.role === 'super_admin';

    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: 'Forbidden: Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    if (req.method === 'GET') {
      const url = new URL(req.url);
      
      // Validate query parameters
      const validation = validateGetParams(url);
      if (!validation.valid) {
        return new Response(
          JSON.stringify({ error: validation.error }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { page, pageSize, search, roleFilter, tierFilter, statusFilter } = validation.params;

      let query = adminClient
        .from('profiles')
        .select(`
          id,
          name,
          email,
          role,
          subscription_tier,
          status,
          avatar_url,
          created_at,
          updated_at,
          usage_limits!inner (
            documents_count,
            processing_count,
            storage_bytes,
            reset_date
          )
        `, { count: 'exact' });

      // Use sanitized search input with proper escaping
      if (search) {
        query = query.or(`email.ilike.%${search}%,name.ilike.%${search}%`);
      }

      if (roleFilter) {
        query = query.eq('role', roleFilter);
      }

      if (tierFilter) {
        query = query.eq('subscription_tier', tierFilter);
      }

      if (statusFilter) {
        query = query.eq('status', statusFilter);
      }

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      const { data: users, count, error } = await query
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) {
        console.error('Users query error:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to fetch users' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Transform the data
      const transformedUsers = users?.map(user => {
        const usageLimits = Array.isArray(user.usage_limits) ? user.usage_limits[0] : user.usage_limits;
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          subscriptionTier: user.subscription_tier,
          status: user.status,
          avatarUrl: user.avatar_url,
          createdAt: user.created_at,
          updatedAt: user.updated_at,
          usage: usageLimits ? {
            documentsCount: usageLimits.documents_count,
            processingCount: usageLimits.processing_count,
            storageBytes: usageLimits.storage_bytes,
            resetDate: usageLimits.reset_date,
          } : null,
        };
      }) || [];

      return new Response(
        JSON.stringify({
          data: transformedUsers,
          total: count || 0,
          page,
          pageSize,
          totalPages: Math.ceil((count || 0) / pageSize),
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (req.method === 'PATCH') {
      // Parse and validate request body
      let body: unknown;
      try {
        body = await req.json();
      } catch {
        return new Response(
          JSON.stringify({ error: 'Invalid JSON body' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const validation = validatePatchBody(body);
      if (!validation.valid) {
        return new Response(
          JSON.stringify({ error: validation.error }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { userId, role, subscriptionTier, status } = validation.data;

      // Get target user's current role
      const { data: targetUser, error: targetError } = await adminClient
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();

      if (targetError || !targetUser) {
        return new Response(
          JSON.stringify({ error: 'User not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Role change validation
      if (role && role !== targetUser.role) {
        // Only super_admin can promote to admin/super_admin
        if ((role === 'admin' || role === 'super_admin') && !isSuperAdmin) {
          return new Response(
            JSON.stringify({ error: 'Only super_admin can promote users to admin roles' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Only super_admin can demote admin/super_admin
        if ((targetUser.role === 'admin' || targetUser.role === 'super_admin') && !isSuperAdmin) {
          return new Response(
            JSON.stringify({ error: 'Only super_admin can modify admin roles' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      const updateData: Record<string, string> = {};
      if (role) updateData.role = role;
      if (subscriptionTier) updateData.subscription_tier = subscriptionTier;
      if (status) updateData.status = status;

      const { data: updatedUser, error: updateError } = await adminClient
        .from('profiles')
        .update(updateData)
        .eq('id', userId)
        .select()
        .single();

      if (updateError) {
        console.error('Update error:', updateError);
        return new Response(
          JSON.stringify({ error: 'Failed to update user' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({
          id: updatedUser.id,
          name: updatedUser.name,
          email: updatedUser.email,
          role: updatedUser.role,
          subscriptionTier: updatedUser.subscription_tier,
          status: updatedUser.status,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Admin users error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
