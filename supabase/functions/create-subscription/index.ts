import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { validateSubscription, getTierLimits } from "../_shared/subscription-validator.ts";
import { rateLimitMiddleware } from "../_shared/rate-limiter.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from auth header
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
    const rateLimitResponse = await rateLimitMiddleware(supabase, user.id, 'default', corsHeaders);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }
),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { tier, inviteCode } = await req.json();

    if (!tier || !['free', 'starter', 'pro', 'enterprise'].includes(tier)) {
      return new Response(
        JSON.stringify({ error: 'Invalid tier' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // For paid tiers, require invite code during soft launch (simulates payment validation)
    if (tier !== 'free') {
      if (!inviteCode) {
        return new Response(
          JSON.stringify({ 
            error: 'Payment required', 
            message: 'An invite code is required during soft launch. Contact support for access.',
            requiresPayment: true 
          }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Validate invite code
      const { data: codeData, error: codeError } = await supabase
        .from('invite_codes')
        .select('code, max_uses, used_count, expires_at, tier_granted')
        .eq('code', inviteCode.toUpperCase())
        .maybeSingle();

      if (codeError || !codeData) {
        return new Response(
          JSON.stringify({ error: 'Invalid invite code' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check code validity
      if (codeData.max_uses && codeData.used_count >= codeData.max_uses) {
        return new Response(
          JSON.stringify({ error: 'Invite code has reached maximum uses' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (codeData.expires_at && new Date(codeData.expires_at) < new Date()) {
        return new Response(
          JSON.stringify({ error: 'Invite code has expired' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check if code grants the requested tier
      if (codeData.tier_granted && codeData.tier_granted !== tier) {
        return new Response(
          JSON.stringify({ error: `This invite code is for ${codeData.tier_granted} tier only` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Increment used_count
      await supabase
        .from('invite_codes')
        .update({ used_count: (codeData.used_count || 0) + 1 })
        .eq('code', inviteCode.toUpperCase());
    }

    

    // Check if downgrade is allowed (if changing to a lower tier)
    const { data: currentSub } = await supabase
      .from('subscriptions')
      .select('tier')
      .eq('user_id', user.id)
      .single();

    if (currentSub) {
      const tierOrder = ['free', 'starter', 'pro', 'enterprise'];
      const currentIndex = tierOrder.indexOf(currentSub.tier);
      const newIndex = tierOrder.indexOf(tier);

      if (newIndex < currentIndex) {
        // This is a downgrade, check if allowed
        const { data: canDowngrade } = await supabase.rpc('can_downgrade_tier', {
          _user_id: user.id,
          _new_tier: tier,
        });

        if (!canDowngrade?.allowed) {
          return new Response(
            JSON.stringify({
              error: 'Cannot downgrade',
              reason: canDowngrade?.reason,
              current: canDowngrade?.current,
              limit: canDowngrade?.limit,
            }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    }

    // SOFT LAUNCH: Mock payment success - no actual payment processing
    // In production, integrate with Stripe here

    // Upsert subscription
    const { data: subscription, error: upsertError } = await supabase
      .from('subscriptions')
      .upsert({
        user_id: user.id,
        tier,
        status: 'active',
        started_at: new Date().toISOString(),
        provider: 'mock', // Soft launch - no real payment
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id',
      })
      .select()
      .single();

    if (upsertError) {
      console.error('[create-subscription] Error upserting subscription:', upsertError);
      throw upsertError;
    }

    // Get the pricing plan details
    const { data: plan } = await supabase
      .from('pricing_plans')
      .select('*')
      .eq('tier', tier)
      .single();

    

    return new Response(
      JSON.stringify({
        subscription,
        plan,
        message: 'Subscription created successfully',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[create-subscription] Error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
