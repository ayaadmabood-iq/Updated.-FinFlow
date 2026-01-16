import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { rateLimitMiddleware } from "../_shared/rate-limiter.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  checkIdempotency,
  createIdempotencyKey,
  storeIdempotencyResult,
  markIdempotencyFailed,
  getIdempotencyKey,
  isValidIdempotencyKey,
} from '../_shared/idempotency.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface StartTrainingRequest {
  datasetId: string;
  baseModel: string;
  apiKey: string;
  trainingConfig?: {
    nEpochs?: number;
    batchSize?: number;
    learningRateMultiplier?: number;
  };
  autoStarted?: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getUser(token);
    
    if (claimsError || !claimsData?.user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = claimsData.user.id;

    // Check for idempotency
    const idempotencyKey = getIdempotencyKey(req);

    if (idempotencyKey && isValidIdempotencyKey(idempotencyKey)) {
      const { isIdempotent, cachedResponse } = await checkIdempotency(
        supabase,
        idempotencyKey,
        userId
      );

      if (isIdempotent && cachedResponse) {
        console.log('Returning cached training job response (idempotency replay)');
        return new Response(cachedResponse.response, {
          status: cachedResponse.status_code,
          headers: {
            ...corsHeaders,
            'X-Idempotency-Replay': 'true',
            'Content-Type': 'application/json'
          }
        });
      }

      // Create key to mark as processing
      await createIdempotencyKey(supabase, idempotencyKey, userId);
    }

    // Rate limiting
    const rateLimitResponse = await rateLimitMiddleware(supabase, userId, 'generate', corsHeaders);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const { datasetId, baseModel, apiKey, trainingConfig, autoStarted } = await req.json() as StartTrainingRequest;

    if (!datasetId || !baseModel || !apiKey) {
      return new Response(JSON.stringify({ error: 'datasetId, baseModel, and apiKey are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get dataset and verify ownership
    const { data: dataset, error: datasetError } = await supabase
      .from('training_datasets')
      .select('*, project_id')
      .eq('id', datasetId)
      .eq('user_id', userId)
      .single();

    if (datasetError || !dataset) {
      console.error('Dataset fetch error:', datasetError);
      return new Response(JSON.stringify({ error: 'Dataset not found or access denied' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!dataset.jsonl_content) {
      return new Response(JSON.stringify({ error: 'Dataset has no generated content. Please generate the dataset first.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create training job record
    const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    const { data: job, error: jobError } = await serviceClient
      .from('training_jobs')
      .insert({
        dataset_id: datasetId,
        user_id: userId,
        project_id: dataset.project_id,
        provider: 'openai',
        base_model: baseModel,
        status: 'uploading',
        current_step: 'Uploading training file...',
        training_config: trainingConfig || {},
        auto_started: autoStarted || false,
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (jobError) {
      console.error('Job creation error:', jobError);
      throw new Error('Failed to create training job');
    }

    console.log(`Created training job ${job.id} for dataset ${datasetId}`);

    // Update dataset status
    await serviceClient
      .from('training_datasets')
      .update({ status: 'training' } as never)
      .eq('id', datasetId);

    // Start OpenAI fine-tuning process in background
    (globalThis as { EdgeRuntime?: { waitUntil: (p: Promise<void>) => void } }).EdgeRuntime?.waitUntil(
      startOpenAIFineTuning(job.id, dataset.jsonl_content, baseModel, apiKey, trainingConfig, serviceClient)
    );

    // Prepare response data
    const responseData = {
      success: true,
      jobId: job.id,
      status: 'uploading',
      message: 'Training job started. You will be notified when training completes.',
    };

    // Store idempotency result if key was provided
    if (idempotencyKey) {
      await storeIdempotencyResult(supabase, idempotencyKey, userId, {
        response: JSON.stringify(responseData),
        statusCode: 200,
        headers: corsHeaders,
      });
    }

    return new Response(JSON.stringify(responseData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Start training error:', error);

    // Mark idempotency as failed if key was provided
    try {
      const authHeader = req.headers.get('Authorization');
      if (authHeader) {
        const token = authHeader.replace('Bearer ', '');
        const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
          global: { headers: { Authorization: authHeader } },
        });
        const { data: { user } } = await supabase.auth.getUser(token);

        if (user) {
          const idempotencyKey = getIdempotencyKey(req);
          if (idempotencyKey) {
            await markIdempotencyFailed(
              supabase,
              idempotencyKey,
              user.id,
              error instanceof Error ? error.message : 'Unknown error'
            );
          }
        }
      }
    } catch (idempotencyError) {
      console.error('Failed to mark idempotency as failed:', idempotencyError);
    }

    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// deno-lint-ignore no-explicit-any
async function startOpenAIFineTuning(
  jobId: string,
  jsonlContent: string,
  baseModel: string,
  apiKey: string,
  config: { nEpochs?: number; batchSize?: number; learningRateMultiplier?: number } | undefined,
  supabase: any
) {
  try {
    // Step 1: Upload the training file
    await updateJobStatus(supabase, jobId, 'uploading', 10, 'Uploading training file to OpenAI...');
    
    const fileBlob = new Blob([jsonlContent], { type: 'application/jsonl' });
    const formData = new FormData();
    formData.append('file', fileBlob, 'training_data.jsonl');
    formData.append('purpose', 'fine-tune');

    const uploadResponse = await fetch('https://api.openai.com/v1/files', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
      body: formData,
    });

    if (!uploadResponse.ok) {
      const errorData = await uploadResponse.json();
      throw new Error(`File upload failed: ${errorData.error?.message || 'Unknown error'}`);
    }

    const uploadedFile = await uploadResponse.json();
    console.log(`Uploaded file: ${uploadedFile.id}`);

    await updateJobStatus(supabase, jobId, 'validating', 25, 'Validating training file...');

    // Wait for file to be processed
    let fileReady = false;
    let attempts = 0;
    while (!fileReady && attempts < 30) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const fileStatusResponse = await fetch(`https://api.openai.com/v1/files/${uploadedFile.id}`, {
        headers: { 'Authorization': `Bearer ${apiKey}` },
      });
      
      const fileStatus = await fileStatusResponse.json();
      if (fileStatus.status === 'processed') {
        fileReady = true;
      } else if (fileStatus.status === 'error') {
        throw new Error(`File processing failed: ${fileStatus.status_details || 'Unknown error'}`);
      }
      attempts++;
    }

    if (!fileReady) {
      throw new Error('File processing timed out');
    }

    // Step 2: Create fine-tuning job
    await updateJobStatus(supabase, jobId, 'queued', 35, 'Creating fine-tuning job...');

    const fineTuneRequest: Record<string, unknown> = {
      training_file: uploadedFile.id,
      model: baseModel,
    };

    if (config) {
      const hyperparameters: Record<string, unknown> = {};
      if (config.nEpochs) hyperparameters.n_epochs = config.nEpochs;
      if (config.batchSize) hyperparameters.batch_size = config.batchSize;
      if (config.learningRateMultiplier) hyperparameters.learning_rate_multiplier = config.learningRateMultiplier;
      if (Object.keys(hyperparameters).length > 0) {
        fineTuneRequest.hyperparameters = hyperparameters;
      }
    }

    const fineTuneResponse = await fetch('https://api.openai.com/v1/fine_tuning/jobs', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(fineTuneRequest),
    });

    if (!fineTuneResponse.ok) {
      const errorData = await fineTuneResponse.json();
      throw new Error(`Fine-tuning job creation failed: ${errorData.error?.message || 'Unknown error'}`);
    }

    const fineTuneJob = await fineTuneResponse.json();
    console.log(`Created fine-tuning job: ${fineTuneJob.id}`);

    // Update job with provider job ID
    await supabase
      .from('training_jobs')
      .update({
        provider_job_id: fineTuneJob.id,
        status: 'training',
        progress_percent: 40,
        current_step: 'Training in progress...',
      })
      .eq('id', jobId);

    // Step 3: Poll for completion
    await pollTrainingCompletion(supabase, jobId, fineTuneJob.id, apiKey);

  } catch (error) {
    console.error('Fine-tuning error:', error);
    await updateJobStatus(
      supabase, 
      jobId, 
      'failed', 
      0, 
      'Training failed',
      error instanceof Error ? error.message : 'Unknown error'
    );

    // Update dataset status back to ready
    const { data: job } = await supabase.from('training_jobs').select('dataset_id').eq('id', jobId).single();
    if (job) {
      await supabase.from('training_datasets').update({ status: 'ready' }).eq('id', job.dataset_id);
    }
  }
}

// deno-lint-ignore no-explicit-any
async function pollTrainingCompletion(
  supabase: any,
  jobId: string,
  providerJobId: string,
  apiKey: string
) {
  let completed = false;
  let pollCount = 0;
  const maxPolls = 720; // 6 hours with 30-second intervals

  while (!completed && pollCount < maxPolls) {
    await new Promise(resolve => setTimeout(resolve, 30000)); // Poll every 30 seconds
    pollCount++;

    try {
      const response = await fetch(`https://api.openai.com/v1/fine_tuning/jobs/${providerJobId}`, {
        headers: { 'Authorization': `Bearer ${apiKey}` },
      });

      if (!response.ok) {
        console.error(`Poll failed with status ${response.status}`);
        continue;
      }

      const jobStatus = await response.json();
      console.log(`Training status: ${jobStatus.status}, trained_tokens: ${jobStatus.trained_tokens}`);

      // Calculate progress based on status
      let progress = 40;
      if (jobStatus.trained_tokens && jobStatus.estimated_finish) {
        const now = Date.now();
        const finish = new Date(jobStatus.estimated_finish).getTime();
        const remaining = Math.max(0, finish - now);
        const total = finish - new Date(jobStatus.created_at * 1000).getTime();
        progress = Math.min(95, Math.round(40 + ((total - remaining) / total) * 55));
      }

      switch (jobStatus.status) {
        case 'validating_files':
          await updateJobStatus(supabase, jobId, 'validating', 35, 'Validating training files...');
          break;
        case 'queued':
          await updateJobStatus(supabase, jobId, 'queued', 38, 'Waiting in queue...');
          break;
        case 'running':
          await updateJobStatus(supabase, jobId, 'training', progress, 
            `Training... ${jobStatus.trained_tokens ? `(${jobStatus.trained_tokens} tokens trained)` : ''}`);
          break;
        case 'succeeded':
          completed = true;
          await supabase
            .from('training_jobs')
            .update({
              status: 'completed',
              progress_percent: 100,
              current_step: 'Training completed successfully!',
              fine_tuned_model_id: jobStatus.fine_tuned_model,
              completed_at: new Date().toISOString(),
              result_metrics: {
                trainedTokens: jobStatus.trained_tokens,
                trainingFile: jobStatus.training_file,
              },
            })
            .eq('id', jobId);

          // Update dataset status
          const { data: job } = await supabase.from('training_jobs').select('dataset_id').eq('id', jobId).single();
          if (job) {
            await supabase.from('training_datasets').update({ status: 'completed' }).eq('id', job.dataset_id);
          }

          console.log(`Training completed! Model ID: ${jobStatus.fine_tuned_model}`);
          break;
        case 'failed':
        case 'cancelled':
          completed = true;
          await updateJobStatus(supabase, jobId, 'failed', 0, 'Training failed', 
            jobStatus.error?.message || 'Training was cancelled or failed');
          
          const { data: failedJob } = await supabase.from('training_jobs').select('dataset_id').eq('id', jobId).single();
          if (failedJob) {
            await supabase.from('training_datasets').update({ status: 'ready' }).eq('id', failedJob.dataset_id);
          }
          break;
      }
    } catch (error) {
      console.error('Poll error:', error);
    }
  }

  if (!completed) {
    await updateJobStatus(supabase, jobId, 'failed', 0, 'Training timed out', 'Training job exceeded maximum duration');
  }
}

// deno-lint-ignore no-explicit-any
async function updateJobStatus(
  supabase: any,
  jobId: string,
  status: string,
  progress: number,
  step: string,
  errorMessage?: string
) {
  const update: Record<string, unknown> = {
    status,
    progress_percent: progress,
    current_step: step,
  };

  if (errorMessage) {
    update.error_message = errorMessage;
  }

  await supabase.from('training_jobs').update(update).eq('id', jobId);
}
