import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Agent role definitions
type AgentRole = 'manager' | 'researcher' | 'analyst' | 'critic';

interface AgentTool {
  name: string;
  description: string;
  execute: (input: unknown, context: AgentContext) => Promise<unknown>;
}

interface AgentContext {
  supabase: ReturnType<typeof createClient>;
  taskId: string;
  projectId: string;
  userId: string;
  sharedWorkspace: Record<string, unknown>;
  iteration: number;
  maxIterations: number;
}

interface AgentMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface Conflict {
  field: string;
  document1: { id: string; name: string; value: string };
  document2: { id: string; name: string; value: string };
  description: string;
}

// Tool implementations
const AGENT_TOOLS: Record<string, AgentTool> = {
  search_documents: {
    name: 'search_documents',
    description: 'Search documents using semantic and keyword search',
    execute: async (input: unknown, context: AgentContext) => {
      const { query, limit = 10 } = input as { query: string; limit?: number };
      
      // Generate embedding for query
      const embeddingResponse = await fetch('https://ai.gateway.lovable.dev/v1/embeddings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('LOVABLE_API_KEY')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'text-embedding-3-small',
          input: query,
        }),
      });

      if (!embeddingResponse.ok) {
        return { error: 'Failed to generate embedding', results: [] };
      }

      const embeddingData = await embeddingResponse.json();
      const embedding = embeddingData.data?.[0]?.embedding;

      if (!embedding) {
        return { error: 'No embedding generated', results: [] };
      }

      const { data: chunks } = await (context.supabase.rpc as unknown as (
        fn: string,
        args: Record<string, unknown>
      ) => Promise<{ data: unknown[] | null }>)('hybrid_search_chunks', {
        search_query: query,
        query_embedding: embedding,
        match_threshold: 0.5,
        match_count: limit,
        filter_project_id: context.projectId,
        use_semantic: true,
        use_fulltext: true,
      }) as { data: unknown[] | null };

      return { results: chunks || [] };
    },
  },
  summarize_section: {
    name: 'summarize_section',
    description: 'Summarize a specific section or chunk of content',
    execute: async (input: unknown, _context: AgentContext) => {
      const { content, focus } = input as { content: string; focus?: string };
      
      const prompt = focus 
        ? `Summarize the following content with focus on ${focus}:\n\n${content}`
        : `Summarize the following content concisely:\n\n${content}`;

      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('LOVABLE_API_KEY')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 500,
        }),
      });

      const data = await response.json();
      return { summary: data.choices?.[0]?.message?.content || 'Unable to summarize' };
    },
  },
  extract_table: {
    name: 'extract_table',
    description: 'Extract structured data as a table from content',
    execute: async (input: unknown, _context: AgentContext) => {
      const { content, fields } = input as { content: string; fields: string[] };
      
      const prompt = `Extract the following fields from the content and return as JSON array: ${fields.join(', ')}

Content:
${content}

Return ONLY a valid JSON array of objects with the specified fields.`;

      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('LOVABLE_API_KEY')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 2000,
        }),
      });

      const data = await response.json();
      const text = data.choices?.[0]?.message?.content || '[]';
      
      try {
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        return { table: jsonMatch ? JSON.parse(jsonMatch[0]) : [] };
      } catch {
        return { table: [], raw: text };
      }
    },
  },
  verify_fact: {
    name: 'verify_fact',
    description: 'Verify a fact against source documents',
    execute: async (input: unknown, context: AgentContext) => {
      const { fact, sourceChunkIds } = input as { fact: string; sourceChunkIds?: string[] };
      
      let sourceContent = '';
      if (sourceChunkIds && sourceChunkIds.length > 0) {
        const { data: chunks } = await context.supabase
          .from('chunks')
          .select('content, document_id')
          .in('id', sourceChunkIds);
        
        sourceContent = (chunks || []).map((c: { content: string }) => c.content).join('\n\n');
      }

      const prompt = `Verify the following claim against the source content. 
      
Claim: "${fact}"

Source Content:
${sourceContent || 'No source content provided'}

Respond with:
1. VERIFIED - if the claim is supported by the source
2. CONTRADICTED - if the source contradicts the claim
3. UNVERIFIABLE - if the source doesn't contain relevant information

Also provide a brief explanation.`;

      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('LOVABLE_API_KEY')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 500,
        }),
      });

      const data = await response.json();
      const verification = data.choices?.[0]?.message?.content || 'UNVERIFIABLE';
      
      return { 
        result: verification.includes('VERIFIED') ? 'verified' : 
                verification.includes('CONTRADICTED') ? 'contradicted' : 'unverifiable',
        explanation: verification 
      };
    },
  },
  write_to_workspace: {
    name: 'write_to_workspace',
    description: 'Write intermediate findings to shared workspace',
    execute: async (input: unknown, context: AgentContext) => {
      const { key, value } = input as { key: string; value: unknown };
      context.sharedWorkspace[key] = value;
      
      await (context.supabase.from('research_tasks') as unknown as {
        update: (data: unknown) => { eq: (col: string, val: string) => Promise<unknown> };
      }).update({ shared_workspace: context.sharedWorkspace }).eq('id', context.taskId);
      
      return { success: true, key };
    },
  },
  read_from_workspace: {
    name: 'read_from_workspace',
    description: 'Read findings from shared workspace',
    execute: async (input: unknown, context: AgentContext) => {
      const { key } = input as { key?: string };
      if (key) {
        return { value: context.sharedWorkspace[key] };
      }
      return { workspace: context.sharedWorkspace };
    },
  },
};

// Agent system prompts
const AGENT_PROMPTS: Record<AgentRole, string> = {
  manager: `You are the Manager Agent responsible for orchestrating a research task.
Your job is to:
1. Break down the user's research goal into specific sub-tasks
2. Assign tasks to the appropriate worker agents (Researcher, Analyst, Critic)
3. Coordinate the flow of information between agents
4. Synthesize final results

When assigning tasks, output in this format:
ASSIGN_TASK: [agent_name] | [task_description]

When the research is complete, output:
RESEARCH_COMPLETE: [final summary]`,

  researcher: `You are the Researcher Agent specialized in finding and retrieving information.
Your capabilities:
- Use search_documents to find relevant content
- Use summarize_section to condense findings
- Write findings to workspace for other agents

Always cite your sources with document names and chunk IDs.
Focus on accuracy and completeness in your searches.`,

  analyst: `You are the Analyst Agent specialized in comparing, analyzing, and finding patterns.
Your capabilities:
- Compare data across multiple sources
- Identify trends and patterns
- Flag contradictions and conflicts
- Use extract_table for structured data

When you find conflicting information, output:
CONFLICT_FOUND: [description of conflict with both sources]

Provide detailed analysis with evidence.`,

  critic: `You are the Critic Agent specialized in fact-checking and verification.
Your capabilities:
- Use verify_fact to check claims against sources
- Identify potential hallucinations or unsupported claims
- Ensure all conclusions are grounded in source documents

For each claim you verify, provide:
- The claim
- Verification status (VERIFIED/CONTRADICTED/UNVERIFIABLE)
- Supporting evidence or contradiction`,
};

// Log agent activity
async function logAgentActivity(
  supabase: ReturnType<typeof createClient>,
  taskId: string,
  role: AgentRole,
  action: string,
  details: {
    inputSummary?: string;
    outputSummary?: string;
    toolUsed?: string;
    toolInput?: unknown;
    toolOutput?: unknown;
    reasoning?: string;
    tokensUsed?: number;
    durationMs?: number;
    iteration: number;
    status?: string;
    error?: string;
  }
) {
  await (supabase.from('agent_activity_logs') as unknown as {
    insert: (data: unknown) => Promise<unknown>;
  }).insert({
    task_id: taskId,
    agent_role: role,
    action,
    input_summary: details.inputSummary,
    output_summary: details.outputSummary,
    tool_used: details.toolUsed,
    tool_input: details.toolInput,
    tool_output: details.toolOutput,
    reasoning: details.reasoning,
    tokens_used: details.tokensUsed || 0,
    duration_ms: details.durationMs,
    iteration_number: details.iteration,
    status: details.status || 'completed',
    error_message: details.error,
  });
}

// Execute agent with tools
async function executeAgent(
  role: AgentRole,
  messages: AgentMessage[],
  context: AgentContext,
  encoder: TextEncoder,
  controller: ReadableStreamDefaultController
): Promise<{ response: string; tokensUsed: number; conflicts: Conflict[] }> {
  const startTime = Date.now();
  const conflicts: Conflict[] = [];
  
  // Build tool definitions for AI
  const toolDefinitions = Object.values(AGENT_TOOLS).map(tool => ({
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: { type: 'object', properties: {} },
    },
  }));

  const systemMessage = AGENT_PROMPTS[role];
  const fullMessages = [
    { role: 'system', content: systemMessage },
    ...messages,
  ];

  // Stream thinking to client
  const sendEvent = (event: string, data: unknown) => {
    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ event, data })}\n\n`));
  };

  sendEvent('agent_thinking', { role, action: 'processing' });

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('LOVABLE_API_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-pro',
      messages: fullMessages,
      tools: toolDefinitions,
      max_tokens: 4000,
    }),
  });

  const data = await response.json();
  const choice = data.choices?.[0];
  const tokensUsed = data.usage?.total_tokens || 0;
  let agentResponse = choice?.message?.content || '';

  // Handle tool calls
  const toolCalls = choice?.message?.tool_calls || [];
  for (const toolCall of toolCalls) {
    const toolName = toolCall.function?.name;
    const tool = AGENT_TOOLS[toolName];
    
    if (tool) {
      sendEvent('agent_tool_use', { role, tool: toolName });
      
      let toolInput = {};
      try {
        toolInput = JSON.parse(toolCall.function?.arguments || '{}');
      } catch {
        // ignore
      }

      const toolOutput = await tool.execute(toolInput, context);
      
      await logAgentActivity(context.supabase, context.taskId, role, `tool:${toolName}`, {
        toolUsed: toolName,
        toolInput,
        toolOutput,
        iteration: context.iteration,
        durationMs: Date.now() - startTime,
      });

      // Add tool result to response
      agentResponse += `\n\n[Tool: ${toolName}] Result: ${JSON.stringify(toolOutput).substring(0, 500)}`;
    }
  }

  // Check for conflicts in analyst output
  if (role === 'analyst' && agentResponse.includes('CONFLICT_FOUND:')) {
    const conflictMatches = agentResponse.matchAll(/CONFLICT_FOUND:\s*(.+?)(?=\n\n|CONFLICT_FOUND:|$)/gs);
    for (const match of conflictMatches) {
      conflicts.push({
        field: 'detected_conflict',
        document1: { id: '', name: 'Source 1', value: match[1] },
        document2: { id: '', name: 'Source 2', value: match[1] },
        description: match[1],
      });
    }
  }

  const durationMs = Date.now() - startTime;
  
  await logAgentActivity(context.supabase, context.taskId, role, 'response', {
    inputSummary: messages[messages.length - 1]?.content?.substring(0, 200),
    outputSummary: agentResponse.substring(0, 500),
    reasoning: agentResponse,
    tokensUsed,
    durationMs,
    iteration: context.iteration,
  });

  sendEvent('agent_complete', { role, durationMs });

  return { response: agentResponse, tokensUsed, conflicts };
}

// Main orchestration loop
async function runOrchestration(
  supabase: ReturnType<typeof createClient>,
  task: {
    id: string;
    project_id: string;
    user_id: string;
    goal: string;
    source_document_ids: string[];
    max_iterations: number;
    shared_workspace: Record<string, unknown>;
  },
  encoder: TextEncoder,
  controller: ReadableStreamDefaultController
) {
  const context: AgentContext = {
    supabase,
    taskId: task.id,
    projectId: task.project_id,
    userId: task.user_id,
    sharedWorkspace: task.shared_workspace || {},
    iteration: 0,
    maxIterations: task.max_iterations || 20,
  };

  let totalTokens = 0;
  const allConflicts: Conflict[] = [];
  const phases = ['planning', 'researching', 'analyzing', 'verifying', 'synthesizing'];

  const sendEvent = (event: string, data: unknown) => {
    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ event, data })}\n\n`));
  };

  // Get document context
  let documentContext = '';
  if (task.source_document_ids?.length > 0) {
    const { data: docs } = await supabase
      .from('documents')
      .select('id, name, summary')
      .in('id', task.source_document_ids);
    
    documentContext = (docs || [])
      .map((d: { name: string; summary: string }) => `- ${d.name}: ${d.summary || 'No summary'}`)
      .join('\n');
  }

  // Helper for updates
  const updateTask = async (data: Record<string, unknown>) => {
    await (supabase.from('research_tasks') as unknown as {
      update: (data: unknown) => { eq: (col: string, val: string) => Promise<unknown> };
    }).update(data).eq('id', task.id);
  };

  // Phase 1: Manager breaks down task
  sendEvent('phase_change', { phase: 'planning', progress: 10 });
  await updateTask({ 
    status: 'planning', 
    current_phase: 'planning',
    progress_percent: 10 
  });

  const managerResult = await executeAgent(
    'manager',
    [{
      role: 'user',
      content: `Research Goal: ${task.goal}

Available Documents:
${documentContext || 'All project documents available via search'}

Please break this down into specific research sub-tasks and assign them to the appropriate agents.`,
    }],
    context,
    encoder,
    controller
  );
  totalTokens += managerResult.tokensUsed;

  // Phase 2: Researcher gathers information
  sendEvent('phase_change', { phase: 'researching', progress: 30 });
  await updateTask({ 
    status: 'researching',
    current_phase: 'researching', 
    progress_percent: 30 
  });

  context.iteration = 1;
  const researcherResult = await executeAgent(
    'researcher',
    [{
      role: 'user',
      content: `Manager's instructions: ${managerResult.response}

Research goal: ${task.goal}

Use search_documents to find relevant information and write your findings to the workspace.`,
    }],
    context,
    encoder,
    controller
  );
  totalTokens += researcherResult.tokensUsed;

  // Phase 3: Analyst processes findings
  sendEvent('phase_change', { phase: 'analyzing', progress: 50 });
  await updateTask({ 
    status: 'analyzing',
    current_phase: 'analyzing', 
    progress_percent: 50 
  });

  context.iteration = 2;
  const analystResult = await executeAgent(
    'analyst',
    [{
      role: 'user',
      content: `Researcher's findings: ${researcherResult.response}

Analyze these findings. Look for:
1. Patterns and trends
2. Contradictions or conflicts between sources
3. Key insights relevant to the goal: ${task.goal}

If you find conflicting information, use CONFLICT_FOUND: format.`,
    }],
    context,
    encoder,
    controller
  );
  totalTokens += analystResult.tokensUsed;
  allConflicts.push(...analystResult.conflicts);

  // Phase 4: Critic verifies key claims
  sendEvent('phase_change', { phase: 'verifying', progress: 70 });
  await updateTask({ 
    status: 'verifying',
    current_phase: 'verifying', 
    progress_percent: 70 
  });

  context.iteration = 3;
  const criticResult = await executeAgent(
    'critic',
    [{
      role: 'user',
      content: `Analysis to verify: ${analystResult.response}

Verify the key claims and conclusions. Use verify_fact tool for important assertions.
Ensure all conclusions are grounded in source documents.`,
    }],
    context,
    encoder,
    controller
  );
  totalTokens += criticResult.tokensUsed;

  // Phase 5: Synthesize final report
  sendEvent('phase_change', { phase: 'synthesizing', progress: 90 });
  await updateTask({ 
    status: 'synthesizing',
    current_phase: 'synthesizing', 
    progress_percent: 90 
  });

  context.iteration = 4;
  const synthesisMessages: AgentMessage[] = [{
    role: 'user',
    content: `Create a final research report based on:

Research Goal: ${task.goal}

Researcher Findings: ${researcherResult.response.substring(0, 2000)}

Analysis: ${analystResult.response.substring(0, 2000)}

Verification: ${criticResult.response.substring(0, 1000)}

${allConflicts.length > 0 ? `\n\nCONFLICTS DETECTED:\n${allConflicts.map(c => c.description).join('\n')}` : ''}

Generate a comprehensive, well-structured report in Markdown format.`,
  }];

  const synthesisResult = await executeAgent(
    'manager',
    synthesisMessages,
    context,
    encoder,
    controller
  );
  totalTokens += synthesisResult.tokensUsed;

  // Save final results
  const estimatedCost = (totalTokens / 1000) * 0.001; // Rough estimate
  
  await updateTask({
    status: 'completed',
    current_phase: 'completed',
    progress_percent: 100,
    final_result: {
      manager_plan: managerResult.response,
      research_findings: researcherResult.response,
      analysis: analystResult.response,
      verification: criticResult.response,
    },
    final_report_markdown: synthesisResult.response,
    conflicts_found: allConflicts,
    total_iterations: context.iteration,
    total_tokens_used: totalTokens,
    total_cost_usd: estimatedCost,
    completed_at: new Date().toISOString(),
  });

  sendEvent('phase_change', { phase: 'completed', progress: 100 });
  sendEvent('task_complete', { 
    taskId: task.id,
    conflicts: allConflicts.length,
    tokens: totalTokens,
  });

  // Send notification
  await (supabase.from('notifications') as unknown as {
    insert: (data: unknown) => Promise<unknown>;
  }).insert({
    user_id: task.user_id,
    type: 'processing_complete',
    title: 'Research Complete',
    message: `Your research task "${task.goal.substring(0, 50)}..." has been completed.`,
    data: { taskId: task.id, conflicts: allConflicts.length },
  });

  return synthesisResult.response;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify user
    const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
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

    const { action, taskId, projectId, title, goal, sourceDocumentIds, intervention } = await req.json();

    // Handle different actions
    if (action === 'create') {
      // Create new research task
      const { data: task, error: createError } = await supabase
        .from('research_tasks')
        .insert({
          project_id: projectId,
          user_id: user.id,
          title,
          goal,
          source_document_ids: sourceDocumentIds || [],
          status: 'pending',
        })
        .select()
        .single();

      if (createError) {
        return new Response(JSON.stringify({ error: createError.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ success: true, task }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'start') {
      // Get task
      const { data: task, error: fetchError } = await supabase
        .from('research_tasks')
        .select('*')
        .eq('id', taskId)
        .eq('user_id', user.id)
        .single();

      if (fetchError || !task) {
        return new Response(JSON.stringify({ error: 'Task not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Update status
      await supabase.from('research_tasks').update({
        status: 'planning',
        started_at: new Date().toISOString(),
      }).eq('id', taskId);

      // Stream response
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          try {
            await runOrchestration(supabase as unknown as ReturnType<typeof createClient>, task, encoder, controller);
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error('Orchestration error:', errorMessage);
            
            await (supabase.from('research_tasks') as unknown as {
              update: (data: unknown) => { eq: (col: string, val: string) => Promise<unknown> };
            }).update({
              status: 'failed',
              error_message: errorMessage,
            }).eq('id', taskId);

            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
              event: 'error', 
              data: { message: errorMessage } 
            })}\n\n`));
          } finally {
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            controller.close();
          }
        },
      });

      return new Response(stream, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    if (action === 'intervene') {
      // Save user intervention
      const { error: interventionError } = await supabase
        .from('user_interventions')
        .insert({
          task_id: taskId,
          user_id: user.id,
          intervention_type: intervention.type,
          message: intervention.message,
        });

      if (interventionError) {
        return new Response(JSON.stringify({ error: interventionError.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Handle cancel
      if (intervention.type === 'cancel') {
        await supabase.from('research_tasks').update({
          status: 'cancelled',
        }).eq('id', taskId);
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'get_logs') {
      const { data: logs } = await supabase
        .from('agent_activity_logs')
        .select('*')
        .eq('task_id', taskId)
        .order('created_at', { ascending: true });

      return new Response(JSON.stringify({ logs: logs || [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Task orchestrator error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
