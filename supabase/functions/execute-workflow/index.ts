import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WorkflowAction {
  type: string;
  config: Record<string, unknown>;
}

interface WorkflowCondition {
  field: string;
  operator: string;
  value: unknown;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    
    const authHeader = req.headers.get('Authorization');
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader || '' } }
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }
    // Rate limiting
    const rateLimitResponse = await rateLimitMiddleware(supabase, user.id, 'default', corsHeaders);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }
), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { workflowId, eventData, manual, documentId, parentExecutionId } = await req.json();

    if (!workflowId) {
      return new Response(JSON.stringify({ error: 'Missing workflowId' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get workflow
    const { data: workflow, error: workflowError } = await supabase
      .from('workflow_rules')
      .select('*')
      .eq('id', workflowId)
      .single();

    if (workflowError || !workflow) {
      return new Response(JSON.stringify({ error: 'Workflow not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check circuit breaker
    const { data: circuitCheck } = await supabase.rpc('check_workflow_circuit_breaker', {
      p_workflow_id: workflowId,
      p_execution_id: parentExecutionId || null,
    });

    if (!circuitCheck?.allowed) {
      console.log('Circuit breaker triggered:', circuitCheck?.reason);
      return new Response(JSON.stringify({ 
        success: false, 
        error: circuitCheck?.reason || 'Circuit breaker triggered',
        skipped: true,
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create execution record
    const { data: execution, error: execError } = await supabase
      .from('workflow_executions')
      .insert({
        workflow_rule_id: workflowId,
        project_id: workflow.project_id,
        user_id: user.id,
        trigger_event: eventData || {},
        document_id: documentId || null,
        status: 'running',
        started_at: new Date().toISOString(),
        parent_execution_id: parentExecutionId || null,
      })
      .select()
      .single();

    if (execError) {
      console.error('Failed to create execution:', execError);
      throw execError;
    }

    // Evaluate conditions
    const conditions: WorkflowCondition[] = Array.isArray(workflow.conditions) ? workflow.conditions : [];
    let allConditionsMet = true;

    for (const condition of conditions) {
      const value = eventData?.[condition.field];
      let met = false;

      switch (condition.operator) {
        case 'equals':
          met = value === condition.value;
          break;
        case 'not_equals':
          met = value !== condition.value;
          break;
        case 'contains':
          met = String(value).toLowerCase().includes(String(condition.value).toLowerCase());
          break;
        case 'greater_than':
          met = Number(value) > Number(condition.value);
          break;
        case 'less_than':
          met = Number(value) < Number(condition.value);
          break;
        case 'exists':
          met = value !== undefined && value !== null;
          break;
        case 'not_exists':
          met = value === undefined || value === null;
          break;
        case 'in':
          met = Array.isArray(condition.value) && condition.value.includes(value);
          break;
        default:
          console.log('Unknown operator:', condition.operator);
      }

      if (!met) {
        allConditionsMet = false;
        break;
      }
    }

    if (!allConditionsMet) {
      // Update execution as skipped
      await supabase
        .from('workflow_executions')
        .update({
          status: 'skipped',
          completed_at: new Date().toISOString(),
          duration_ms: Date.now() - startTime,
        })
        .eq('id', execution.id);

      return new Response(JSON.stringify({ 
        success: true, 
        executionId: execution.id,
        skipped: true,
        reason: 'Conditions not met',
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Execute actions
    const actions: WorkflowAction[] = Array.isArray(workflow.actions) ? workflow.actions : [];
    const actionsExecuted: Record<string, unknown>[] = [];
    let hasError = false;
    let errorMessage = '';

    for (const action of actions) {
      const actionStartTime = Date.now();
      
      // Create action log
      const { data: actionLog } = await supabase
        .from('workflow_action_logs')
        .insert({
          execution_id: execution.id,
          action_type: action.type,
          action_config: action.config,
          status: 'running',
          input_data: eventData,
          started_at: new Date().toISOString(),
        })
        .select()
        .single();

      try {
        const result = await executeAction(supabase, action, eventData, documentId, workflow.project_id, user.id, lovableApiKey);
        
        // Update action log as completed
        await supabase
          .from('workflow_action_logs')
          .update({
            status: 'completed',
            output_data: result,
            completed_at: new Date().toISOString(),
            duration_ms: Date.now() - actionStartTime,
          })
          .eq('id', actionLog?.id);

        actionsExecuted.push({
          type: action.type,
          success: true,
          result,
          duration_ms: Date.now() - actionStartTime,
        });

      } catch (err: unknown) {
        const errMessage = err instanceof Error ? err.message : String(err);
        hasError = true;
        errorMessage = errMessage;

        // Update action log as failed
        await supabase
          .from('workflow_action_logs')
          .update({
            status: 'failed',
            error_message: errMessage,
            completed_at: new Date().toISOString(),
            duration_ms: Date.now() - actionStartTime,
          })
          .eq('id', actionLog?.id);

        actionsExecuted.push({
          type: action.type,
          success: false,
          error: errMessage,
        });

        // Stop on first error (could be configurable)
        break;
      }
    }

    // Update execution record
    await supabase
      .from('workflow_executions')
      .update({
        status: hasError ? 'failed' : 'completed',
        completed_at: new Date().toISOString(),
        duration_ms: Date.now() - startTime,
        actions_executed: actionsExecuted,
        error_message: hasError ? errorMessage : null,
      })
      .eq('id', execution.id);

    // Update workflow stats
    await supabase
      .from('workflow_rules')
      .update({
        last_triggered_at: new Date().toISOString(),
        execution_count: (workflow.execution_count || 0) + 1,
      })
      .eq('id', workflowId);

    return new Response(JSON.stringify({
      success: !hasError,
      executionId: execution.id,
      actionsExecuted: actionsExecuted.length,
      duration_ms: Date.now() - startTime,
      error: hasError ? errorMessage : undefined,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Execute workflow error:', message, error);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function executeAction(
  supabase: any,
  action: WorkflowAction,
  eventData: Record<string, unknown>,
  documentId: string | null,
  projectId: string,
  userId: string,
  lovableApiKey: string | undefined
): Promise<Record<string, unknown>> {
  const { type, config } = action;

  switch (type) {
    case 'add_tag': {
      if (!documentId) throw new Error('No document to tag');
      const tag = String(config.tag || config.tag_from);
      const { data: doc } = await supabase
        .from('documents')
        .select('enriched_metadata')
        .eq('id', documentId)
        .single();
      
      const metadata = (doc as any)?.enriched_metadata || {};
      const tags = Array.isArray(metadata.tags) ? metadata.tags : [];
      if (!tags.includes(tag)) tags.push(tag);
      
      await supabase
        .from('documents')
        .update({ enriched_metadata: { ...metadata, tags } } as any)
        .eq('id', documentId);
      
      return { tag_added: tag };
    }

    case 'create_task': {
      const title = interpolateTemplate(String(config.title || 'New Task'), eventData);
      const { data: task, error } = await supabase
        .from('project_tasks')
        .insert({
          project_id: projectId,
          user_id: userId,
          document_id: documentId,
          title,
          description: config.description ? interpolateTemplate(String(config.description), eventData) : null,
          priority: config.priority || 'medium',
          status: 'pending',
          due_date: config.due_date || null,
          tags: [],
          metadata: { created_by_workflow: true },
        } as any)
        .select()
        .single();
      
      if (error) throw error;
      return { task_created: (task as any)?.id };
    }

    case 'generate_summary': {
      if (!documentId || !lovableApiKey) {
        throw new Error('Cannot generate summary: missing document or API key');
      }
      
      const { data: doc } = await supabase
        .from('documents')
        .select('extracted_text, name')
        .eq('id', documentId)
        .single();
      
      const docData = doc as any;
      if (!docData?.extracted_text) throw new Error('No text to summarize');
      
      // ✅ PROTECTED: Use unified AI executor
      const { executeAIRequest } = await import('../_shared/unified-ai-executor.ts');
      const aiResult = await executeAIRequest({
        userId: userId || 'workflow',
        projectId: projectId || 'workflow',
        operation: 'summarization',
        userInput: `Summarize this document:\n\n${docData.extracted_text.slice(0, 8000)}`,
        systemPrompt: 'You are a document summarizer. Provide a concise summary.',
        model: 'google/gemini-2.5-flash',
        temperature: 0.3,
        maxTokens: 1000,
      });
      
      if (aiResult.blocked) throw new Error(`Summary blocked: ${aiResult.reason}`);
      if (!aiResult.success) throw new Error('Failed to generate summary');
      
      const summary = aiResult.response || '';
      
      await supabase
        .from('documents')
        .update({ summary } as Record<string, unknown>)
        .eq('id', documentId);
      
      return { summary_generated: true, length: summary.length, cost: aiResult.cost };
    }

    case 'send_email': {
      // This would integrate with an email service
      // For now, log the intent
      console.log('Would send email:', {
        to: config.to,
        subject: interpolateTemplate(String(config.subject || ''), eventData),
      });
      return { email_queued: true, to: config.to };
    }

    case 'send_slack': {
      // This would integrate with Slack API
      // For now, log the intent
      const message = interpolateTemplate(String(config.message || ''), eventData);
      console.log('Would send Slack message:', {
        channel: config.channel,
        message,
      });
      return { slack_queued: true, channel: config.channel };
    }

    case 'call_webhook': {
      const url = String(config.url);
      if (!url) throw new Error('No webhook URL configured');
      
      const method = String(config.method || 'POST');
      const body = config.include_document 
        ? { ...eventData, documentId }
        : eventData;
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: method !== 'GET' ? JSON.stringify(body) : undefined,
      });
      
      return { 
        webhook_called: true, 
        status: response.status,
        ok: response.ok,
      };
    }

    default:
      console.log('Unknown action type:', type);
      return { skipped: true, reason: `Unknown action type: ${type}` };
  }
}

function interpolateTemplate(template: string, data: Record<string, unknown>): string {
  return template.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (match, path) => {
    const keys = path.split('.');
    let value: unknown = data;
    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = (value as Record<string, unknown>)[key];
      } else {
        return match; // Keep original if path not found
      }
    }
    return String(value ?? match);
  });
}
