-- ============================================================
-- Task 4.2: Enterprise Security, Data Masking & Privacy Governance
-- ============================================================

-- 1. Create security_audit_logs table (immutable - no UPDATE/DELETE policies)
CREATE TABLE public.security_audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  user_name TEXT NOT NULL,
  action TEXT NOT NULL,
  action_category TEXT NOT NULL CHECK (action_category IN ('access', 'export', 'permission', 'security', 'processing', 'authentication')),
  resource_type TEXT NOT NULL,
  resource_id TEXT NOT NULL,
  resource_name TEXT NOT NULL,
  severity_level TEXT NOT NULL DEFAULT 'info' CHECK (severity_level IN ('info', 'warning', 'critical', 'emergency')),
  client_ip TEXT,
  user_agent TEXT,
  request_id UUID DEFAULT gen_random_uuid(),
  session_id TEXT,
  details JSONB DEFAULT '{}'::jsonb,
  pii_accessed BOOLEAN DEFAULT false,
  data_exported BOOLEAN DEFAULT false,
  compliance_flags TEXT[] DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for security_audit_logs
CREATE INDEX idx_security_audit_logs_user ON public.security_audit_logs(user_id);
CREATE INDEX idx_security_audit_logs_action_category ON public.security_audit_logs(action_category);
CREATE INDEX idx_security_audit_logs_severity ON public.security_audit_logs(severity_level);
CREATE INDEX idx_security_audit_logs_created_at ON public.security_audit_logs(created_at);
CREATE INDEX idx_security_audit_logs_pii ON public.security_audit_logs(pii_accessed) WHERE pii_accessed = true;
CREATE INDEX idx_security_audit_logs_export ON public.security_audit_logs(data_exported) WHERE data_exported = true;

-- Enable RLS for security_audit_logs (IMMUTABLE - only insert, no update/delete)
ALTER TABLE public.security_audit_logs ENABLE ROW LEVEL SECURITY;

-- System can insert security logs
CREATE POLICY "System can insert security logs" ON public.security_audit_logs
  FOR INSERT WITH CHECK (true);

-- Admins can view all security logs
CREATE POLICY "Admins can view security logs" ON public.security_audit_logs
  FOR SELECT USING (is_admin(auth.uid()));

-- No UPDATE or DELETE policies - logs are immutable

-- 2. Create pii_detection_rules table
CREATE TABLE public.pii_detection_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  pattern TEXT NOT NULL,
  pattern_type TEXT NOT NULL CHECK (pattern_type IN ('regex', 'keyword', 'ml_entity')),
  pii_category TEXT NOT NULL CHECK (pii_category IN ('name', 'email', 'phone', 'ssn', 'credit_card', 'address', 'ip_address', 'date_of_birth', 'medical', 'financial', 'custom')),
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  is_active BOOLEAN DEFAULT true,
  mask_strategy TEXT NOT NULL DEFAULT 'redact' CHECK (mask_strategy IN ('redact', 'hash', 'pseudonymize', 'tokenize')),
  mask_replacement TEXT DEFAULT '[REDACTED]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS for pii_detection_rules
ALTER TABLE public.pii_detection_rules ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can view rules
CREATE POLICY "Authenticated users can view PII rules" ON public.pii_detection_rules
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Only admins can modify rules
CREATE POLICY "Admins can manage PII rules" ON public.pii_detection_rules
  FOR ALL USING (is_admin(auth.uid()));

-- 3. Create pii_detections table to track found PII
CREATE TABLE public.pii_detections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  chunk_id UUID REFERENCES public.chunks(id) ON DELETE CASCADE,
  rule_id UUID REFERENCES public.pii_detection_rules(id),
  pii_category TEXT NOT NULL,
  original_hash TEXT NOT NULL,
  masked_replacement TEXT NOT NULL,
  position_start INTEGER,
  position_end INTEGER,
  confidence NUMERIC DEFAULT 1.0,
  is_masked BOOLEAN DEFAULT false,
  masked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for pii_detections
CREATE INDEX idx_pii_detections_document ON public.pii_detections(document_id);
CREATE INDEX idx_pii_detections_chunk ON public.pii_detections(chunk_id);
CREATE INDEX idx_pii_detections_category ON public.pii_detections(pii_category);

-- Enable RLS for pii_detections
ALTER TABLE public.pii_detections ENABLE ROW LEVEL SECURITY;

-- Users can view PII detections for their documents
CREATE POLICY "Users can view own PII detections" ON public.pii_detections
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM documents d
      WHERE d.id = pii_detections.document_id AND d.owner_id = auth.uid()
    )
  );

-- System can manage PII detections
CREATE POLICY "System can manage PII detections" ON public.pii_detections
  FOR ALL USING (true);

-- 4. Create project_privacy_settings table
CREATE TABLE public.project_privacy_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE UNIQUE,
  pii_masking_enabled BOOLEAN DEFAULT true,
  pii_categories_to_mask TEXT[] DEFAULT ARRAY['name', 'email', 'phone', 'ssn', 'credit_card']::TEXT[],
  local_processing_only BOOLEAN DEFAULT false,
  ai_provider TEXT DEFAULT 'lovable',
  ai_provider_region TEXT DEFAULT 'auto',
  data_residency_region TEXT DEFAULT 'auto',
  allow_external_ai_calls BOOLEAN DEFAULT true,
  require_consent_for_ai BOOLEAN DEFAULT false,
  auto_expire_documents_days INTEGER,
  watermark_exports BOOLEAN DEFAULT true,
  watermark_previews BOOLEAN DEFAULT false,
  gdpr_compliant BOOLEAN DEFAULT false,
  hipaa_compliant BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS for project_privacy_settings
ALTER TABLE public.project_privacy_settings ENABLE ROW LEVEL SECURITY;

-- Users can view/manage their own project privacy settings
CREATE POLICY "Users can view own project privacy settings" ON public.project_privacy_settings
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM projects p WHERE p.id = project_id AND p.owner_id = auth.uid())
  );

CREATE POLICY "Users can manage own project privacy settings" ON public.project_privacy_settings
  FOR ALL USING (
    EXISTS (SELECT 1 FROM projects p WHERE p.id = project_id AND p.owner_id = auth.uid())
  );

-- 5. Create secure_share_links table
CREATE TABLE public.secure_share_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  resource_type TEXT NOT NULL CHECK (resource_type IN ('document', 'project', 'dataset', 'report')),
  resource_id UUID NOT NULL,
  created_by UUID NOT NULL,
  access_token TEXT NOT NULL UNIQUE,
  password_hash TEXT,
  expires_at TIMESTAMPTZ,
  max_views INTEGER,
  view_count INTEGER DEFAULT 0,
  require_email BOOLEAN DEFAULT false,
  allowed_emails TEXT[],
  watermark_enabled BOOLEAN DEFAULT true,
  download_enabled BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  last_accessed_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for secure_share_links
CREATE INDEX idx_secure_share_links_token ON public.secure_share_links(access_token);
CREATE INDEX idx_secure_share_links_resource ON public.secure_share_links(resource_type, resource_id);
CREATE INDEX idx_secure_share_links_created_by ON public.secure_share_links(created_by);

-- Enable RLS for secure_share_links
ALTER TABLE public.secure_share_links ENABLE ROW LEVEL SECURITY;

-- Users can manage their own share links
CREATE POLICY "Users can manage own share links" ON public.secure_share_links
  FOR ALL USING (created_by = auth.uid());

-- Public can verify share links
CREATE POLICY "Anyone can verify share links" ON public.secure_share_links
  FOR SELECT USING (is_active = true);

-- 6. Create share_link_access_logs table
CREATE TABLE public.share_link_access_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  share_link_id UUID NOT NULL REFERENCES public.secure_share_links(id) ON DELETE CASCADE,
  accessor_email TEXT,
  accessor_ip TEXT,
  accessor_user_agent TEXT,
  access_granted BOOLEAN NOT NULL,
  denial_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index for access logs
CREATE INDEX idx_share_link_access_logs_link ON public.share_link_access_logs(share_link_id);

-- Enable RLS for share_link_access_logs
ALTER TABLE public.share_link_access_logs ENABLE ROW LEVEL SECURITY;

-- Link owners can view access logs
CREATE POLICY "Link owners can view access logs" ON public.share_link_access_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM secure_share_links s
      WHERE s.id = share_link_id AND s.created_by = auth.uid()
    )
  );

-- System can insert access logs
CREATE POLICY "System can insert access logs" ON public.share_link_access_logs
  FOR INSERT WITH CHECK (true);

-- 7. Create user_sessions table for session management
CREATE TABLE public.user_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  session_token TEXT NOT NULL UNIQUE,
  device_info JSONB DEFAULT '{}'::jsonb,
  ip_address TEXT,
  user_agent TEXT,
  last_active_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT true,
  revoked_at TIMESTAMPTZ,
  revoked_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for user_sessions
CREATE INDEX idx_user_sessions_user ON public.user_sessions(user_id);
CREATE INDEX idx_user_sessions_token ON public.user_sessions(session_token);
CREATE INDEX idx_user_sessions_active ON public.user_sessions(is_active, expires_at);

-- Enable RLS for user_sessions
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- Users can view and manage their own sessions
CREATE POLICY "Users can view own sessions" ON public.user_sessions
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can manage own sessions" ON public.user_sessions
  FOR ALL USING (user_id = auth.uid());

-- 8. Create sso_config table for SSO readiness
CREATE TABLE public.sso_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  provider_type TEXT NOT NULL CHECK (provider_type IN ('saml', 'oidc', 'oauth2')),
  provider_name TEXT NOT NULL,
  is_enabled BOOLEAN DEFAULT false,
  metadata_url TEXT,
  entity_id TEXT,
  sso_url TEXT,
  certificate TEXT,
  attribute_mapping JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS for sso_config
ALTER TABLE public.sso_config ENABLE ROW LEVEL SECURITY;

-- Only admins can manage SSO config
CREATE POLICY "Admins can manage SSO config" ON public.sso_config
  FOR ALL USING (is_admin(auth.uid()));

-- 9. Insert default PII detection rules
INSERT INTO public.pii_detection_rules (name, description, pattern, pattern_type, pii_category, severity, mask_strategy, mask_replacement) VALUES
('Email Address', 'Detect email addresses', '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}', 'regex', 'email', 'high', 'redact', '[EMAIL REDACTED]'),
('Phone Number (US)', 'Detect US phone numbers', '\b(\+1[-.]?)?\(?\d{3}\)?[-.]?\d{3}[-.]?\d{4}\b', 'regex', 'phone', 'high', 'redact', '[PHONE REDACTED]'),
('SSN', 'Detect Social Security Numbers', '\b\d{3}[-]?\d{2}[-]?\d{4}\b', 'regex', 'ssn', 'critical', 'hash', '[SSN REDACTED]'),
('Credit Card', 'Detect credit card numbers', '\b(?:\d{4}[-\s]?){3}\d{4}\b', 'regex', 'credit_card', 'critical', 'redact', '[CARD REDACTED]'),
('IP Address', 'Detect IPv4 addresses', '\b(?:\d{1,3}\.){3}\d{1,3}\b', 'regex', 'ip_address', 'medium', 'pseudonymize', '[IP REDACTED]'),
('Date of Birth Pattern', 'Detect DOB patterns', '\b(?:DOB|Date of Birth|Born)[:\s]*\d{1,2}[-/]\d{1,2}[-/]\d{2,4}\b', 'regex', 'date_of_birth', 'high', 'redact', '[DOB REDACTED]');

-- 10. Add trigger for updated_at columns
CREATE TRIGGER update_pii_detection_rules_updated_at
  BEFORE UPDATE ON public.pii_detection_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_project_privacy_settings_updated_at
  BEFORE UPDATE ON public.project_privacy_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sso_config_updated_at
  BEFORE UPDATE ON public.sso_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 11. Add comments
COMMENT ON TABLE public.security_audit_logs IS 'Immutable security audit log for compliance and forensics';
COMMENT ON TABLE public.pii_detection_rules IS 'Configurable PII detection patterns and masking rules';
COMMENT ON TABLE public.pii_detections IS 'Track detected PII instances in documents';
COMMENT ON TABLE public.project_privacy_settings IS 'Per-project privacy and data residency configuration';
COMMENT ON TABLE public.secure_share_links IS 'Secure, expiring, password-protected share links';
COMMENT ON TABLE public.user_sessions IS 'User session management for multi-device control';
COMMENT ON TABLE public.sso_config IS 'SSO/SAML configuration for enterprise authentication';