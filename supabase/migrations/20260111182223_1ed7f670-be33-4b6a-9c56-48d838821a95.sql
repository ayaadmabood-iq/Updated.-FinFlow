-- Security Hardening Phase 8: Enhanced Audit Logging

-- Add new forensic columns to audit_logs table
ALTER TABLE public.audit_logs 
ADD COLUMN IF NOT EXISTS user_agent TEXT,
ADD COLUMN IF NOT EXISTS request_id UUID,
ADD COLUMN IF NOT EXISTS severity_level TEXT DEFAULT 'info' CHECK (severity_level IN ('info', 'warning', 'critical'));

-- Create index for efficient filtering by severity
CREATE INDEX IF NOT EXISTS idx_audit_logs_severity ON public.audit_logs(severity_level);

-- Create index for request tracing
CREATE INDEX IF NOT EXISTS idx_audit_logs_request_id ON public.audit_logs(request_id);

-- Update RLS policy to include new columns
-- (policies already exist for select/insert, just ensuring columns are accessible)

-- Add comment for documentation
COMMENT ON COLUMN public.audit_logs.user_agent IS 'Browser/client user agent string for forensics';
COMMENT ON COLUMN public.audit_logs.request_id IS 'Unique request ID for distributed tracing';
COMMENT ON COLUMN public.audit_logs.severity_level IS 'Log severity: info, warning, or critical';