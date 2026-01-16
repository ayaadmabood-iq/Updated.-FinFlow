import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DashboardRequest {
  action: 'summary' | 'timeseries' | 'alerts';
  timeRange?: '1h' | '24h' | '7d' | '30d';
  metricName?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Verify user is admin
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authorization' }
    // Rate limiting
    const rateLimitResponse = await rateLimitMiddleware(supabase, user.id, 'default', corsHeaders);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }
),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: DashboardRequest = await req.json();
    const { action, timeRange = '24h', metricName } = body;

    // Calculate time range
    const now = new Date();
    let startTime: Date;
    switch (timeRange) {
      case '1h':
        startTime = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case '24h':
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }

    let result: unknown;

    switch (action) {
      case 'summary': {
        // Get metrics summary
        const { data: summary, error } = await supabase.rpc('get_metrics_summary', {
          time_range: `${timeRange === '1h' ? '1 hour' : timeRange === '24h' ? '24 hours' : timeRange === '7d' ? '7 days' : '30 days'}`
        });

        if (error) {
          console.error('Error fetching summary:', error);
          throw error;
        }

        // Get key metrics
        const { data: apiCalls } = await supabase
          .from('metrics')
          .select('value')
          .eq('name', 'api.call')
          .gte('timestamp', startTime.toISOString());

        const { data: apiErrors } = await supabase
          .from('metrics')
          .select('value')
          .eq('name', 'api.error')
          .gte('timestamp', startTime.toISOString());

        const { data: aiOperations } = await supabase
          .from('metrics')
          .select('value')
          .eq('name', 'ai.operation')
          .gte('timestamp', startTime.toISOString());

        const { data: aiCost } = await supabase
          .from('metrics')
          .select('value')
          .eq('name', 'ai.cost')
          .gte('timestamp', startTime.toISOString());

        const { data: errors } = await supabase
          .from('metrics')
          .select('value')
          .eq('name', 'error')
          .gte('timestamp', startTime.toISOString());

        result = {
          summary: summary || [],
          overview: {
            totalApiCalls: apiCalls?.length || 0,
            totalApiErrors: apiErrors?.length || 0,
            errorRate: apiCalls?.length ? ((apiErrors?.length || 0) / apiCalls.length * 100).toFixed(2) : '0',
            totalAiOperations: aiOperations?.length || 0,
            totalAiCost: aiCost?.reduce((sum, m) => sum + Number(m.value), 0).toFixed(4) || '0',
            totalErrors: errors?.length || 0,
          }
        };
        break;
      }

      case 'timeseries': {
        if (!metricName) {
          return new Response(
            JSON.stringify({ error: 'metricName required for timeseries' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Determine interval based on time range
        const intervalMinutes = timeRange === '1h' ? 1 : timeRange === '24h' ? 15 : timeRange === '7d' ? 60 : 360;

        const { data: timeseries, error } = await supabase.rpc('aggregate_metrics', {
          metric_name: metricName,
          start_time: startTime.toISOString(),
          end_time: now.toISOString(),
          interval_minutes: intervalMinutes
        });

        if (error) {
          console.error('Error fetching timeseries:', error);
          throw error;
        }

        result = {
          metricName,
          timeRange,
          data: timeseries || []
        };
        break;
      }

      case 'alerts': {
        // Check for alert conditions
        const alerts: Array<{ type: string; severity: 'info' | 'warning' | 'critical'; message: string; timestamp: string }> = [];

        // Check error rate
        const { data: recentApiCalls } = await supabase
          .from('metrics')
          .select('value')
          .eq('name', 'api.call')
          .gte('timestamp', new Date(now.getTime() - 15 * 60 * 1000).toISOString());

        const { data: recentApiErrors } = await supabase
          .from('metrics')
          .select('value')
          .eq('name', 'api.error')
          .gte('timestamp', new Date(now.getTime() - 15 * 60 * 1000).toISOString());

        const recentErrorRate = recentApiCalls?.length ? (recentApiErrors?.length || 0) / recentApiCalls.length * 100 : 0;
        
        if (recentErrorRate > 10) {
          alerts.push({
            type: 'high_error_rate',
            severity: recentErrorRate > 25 ? 'critical' : 'warning',
            message: `API error rate is ${recentErrorRate.toFixed(1)}% in the last 15 minutes`,
            timestamp: now.toISOString()
          });
        }

        // Check for slow operations
        const { data: slowOps } = await supabase
          .from('metrics')
          .select('value, tags')
          .like('name', 'performance.%')
          .gt('value', 5000)
          .gte('timestamp', new Date(now.getTime() - 60 * 60 * 1000).toISOString())
          .limit(10);

        if (slowOps && slowOps.length > 5) {
          alerts.push({
            type: 'slow_operations',
            severity: 'warning',
            message: `${slowOps.length} slow operations (>5s) detected in the last hour`,
            timestamp: now.toISOString()
          });
        }

        // Check AI cost
        const { data: hourlyAiCost } = await supabase
          .from('metrics')
          .select('value')
          .eq('name', 'ai.cost')
          .gte('timestamp', new Date(now.getTime() - 60 * 60 * 1000).toISOString());

        const totalHourlyCost = hourlyAiCost?.reduce((sum, m) => sum + Number(m.value), 0) || 0;
        
        if (totalHourlyCost > 10) {
          alerts.push({
            type: 'high_ai_cost',
            severity: totalHourlyCost > 50 ? 'critical' : 'warning',
            message: `AI cost is $${totalHourlyCost.toFixed(2)} in the last hour`,
            timestamp: now.toISOString()
          });
        }

        result = { alerts };
        break;
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    return new Response(
      JSON.stringify(result),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in metrics-dashboard:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
