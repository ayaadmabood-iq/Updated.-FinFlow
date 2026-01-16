import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { rateLimitMiddleware } from "../_shared/rate-limiter.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Sample training pair templates for different domains
const customerSupportPairs = [
  { user: "How do I reset my password?", assistant: "To reset your password, go to Settings > Security > Reset Password. Click the reset button and follow the email instructions." },
  { user: "I can't log into my account", assistant: "I'm sorry to hear that. Let me help you troubleshoot. First, make sure you're using the correct email address. If you forgot your password, use the 'Forgot Password' link on the login page." },
  { user: "How do I cancel my subscription?", assistant: "To cancel your subscription, navigate to Settings > Billing > Manage Subscription, then click 'Cancel Subscription'. Your access will continue until the end of your billing period." },
  { user: "What payment methods do you accept?", assistant: "We accept all major credit cards (Visa, Mastercard, American Express), PayPal, and bank transfers for enterprise accounts." },
  { user: "How long does shipping take?", assistant: "Standard shipping takes 5-7 business days. Express shipping is 2-3 business days. International orders may take 10-14 business days." },
  { user: "Can I get a refund?", assistant: "Yes, we offer a 30-day money-back guarantee. To request a refund, contact our support team with your order number and reason for the refund." },
  { user: "How do I update my billing information?", assistant: "Go to Settings > Billing > Payment Methods. Click 'Edit' next to your current payment method or 'Add New' to add a different card." },
  { user: "My order hasn't arrived yet", assistant: "I apologize for the delay. Please provide your order number and I'll check the tracking status for you. Most delays are due to carrier issues which we can investigate." },
  { user: "How do I contact customer support?", assistant: "You can reach us via email at support@company.com, live chat on our website, or phone at 1-800-123-4567. We're available 24/7." },
  { user: "Is my data secure?", assistant: "Absolutely! We use bank-level encryption (AES-256) for all data. We're SOC 2 Type II certified and GDPR compliant. Your privacy is our top priority." },
];

const medicalAssistantPairs = [
  { user: "What are the symptoms of the flu?", assistant: "Common flu symptoms include fever, chills, body aches, fatigue, headache, sore throat, and cough. If you experience severe symptoms like difficulty breathing, seek immediate medical attention." },
  { user: "How much water should I drink daily?", assistant: "The general recommendation is 8 glasses (64 oz) of water per day, but individual needs vary based on activity level, climate, and health conditions. Listen to your body's thirst signals." },
  { user: "What foods are high in protein?", assistant: "High-protein foods include lean meats, fish, eggs, dairy products, legumes, nuts, and tofu. For example, chicken breast has about 31g protein per 100g." },
  { user: "How can I improve my sleep quality?", assistant: "Improve sleep by maintaining a consistent schedule, avoiding screens before bed, keeping your room cool and dark, limiting caffeine after noon, and exercising regularly but not close to bedtime." },
  { user: "What causes high blood pressure?", assistant: "High blood pressure can be caused by genetics, excess sodium intake, lack of exercise, obesity, stress, smoking, and excessive alcohol consumption. Regular monitoring and lifestyle changes can help manage it." },
  { user: "How often should I exercise?", assistant: "The WHO recommends at least 150 minutes of moderate aerobic activity or 75 minutes of vigorous activity per week, plus muscle-strengthening activities on 2+ days per week." },
];

const legalAnalyzerPairs = [
  { user: "What is a non-disclosure agreement?", assistant: "An NDA (Non-Disclosure Agreement) is a legal contract that prevents parties from sharing confidential information. It defines what information is protected, the duration of protection, and penalties for breaches." },
  { user: "What is the difference between LLC and Corporation?", assistant: "An LLC offers flexible management and pass-through taxation with limited liability. A Corporation has formal structure with shareholders, directors, and officers, and can issue stock but faces double taxation unless it's an S-Corp." },
  { user: "What is intellectual property?", assistant: "Intellectual property (IP) refers to creations of the mind protected by law, including patents (inventions), trademarks (brand identifiers), copyrights (creative works), and trade secrets (confidential business information)." },
  { user: "What is a breach of contract?", assistant: "A breach of contract occurs when one party fails to fulfill their contractual obligations. It can be material (significant) or minor, and remedies may include damages, specific performance, or contract termination." },
];

function generateTrainingPairs(pairs: Array<{user: string, assistant: string}>, datasetId: string, systemPrompt: string) {
  return pairs.map((pair, index) => ({
    dataset_id: datasetId,
    user_message: pair.user,
    assistant_message: pair.assistant,
    system_message: systemPrompt,
    token_count: Math.floor(50 + Math.random() * 150),
    quality_score: 0.7 + Math.random() * 0.25,
    is_valid: true,
    metadata: { source: 'demo', index },
  }));
}

function generateMetrics(jobId: string, steps: number = 10) {
  const metrics = [];
  let loss = 0.8 + Math.random() * 0.2;
  let accuracy = 0.5 + Math.random() * 0.1;
  
  for (let step = 1; step <= steps; step++) {
    loss = Math.max(0.15, loss - (0.05 + Math.random() * 0.03));
    accuracy = Math.min(0.95, accuracy + (0.03 + Math.random() * 0.02));
    
    metrics.push({
      job_id: jobId,
      step,
      loss: parseFloat(loss.toFixed(4)),
      accuracy: parseFloat(accuracy.toFixed(4)),
      tokens_processed: step * 1000 + Math.floor(Math.random() * 500),
    });
  }
  
  return metrics;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Get the user from the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authorization required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const supabaseUser = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Get user from token
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(JSON.stringify({ error: 'Invalid authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = user.id;
    console.log(`Seeding demo data for user: ${userId}`);

    const { action } = await req.json().catch(() => ({ action: 'seed' }));

    if (action === 'cleanup') {
      // Delete existing demo data for this user
      console.log('Cleaning up previous demo data...');
      
      // Get demo projects
      const { data: demoProjects } = await supabaseAdmin
        .from('projects')
        .select('id')
        .eq('owner_id', userId)
        .like('name', '%Demo%');

      if (demoProjects && demoProjects.length > 0) {
        const projectIds = demoProjects.map(p => p.id);
        
        // Delete training metrics first (via jobs)
        const { data: jobs } = await supabaseAdmin
          .from('training_jobs')
          .select('id')
          .in('project_id', projectIds);
        
        if (jobs && jobs.length > 0) {
          await supabaseAdmin
            .from('training_metrics')
            .delete()
            .in('job_id', jobs.map(j => j.id));
        }
        
        // Delete training jobs
        await supabaseAdmin
          .from('training_jobs')
          .delete()
          .in('project_id', projectIds);
        
        // Delete training pairs (via datasets)
        const { data: datasets } = await supabaseAdmin
          .from('training_datasets')
          .select('id')
          .in('project_id', projectIds);
        
        if (datasets && datasets.length > 0) {
          await supabaseAdmin
            .from('training_pairs')
            .delete()
            .in('dataset_id', datasets.map(d => d.id));
        }
        
        // Delete datasets
        await supabaseAdmin
          .from('training_datasets')
          .delete()
          .in('project_id', projectIds);
        
        // Delete projects
        await supabaseAdmin
          .from('projects')
          .delete()
          .in('id', projectIds);
      }
      
      return new Response(JSON.stringify({ success: true, message: 'Demo data cleaned up' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create sample projects
    console.log('Creating sample projects...');
    
    const projectsToCreate = [
      { name: 'Customer Support Bot (Demo)', description: 'AI assistant trained on customer support conversations', status: 'active', document_count: 50 },
      { name: 'Medical Assistant (Demo)', description: 'Health information and wellness guidance bot', status: 'active', document_count: 30 },
      { name: 'Legal Document Analyzer (Demo)', description: 'Legal terminology and document analysis assistant', status: 'draft', document_count: 20 },
    ];

    const { data: projects, error: projectsError } = await supabaseAdmin
      .from('projects')
      .insert(projectsToCreate.map(p => ({ ...p, owner_id: userId })))
      .select();

    if (projectsError) {
      console.error('Error creating projects:', projectsError);
      throw projectsError;
    }

    console.log(`Created ${projects.length} projects`);

    // Create datasets for each project
    const datasetsToCreate = [];
    const pairsByDataset: Record<string, any[]> = {};
    
    // Customer Support datasets
    const csProject = projects[0];
    datasetsToCreate.push(
      { name: 'Support Conversations v1', description: 'Initial training dataset', project_id: csProject.id, user_id: userId, status: 'ready', format: 'openai', total_pairs: 50, total_tokens: 3500, system_prompt: 'You are a helpful customer support agent.' },
      { name: 'Support FAQ Expanded', description: 'Expanded FAQ training data', project_id: csProject.id, user_id: userId, status: 'completed', format: 'alpaca', total_pairs: 30, total_tokens: 2100, system_prompt: 'You are a friendly customer service representative.' },
    );

    // Medical datasets
    const medProject = projects[1];
    datasetsToCreate.push(
      { name: 'Health Q&A Dataset', description: 'General health questions and answers', project_id: medProject.id, user_id: userId, status: 'ready', format: 'sharegpt', total_pairs: 30, total_tokens: 2800, system_prompt: 'You are a medical information assistant. Always recommend consulting a healthcare professional for specific medical advice.' },
    );

    // Legal datasets
    const legalProject = projects[2];
    datasetsToCreate.push(
      { name: 'Legal Terms Training', description: 'Legal terminology and concepts', project_id: legalProject.id, user_id: userId, status: 'processing', format: 'openai', total_pairs: 20, total_tokens: 1800, system_prompt: 'You are a legal information assistant. Note that this is general information and not legal advice.' },
    );

    const { data: datasets, error: datasetsError } = await supabaseAdmin
      .from('training_datasets')
      .insert(datasetsToCreate)
      .select();

    if (datasetsError) {
      console.error('Error creating datasets:', datasetsError);
      throw datasetsError;
    }

    console.log(`Created ${datasets.length} datasets`);

    // Create training pairs for each dataset
    const allPairs: any[] = [];
    
    // Customer Support pairs
    allPairs.push(...generateTrainingPairs(customerSupportPairs, datasets[0].id, 'You are a helpful customer support agent.'));
    allPairs.push(...generateTrainingPairs(customerSupportPairs.slice(0, 6), datasets[1].id, 'You are a friendly customer service representative.'));
    
    // Medical pairs
    allPairs.push(...generateTrainingPairs(medicalAssistantPairs, datasets[2].id, 'You are a medical information assistant.'));
    
    // Legal pairs
    allPairs.push(...generateTrainingPairs(legalAnalyzerPairs, datasets[3].id, 'You are a legal information assistant.'));

    const { error: pairsError } = await supabaseAdmin
      .from('training_pairs')
      .insert(allPairs);

    if (pairsError) {
      console.error('Error creating training pairs:', pairsError);
      throw pairsError;
    }

    console.log(`Created ${allPairs.length} training pairs`);

    // Create training jobs
    const now = new Date();
    const jobsToCreate = [
      // Completed jobs
      {
        project_id: csProject.id,
        dataset_id: datasets[0].id,
        user_id: userId,
        provider: 'openai',
        base_model: 'gpt-4o-mini-2024-07-18',
        status: 'completed',
        progress_percent: 100,
        fine_tuned_model_id: `ft:gpt-4o-mini-2024-07-18:org::${Math.random().toString(36).slice(2, 10)}`,
        started_at: new Date(now.getTime() - 30 * 60000).toISOString(),
        completed_at: new Date(now.getTime() - 5 * 60000).toISOString(),
        current_step: 'Completed',
        training_config: { epochs: 3, learning_rate: 0.0001, batch_size: 4 },
        result_metrics: { final_loss: 0.21, final_accuracy: 0.92, total_tokens: 45000, estimated_cost: 8.50 },
      },
      {
        project_id: medProject.id,
        dataset_id: datasets[2].id,
        user_id: userId,
        provider: 'openai',
        base_model: 'gpt-4o-mini-2024-07-18',
        status: 'completed',
        progress_percent: 100,
        fine_tuned_model_id: `ft:gpt-4o-mini-2024-07-18:org::${Math.random().toString(36).slice(2, 10)}`,
        started_at: new Date(now.getTime() - 60 * 60000).toISOString(),
        completed_at: new Date(now.getTime() - 35 * 60000).toISOString(),
        current_step: 'Completed',
        training_config: { epochs: 4, learning_rate: 0.00015, batch_size: 8 },
        result_metrics: { final_loss: 0.18, final_accuracy: 0.94, total_tokens: 32000, estimated_cost: 6.20 },
      },
      // Running job
      {
        project_id: csProject.id,
        dataset_id: datasets[1].id,
        user_id: userId,
        provider: 'openai',
        base_model: 'gpt-4o-mini-2024-07-18',
        status: 'running',
        progress_percent: 52,
        started_at: new Date(now.getTime() - 12 * 60000).toISOString(),
        current_step: 'Training epoch 2/4',
        training_config: { epochs: 4, learning_rate: 0.0001, batch_size: 4 },
      },
      // Failed job
      {
        project_id: legalProject.id,
        dataset_id: datasets[3].id,
        user_id: userId,
        provider: 'openai',
        base_model: 'gpt-4o-mini-2024-07-18',
        status: 'failed',
        progress_percent: 15,
        started_at: new Date(now.getTime() - 45 * 60000).toISOString(),
        completed_at: new Date(now.getTime() - 40 * 60000).toISOString(),
        current_step: 'Failed during validation',
        error_message: 'Dataset validation failed: Insufficient training examples. Minimum 10 examples required, found 4 valid examples.',
        training_config: { epochs: 3, learning_rate: 0.0001, batch_size: 4 },
      },
      // Queued job
      {
        project_id: csProject.id,
        dataset_id: datasets[0].id,
        user_id: userId,
        provider: 'openai',
        base_model: 'gpt-4o-2024-08-06',
        status: 'pending',
        progress_percent: 0,
        current_step: 'Queued for training',
        training_config: { epochs: 5, learning_rate: 0.00008, batch_size: 2 },
      },
    ];

    const { data: jobs, error: jobsError } = await supabaseAdmin
      .from('training_jobs')
      .insert(jobsToCreate)
      .select();

    if (jobsError) {
      console.error('Error creating jobs:', jobsError);
      throw jobsError;
    }

    console.log(`Created ${jobs.length} training jobs`);

    // Create training metrics for completed jobs
    const completedJobs = jobs.filter(j => j.status === 'completed');
    const allMetrics: any[] = [];
    
    for (const job of completedJobs) {
      allMetrics.push(...generateMetrics(job.id, 10));
    }

    // Also add some metrics for the running job
    const runningJob = jobs.find(j => j.status === 'running');
    if (runningJob) {
      allMetrics.push(...generateMetrics(runningJob.id, 5));
    }

    const { error: metricsError } = await supabaseAdmin
      .from('training_metrics')
      .insert(allMetrics);

    if (metricsError) {
      console.error('Error creating metrics:', metricsError);
      throw metricsError;
    }

    console.log(`Created ${allMetrics.length} training metrics`);

    const summary = {
      success: true,
      created: {
        projects: projects.length,
        datasets: datasets.length,
        trainingPairs: allPairs.length,
        trainingJobs: jobs.length,
        trainingMetrics: allMetrics.length,
      },
      projects: projects.map(p => ({ id: p.id, name: p.name })),
    };

    console.log('Demo data seeding complete:', summary);

    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('Error seeding demo data:', error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
