import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { rateLimitMiddleware } from "../_shared/rate-limiter.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TrainingConfig {
  quantization: {
    enabled: boolean;
    bits: 4 | 8;
    type: 'nf4' | 'fp4';
    doubleQuant: boolean;
  };
  lora: {
    enabled: boolean;
    rank: number;
    alpha: number;
    dropout: number;
    targetModules: string[];
  };
  checkpoint: {
    saveSteps: number;
    maxCheckpoints: number;
    autoResume: boolean;
  };
  training: {
    epochs: number;
    batchSize: number;
    learningRate: number;
    warmupSteps: number;
    maxSteps: number | null;
  };
  validation: {
    splitRatio: number;
    evalSteps: number;
    earlyStoppingPatience: number;
    earlyStoppingThreshold: number;
  };
}

interface PromptTemplate {
  system: string;
  instruction: string;
  input: string;
  response: string;
  specialTokens: {
    bos: string;
    eos: string;
    pad: string;
    instructionStart: string;
    instructionEnd: string;
    responseStart: string;
  };
}

// Multilingual Prompt Templates for 7 supported languages
const PROMPT_TEMPLATES: Record<string, PromptTemplate> = {
  en: {
    system: "You are a helpful AI assistant.",
    instruction: "### Instruction:\n{instruction}",
    input: "### Input:\n{input}",
    response: "### Response:\n{response}",
    specialTokens: { bos: "<s>", eos: "</s>", pad: "<pad>", instructionStart: "[INST]", instructionEnd: "[/INST]", responseStart: "" }
  },
  ar: {
    system: "أنت مساعد ذكاء اصطناعي مفيد.",
    instruction: "### التعليمات:\n{instruction}",
    input: "### المدخلات:\n{input}",
    response: "### الإجابة:\n{response}",
    specialTokens: { bos: "<s>", eos: "</s>", pad: "<pad>", instructionStart: "[تعليمات]", instructionEnd: "[/تعليمات]", responseStart: "" }
  },
  fr: {
    system: "Vous êtes un assistant IA utile.",
    instruction: "### Instruction:\n{instruction}",
    input: "### Entrée:\n{input}",
    response: "### Réponse:\n{response}",
    specialTokens: { bos: "<s>", eos: "</s>", pad: "<pad>", instructionStart: "[INST]", instructionEnd: "[/INST]", responseStart: "" }
  },
  de: {
    system: "Sie sind ein hilfreicher KI-Assistent.",
    instruction: "### Anweisung:\n{instruction}",
    input: "### Eingabe:\n{input}",
    response: "### Antwort:\n{response}",
    specialTokens: { bos: "<s>", eos: "</s>", pad: "<pad>", instructionStart: "[INST]", instructionEnd: "[/INST]", responseStart: "" }
  },
  es: {
    system: "Eres un asistente de IA útil.",
    instruction: "### Instrucción:\n{instruction}",
    input: "### Entrada:\n{input}",
    response: "### Respuesta:\n{response}",
    specialTokens: { bos: "<s>", eos: "</s>", pad: "<pad>", instructionStart: "[INST]", instructionEnd: "[/INST]", responseStart: "" }
  },
  zh: {
    system: "你是一个有用的AI助手。",
    instruction: "### 指令:\n{instruction}",
    input: "### 输入:\n{input}",
    response: "### 回答:\n{response}",
    specialTokens: { bos: "<s>", eos: "</s>", pad: "<pad>", instructionStart: "[指令]", instructionEnd: "[/指令]", responseStart: "" }
  },
  ja: {
    system: "あなたは役立つAIアシスタントです。",
    instruction: "### 指示:\n{instruction}",
    input: "### 入力:\n{input}",
    response: "### 応答:\n{response}",
    specialTokens: { bos: "<s>", eos: "</s>", pad: "<pad>", instructionStart: "[指示]", instructionEnd: "[/指示]", responseStart: "" }
  },
  hi: {
    system: "आप एक उपयोगी AI सहायक हैं।",
    instruction: "### निर्देश:\n{instruction}",
    input: "### इनपुट:\n{input}",
    response: "### प्रतिक्रिया:\n{response}",
    specialTokens: { bos: "<s>", eos: "</s>", pad: "<pad>", instructionStart: "[निर्देश]", instructionEnd: "[/निर्देश]", responseStart: "" }
  }
};

// Default configuration with best practices
const DEFAULT_CONFIG: TrainingConfig = {
  quantization: {
    enabled: true,
    bits: 4,
    type: 'nf4',
    doubleQuant: true
  },
  lora: {
    enabled: true,
    rank: 16,
    alpha: 32,
    dropout: 0.05,
    targetModules: ['q_proj', 'v_proj', 'k_proj', 'o_proj']
  },
  checkpoint: {
    saveSteps: 100,
    maxCheckpoints: 5,
    autoResume: true
  },
  training: {
    epochs: 3,
    batchSize: 4,
    learningRate: 2e-4,
    warmupSteps: 100,
    maxSteps: null
  },
  validation: {
    splitRatio: 0.15,
    evalSteps: 50,
    earlyStoppingPatience: 3,
    earlyStoppingThreshold: 0.01
  }
};

function getPromptTemplate(language: string): PromptTemplate {
  return PROMPT_TEMPLATES[language] || PROMPT_TEMPLATES.en;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    let userId: string | null = null;
    
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id || null;
    }

    const body = await req.json();
    const { action, jobId, projectId, config, language } = body;

    console.log(`[training-service] Action: ${action}, JobId: ${jobId}, ProjectId: ${projectId}`);

    switch (action) {
      case 'create':
        return await createTrainingJob(supabase, projectId, config, userId);
      case 'start':
        return await startTraining(supabase, jobId, userId);
      case 'pause':
        return await pauseTraining(supabase, jobId, userId);
      case 'resume':
        return await resumeTraining(supabase, jobId, userId);
      case 'status':
        return await getTrainingStatus(supabase, jobId, userId);
      case 'validate-data':
        return await validateDataset(supabase, projectId, userId);
      case 'save-checkpoint':
        return await saveCheckpoint(supabase, jobId, body.step, body.metrics, userId);
      case 'get-checkpoints':
        return await getCheckpoints(supabase, jobId, userId);
      case 'get-prompt-template':
        return new Response(JSON.stringify({ template: getPromptTemplate(language || 'en') }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      default:
        return new Response(JSON.stringify({ error: 'Invalid action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
  } catch (error) {
    console.error('[training-service] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function createTrainingJob(supabase: any, projectId: string, config: Partial<TrainingConfig>, userId: string | null) {
  if (!userId) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  // Merge with default config
  const mergedConfig = {
    ...DEFAULT_CONFIG,
    ...config,
    quantization: { ...DEFAULT_CONFIG.quantization, ...config?.quantization },
    lora: { ...DEFAULT_CONFIG.lora, ...config?.lora },
    checkpoint: { ...DEFAULT_CONFIG.checkpoint, ...config?.checkpoint },
    training: { ...DEFAULT_CONFIG.training, ...config?.training },
    validation: { ...DEFAULT_CONFIG.validation, ...config?.validation }
  };

  // Get the latest dataset for this project
  const { data: datasets, error: datasetError } = await supabase
    .from('training_datasets')
    .select('id')
    .eq('project_id', projectId)
    .eq('status', 'ready')
    .order('created_at', { ascending: false })
    .limit(1);

  if (datasetError || !datasets?.length) {
    return new Response(JSON.stringify({ error: 'No ready dataset found for this project' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const { data, error } = await supabase
    .from('training_jobs')
    .insert({
      project_id: projectId,
      user_id: userId,
      dataset_id: datasets[0].id,
      status: 'pending',
      base_model: 'gpt-4o-mini-2024-07-18',
      training_config: mergedConfig,
      progress_percent: 0
    })
    .select()
    .single();

  if (error) {
    console.error('[training-service] Create job error:', error);
    throw error;
  }

  console.log(`[training-service] Created job: ${data.id}`);

  return new Response(JSON.stringify({ job: data }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function validateDataset(supabase: any, projectId: string, userId: string | null) {
  if (!userId) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  // Fetch project documents
  const { data: documents } = await supabase
    .from('documents')
    .select('*')
    .eq('project_id', projectId)
    .eq('status', 'ready')
    .is('deleted_at', null);

  const qualityChecks = {
    totalSamples: documents?.length || 0,
    issues: [] as string[],
    qualityScore: 1.0,
    recommendations: [] as string[]
  };

  // Check minimum samples
  if (qualityChecks.totalSamples < 10) {
    qualityChecks.issues.push('Low sample count (< 10)');
    qualityChecks.qualityScore -= 0.3;
    qualityChecks.recommendations.push('Add more training examples for better results (minimum 10 recommended)');
  } else if (qualityChecks.totalSamples < 50) {
    qualityChecks.issues.push('Limited sample count (< 50)');
    qualityChecks.qualityScore -= 0.1;
    qualityChecks.recommendations.push('Consider adding more examples for improved model quality');
  }

  // Check for documents with extracted text
  const docsWithText = documents?.filter((doc: any) => doc.extracted_text?.length > 50) || [];
  if (docsWithText.length < qualityChecks.totalSamples * 0.8) {
    qualityChecks.issues.push(`${qualityChecks.totalSamples - docsWithText.length} documents have insufficient text content`);
    qualityChecks.qualityScore -= 0.15;
    qualityChecks.recommendations.push('Ensure documents have been processed and contain extractable text');
  }

  // Check content length distribution
  const lengths = documents?.map((d: any) => d.extracted_text?.length || 0) || [];
  const avgLength = lengths.length > 0 ? lengths.reduce((a: number, b: number) => a + b, 0) / lengths.length : 0;

  if (avgLength < 100) {
    qualityChecks.issues.push('Average content length too short');
    qualityChecks.qualityScore -= 0.15;
    qualityChecks.recommendations.push('Ensure documents have sufficient content for training');
  }

  // Suggest train/val/test split
  const trainRatio = 0.8;
  const valRatio = 0.15;
  const testRatio = 0.05;

  qualityChecks.qualityScore = Math.max(0, Math.min(1, qualityChecks.qualityScore));

  console.log(`[training-service] Validation complete: ${qualityChecks.totalSamples} samples, score: ${qualityChecks.qualityScore}`);

  return new Response(JSON.stringify({
    ...qualityChecks,
    averageContentLength: Math.round(avgLength),
    suggestedSplit: {
      train: Math.floor(qualityChecks.totalSamples * trainRatio),
      validation: Math.floor(qualityChecks.totalSamples * valRatio),
      test: Math.floor(qualityChecks.totalSamples * testRatio)
    }
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function startTraining(supabase: any, jobId: string, userId: string | null) {
  if (!userId) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const { error } = await supabase
    .from('training_jobs')
    .update({ 
      status: 'training', 
      started_at: new Date().toISOString(),
      updated_at: new Date().toISOString() 
    })
    .eq('id', jobId)
    .eq('user_id', userId);

  if (error) throw error;

  console.log(`[training-service] Started training job: ${jobId}`);

  return new Response(JSON.stringify({ status: 'started', jobId }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function pauseTraining(supabase: any, jobId: string, userId: string | null) {
  if (!userId) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  // Get current job state
  const { data: job, error: fetchError } = await supabase
    .from('training_jobs')
    .select('current_checkpoint_step, progress_percent')
    .eq('id', jobId)
    .eq('user_id', userId)
    .single();

  if (fetchError) throw fetchError;

  const currentStep = job?.current_checkpoint_step || 0;

  // Save checkpoint before pausing
  await supabase
    .from('training_checkpoints')
    .insert({
      job_id: jobId,
      step: currentStep,
      file_path: `checkpoints/${jobId}/step_${currentStep}`,
      metadata: { paused_at: new Date().toISOString() }
    });

  // Update job status
  await supabase
    .from('training_jobs')
    .update({ 
      status: 'pending', // Using 'pending' as paused state
      current_step: 'Paused',
      updated_at: new Date().toISOString()
    })
    .eq('id', jobId);

  console.log(`[training-service] Paused job: ${jobId} at step ${currentStep}`);

  return new Response(JSON.stringify({ status: 'paused', checkpoint: currentStep }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function resumeTraining(supabase: any, jobId: string, userId: string | null) {
  if (!userId) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  // Get latest checkpoint
  const { data: checkpoint } = await supabase
    .from('training_checkpoints')
    .select('*')
    .eq('job_id', jobId)
    .order('step', { ascending: false })
    .limit(1)
    .single();

  const resumeStep = checkpoint?.step || 0;

  await supabase
    .from('training_jobs')
    .update({ 
      status: 'training',
      current_step: `Resuming from step ${resumeStep}`,
      current_checkpoint_step: resumeStep,
      updated_at: new Date().toISOString()
    })
    .eq('id', jobId)
    .eq('user_id', userId);

  console.log(`[training-service] Resumed job: ${jobId} from step ${resumeStep}`);

  return new Response(JSON.stringify({ 
    status: 'resuming', 
    fromStep: resumeStep 
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function getTrainingStatus(supabase: any, jobId: string, userId: string | null) {
  const { data: job, error } = await supabase
    .from('training_jobs')
    .select(`
      *,
      checkpoints:training_checkpoints(*)
    `)
    .eq('id', jobId)
    .single();

  if (error) throw error;

  return new Response(JSON.stringify({ job }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function saveCheckpoint(supabase: any, jobId: string, step: number, metrics: any, userId: string | null) {
  if (!userId) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const { data, error } = await supabase
    .from('training_checkpoints')
    .insert({
      job_id: jobId,
      step,
      loss: metrics?.loss,
      val_loss: metrics?.valLoss,
      accuracy: metrics?.accuracy,
      file_path: `checkpoints/${jobId}/step_${step}`,
      metadata: metrics
    })
    .select()
    .single();

  if (error) throw error;

  // Update job's current checkpoint step
  await supabase
    .from('training_jobs')
    .update({ 
      current_checkpoint_step: step,
      updated_at: new Date().toISOString()
    })
    .eq('id', jobId);

  // Clean up old checkpoints (keep only maxCheckpoints)
  const { data: job } = await supabase
    .from('training_jobs')
    .select('training_config')
    .eq('id', jobId)
    .single();

  const maxCheckpoints = job?.training_config?.checkpoint?.maxCheckpoints || 5;

  const { data: checkpoints } = await supabase
    .from('training_checkpoints')
    .select('id')
    .eq('job_id', jobId)
    .order('step', { ascending: false });

  if (checkpoints && checkpoints.length > maxCheckpoints) {
    const toDelete = checkpoints.slice(maxCheckpoints).map((c: any) => c.id);
    await supabase
      .from('training_checkpoints')
      .delete()
      .in('id', toDelete);
  }

  console.log(`[training-service] Saved checkpoint for job ${jobId} at step ${step}`);

  return new Response(JSON.stringify({ checkpoint: data }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function getCheckpoints(supabase: any, jobId: string, userId: string | null) {
  const { data, error } = await supabase
    .from('training_checkpoints')
    .select('*')
    .eq('job_id', jobId)
    .order('step', { ascending: false });

  if (error) throw error;

  return new Response(JSON.stringify({ checkpoints: data }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}
