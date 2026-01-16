-- Create research_task_status enum
CREATE TYPE research_task_status AS ENUM ('pending', 'planning', 'researching', 'analyzing', 'verifying', 'synthesizing', 'completed', 'failed', 'cancelled');

-- Create agent_role enum
CREATE TYPE agent_role AS ENUM ('manager', 'researcher', 'analyst', 'critic');

-- Create research_tasks table for autonomous research jobs
CREATE TABLE public.research_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  goal TEXT NOT NULL,
  source_document_ids UUID[] DEFAULT '{}',
  status research_task_status NOT NULL DEFAULT 'pending',
  current_phase TEXT,
  progress_percent INTEGER DEFAULT 0,
  shared_workspace JSONB DEFAULT '{}',
  final_result JSONB,
  final_report_markdown TEXT,
  conflicts_found JSONB DEFAULT '[]',
  total_iterations INTEGER DEFAULT 0,
  max_iterations INTEGER DEFAULT 20,
  total_tokens_used INTEGER DEFAULT 0,
  total_cost_usd NUMERIC(12, 6) DEFAULT 0,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create agent_activity_logs table for detailed agent traces
CREATE TABLE public.agent_activity_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.research_tasks(id) ON DELETE CASCADE,
  agent_role agent_role NOT NULL,
  action TEXT NOT NULL,
  input_summary TEXT,
  output_summary TEXT,
  tool_used TEXT,
  tool_input JSONB,
  tool_output JSONB,
  reasoning TEXT,
  tokens_used INTEGER DEFAULT 0,
  cost_usd NUMERIC(12, 8) DEFAULT 0,
  duration_ms INTEGER,
  iteration_number INTEGER DEFAULT 1,
  parent_log_id UUID REFERENCES public.agent_activity_logs(id),
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed')),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_interventions table for mid-process feedback
CREATE TABLE public.user_interventions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.research_tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  intervention_type TEXT NOT NULL CHECK (intervention_type IN ('feedback', 'redirect', 'pause', 'resume', 'cancel')),
  message TEXT,
  applied_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.research_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_interventions ENABLE ROW LEVEL SECURITY;

-- RLS policies for research_tasks
CREATE POLICY "Users can view their own research tasks"
  ON public.research_tasks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create research tasks"
  ON public.research_tasks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own research tasks"
  ON public.research_tasks FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own research tasks"
  ON public.research_tasks FOR DELETE
  USING (auth.uid() = user_id);

-- RLS policies for agent_activity_logs (via task ownership)
CREATE POLICY "Users can view logs for their tasks"
  ON public.agent_activity_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.research_tasks rt 
      WHERE rt.id = agent_activity_logs.task_id 
      AND rt.user_id = auth.uid()
    )
  );

CREATE POLICY "System can insert agent logs"
  ON public.agent_activity_logs FOR INSERT
  WITH CHECK (true);

-- RLS policies for user_interventions
CREATE POLICY "Users can view their interventions"
  ON public.user_interventions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create interventions for their tasks"
  ON public.user_interventions FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.research_tasks rt 
      WHERE rt.id = user_interventions.task_id 
      AND rt.user_id = auth.uid()
    )
  );

-- Create indexes for performance
CREATE INDEX idx_research_tasks_project_id ON public.research_tasks(project_id);
CREATE INDEX idx_research_tasks_user_id ON public.research_tasks(user_id);
CREATE INDEX idx_research_tasks_status ON public.research_tasks(status);
CREATE INDEX idx_agent_activity_logs_task_id ON public.agent_activity_logs(task_id);
CREATE INDEX idx_agent_activity_logs_agent_role ON public.agent_activity_logs(agent_role);
CREATE INDEX idx_agent_activity_logs_created_at ON public.agent_activity_logs(created_at DESC);
CREATE INDEX idx_user_interventions_task_id ON public.user_interventions(task_id);

-- Add updated_at trigger for research_tasks
CREATE TRIGGER update_research_tasks_updated_at
  BEFORE UPDATE ON public.research_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for research_tasks and agent_activity_logs
ALTER PUBLICATION supabase_realtime ADD TABLE public.research_tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_activity_logs;