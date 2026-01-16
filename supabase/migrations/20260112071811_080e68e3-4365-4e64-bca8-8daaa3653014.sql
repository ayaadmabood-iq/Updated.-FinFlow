-- Enum for workflow trigger types
CREATE TYPE workflow_trigger_type AS ENUM (
  'document_uploaded',
  'document_processed',
  'content_detected',
  'date_approaching',
  'amount_threshold',
  'keyword_match',
  'ai_classification',
  'manual'
);

-- Enum for workflow action types
CREATE TYPE workflow_action_type AS ENUM (
  'move_to_folder',
  'add_tag',
  'assign_user',
  'generate_summary',
  'create_task',
  'send_email',
  'send_slack',
  'call_webhook',
  'update_field'
);

-- Enum for workflow status
CREATE TYPE workflow_status AS ENUM (
  'active',
  'paused',
  'draft',
  'archived'
);

-- Enum for execution status
CREATE TYPE workflow_execution_status AS ENUM (
  'pending',
  'running',
  'completed',
  'failed',
  'skipped',
  'cancelled'
);

-- Enum for task priority
CREATE TYPE task_priority AS ENUM (
  'low',
  'medium',
  'high',
  'urgent'
);

-- Enum for task status
CREATE TYPE task_status AS ENUM (
  'pending',
  'in_progress',
  'completed',
  'cancelled',
  'blocked'
);

-- Workflow rules table
CREATE TABLE public.workflow_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  trigger_type workflow_trigger_type NOT NULL,
  trigger_config JSONB NOT NULL DEFAULT '{}',
  conditions JSONB DEFAULT '[]',
  actions JSONB NOT NULL DEFAULT '[]',
  status workflow_status NOT NULL DEFAULT 'draft',
  priority INTEGER DEFAULT 0,
  max_executions_per_day INTEGER DEFAULT 100,
  cooldown_seconds INTEGER DEFAULT 60,
  last_triggered_at TIMESTAMPTZ,
  execution_count INTEGER DEFAULT 0,
  is_system BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Project tasks table
CREATE TABLE public.project_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL,
  workflow_rule_id UUID REFERENCES public.workflow_rules(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  priority task_priority NOT NULL DEFAULT 'medium',
  status task_status NOT NULL DEFAULT 'pending',
  due_date TIMESTAMPTZ,
  assigned_to UUID,
  tags TEXT[] DEFAULT '{}',
  source_text TEXT,
  external_id TEXT,
  external_provider TEXT,
  metadata JSONB DEFAULT '{}',
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Workflow execution history
CREATE TABLE public.workflow_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_rule_id UUID NOT NULL REFERENCES public.workflow_rules(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  trigger_event JSONB NOT NULL,
  document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL,
  status workflow_execution_status NOT NULL DEFAULT 'pending',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,
  actions_executed JSONB DEFAULT '[]',
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  parent_execution_id UUID REFERENCES public.workflow_executions(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Workflow action logs (detailed per-action tracking)
CREATE TABLE public.workflow_action_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id UUID NOT NULL REFERENCES public.workflow_executions(id) ON DELETE CASCADE,
  action_type workflow_action_type NOT NULL,
  action_config JSONB NOT NULL,
  status workflow_execution_status NOT NULL DEFAULT 'pending',
  input_data JSONB,
  output_data JSONB,
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Workflow templates (pre-built automations)
CREATE TABLE public.workflow_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  trigger_type workflow_trigger_type NOT NULL,
  trigger_config JSONB NOT NULL DEFAULT '{}',
  conditions JSONB DEFAULT '[]',
  actions JSONB NOT NULL DEFAULT '[]',
  icon TEXT,
  is_featured BOOLEAN DEFAULT false,
  use_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- External integrations for workflows
CREATE TABLE public.workflow_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  provider TEXT NOT NULL,
  display_name TEXT,
  config JSONB NOT NULL DEFAULT '{}',
  credentials_encrypted TEXT,
  is_active BOOLEAN DEFAULT true,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.workflow_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_action_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_integrations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for workflow_rules
CREATE POLICY "Users can view own project workflows"
  ON public.workflow_rules FOR SELECT
  USING (user_id = auth.uid() OR project_id IN (
    SELECT p.id FROM projects p WHERE p.owner_id = auth.uid()
  ));

CREATE POLICY "Users can create workflows in own projects"
  ON public.workflow_rules FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own workflows"
  ON public.workflow_rules FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own workflows"
  ON public.workflow_rules FOR DELETE
  USING (user_id = auth.uid());

-- RLS Policies for project_tasks
CREATE POLICY "Users can view own project tasks"
  ON public.project_tasks FOR SELECT
  USING (user_id = auth.uid() OR assigned_to = auth.uid() OR project_id IN (
    SELECT p.id FROM projects p WHERE p.owner_id = auth.uid()
  ));

CREATE POLICY "Users can create tasks in own projects"
  ON public.project_tasks FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update tasks they own or are assigned"
  ON public.project_tasks FOR UPDATE
  USING (user_id = auth.uid() OR assigned_to = auth.uid());

CREATE POLICY "Users can delete own tasks"
  ON public.project_tasks FOR DELETE
  USING (user_id = auth.uid());

-- RLS Policies for workflow_executions
CREATE POLICY "Users can view own workflow executions"
  ON public.workflow_executions FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create workflow executions"
  ON public.workflow_executions FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own workflow executions"
  ON public.workflow_executions FOR UPDATE
  USING (user_id = auth.uid());

-- RLS Policies for workflow_action_logs
CREATE POLICY "Users can view action logs for own executions"
  ON public.workflow_action_logs FOR SELECT
  USING (execution_id IN (
    SELECT id FROM workflow_executions WHERE user_id = auth.uid()
  ));

CREATE POLICY "System can insert action logs"
  ON public.workflow_action_logs FOR INSERT
  WITH CHECK (execution_id IN (
    SELECT id FROM workflow_executions WHERE user_id = auth.uid()
  ));

-- RLS Policies for workflow_templates (public read)
CREATE POLICY "Anyone can view workflow templates"
  ON public.workflow_templates FOR SELECT
  USING (true);

-- RLS Policies for workflow_integrations
CREATE POLICY "Users can view own integrations"
  ON public.workflow_integrations FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can manage own integrations"
  ON public.workflow_integrations FOR ALL
  USING (user_id = auth.uid());

-- Indexes for performance
CREATE INDEX idx_workflow_rules_project ON public.workflow_rules(project_id);
CREATE INDEX idx_workflow_rules_status ON public.workflow_rules(status);
CREATE INDEX idx_workflow_rules_trigger ON public.workflow_rules(trigger_type);
CREATE INDEX idx_project_tasks_project ON public.project_tasks(project_id);
CREATE INDEX idx_project_tasks_status ON public.project_tasks(status);
CREATE INDEX idx_project_tasks_due_date ON public.project_tasks(due_date);
CREATE INDEX idx_project_tasks_assigned ON public.project_tasks(assigned_to);
CREATE INDEX idx_workflow_executions_workflow ON public.workflow_executions(workflow_rule_id);
CREATE INDEX idx_workflow_executions_status ON public.workflow_executions(status);
CREATE INDEX idx_workflow_executions_created ON public.workflow_executions(created_at DESC);
CREATE INDEX idx_workflow_action_logs_execution ON public.workflow_action_logs(execution_id);

-- Triggers for updated_at
CREATE TRIGGER update_workflow_rules_updated_at
  BEFORE UPDATE ON public.workflow_rules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_project_tasks_updated_at
  BEFORE UPDATE ON public.project_tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workflow_integrations_updated_at
  BEFORE UPDATE ON public.workflow_integrations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to check circuit breaker (prevent infinite loops)
CREATE OR REPLACE FUNCTION public.check_workflow_circuit_breaker(
  p_workflow_id UUID,
  p_execution_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_workflow RECORD;
  v_recent_executions INTEGER;
  v_chain_depth INTEGER;
BEGIN
  -- Get workflow config
  SELECT * INTO v_workflow FROM workflow_rules WHERE id = p_workflow_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'Workflow not found');
  END IF;
  
  IF v_workflow.status != 'active' THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'Workflow is not active');
  END IF;
  
  -- Check daily execution limit
  SELECT COUNT(*) INTO v_recent_executions
  FROM workflow_executions
  WHERE workflow_rule_id = p_workflow_id
    AND created_at >= CURRENT_DATE;
  
  IF v_recent_executions >= v_workflow.max_executions_per_day THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'Daily execution limit reached');
  END IF;
  
  -- Check cooldown
  IF v_workflow.last_triggered_at IS NOT NULL 
     AND v_workflow.last_triggered_at > now() - (v_workflow.cooldown_seconds || ' seconds')::INTERVAL THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'Workflow is in cooldown');
  END IF;
  
  -- Check chain depth (prevent cascading workflows)
  IF p_execution_id IS NOT NULL THEN
    WITH RECURSIVE chain AS (
      SELECT id, parent_execution_id, 1 as depth
      FROM workflow_executions
      WHERE id = p_execution_id
      UNION ALL
      SELECT we.id, we.parent_execution_id, c.depth + 1
      FROM workflow_executions we
      JOIN chain c ON we.id = c.parent_execution_id
      WHERE c.depth < 10
    )
    SELECT MAX(depth) INTO v_chain_depth FROM chain;
    
    IF v_chain_depth >= 5 THEN
      RETURN jsonb_build_object('allowed', false, 'reason', 'Maximum workflow chain depth reached');
    END IF;
  END IF;
  
  RETURN jsonb_build_object('allowed', true, 'executions_today', v_recent_executions);
END;
$$;

-- Function to get matching workflows for a trigger
CREATE OR REPLACE FUNCTION public.get_matching_workflows(
  p_project_id UUID,
  p_trigger_type workflow_trigger_type,
  p_event_data JSONB
)
RETURNS TABLE (workflow_id UUID, workflow_name TEXT, conditions JSONB, actions JSONB)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    wr.id,
    wr.name,
    wr.conditions,
    wr.actions
  FROM workflow_rules wr
  WHERE wr.project_id = p_project_id
    AND wr.trigger_type = p_trigger_type
    AND wr.status = 'active'
  ORDER BY wr.priority DESC, wr.created_at ASC;
END;
$$;

-- Insert default workflow templates
INSERT INTO public.workflow_templates (name, description, category, trigger_type, trigger_config, conditions, actions, icon, is_featured) VALUES
(
  'Invoice Alert',
  'Get notified when invoices exceed a threshold amount',
  'finance',
  'content_detected',
  '{"document_type": "invoice"}',
  '[{"field": "amount", "operator": "greater_than", "value": 10000}]',
  '[{"type": "send_email", "config": {"subject": "High-value invoice detected", "template": "invoice_alert"}}]',
  'receipt',
  true
),
(
  'Contract Expiry Reminder',
  'Create tasks for contracts expiring within 30 days',
  'legal',
  'date_approaching',
  '{"field": "expiry_date", "days_before": 30}',
  '[]',
  '[{"type": "create_task", "config": {"title": "Review expiring contract", "priority": "high"}}]',
  'file-clock',
  true
),
(
  'Auto-Tag Documents',
  'Automatically tag documents based on AI classification',
  'organization',
  'ai_classification',
  '{"confidence_threshold": 0.8}',
  '[]',
  '[{"type": "add_tag", "config": {"tag_from": "classification"}}]',
  'tags',
  true
),
(
  'Slack Notification',
  'Send Slack messages for important document uploads',
  'communication',
  'document_processed',
  '{}',
  '[{"field": "priority", "operator": "equals", "value": "high"}]',
  '[{"type": "send_slack", "config": {"channel": "#documents", "message_template": "New important document: {{document.name}}"}}]',
  'message-square',
  false
),
(
  'Webhook Integration',
  'Call external API when documents match criteria',
  'integration',
  'content_detected',
  '{}',
  '[]',
  '[{"type": "call_webhook", "config": {"method": "POST", "include_document": true}}]',
  'webhook',
  false
);