// Audit logging service - Backend implementation with enhanced forensic data
// This service abstracts all audit operations. Swap implementation for NestJS migration.

import { supabase } from '@/integrations/supabase/client';
import type { AuditLogEntry, AuditAction, PaginatedResponse } from '@/types';
import type { Json } from '@/integrations/supabase/types';

export type SeverityLevel = 'info' | 'warning' | 'critical';

interface LogInput {
  action: AuditAction;
  resourceType: AuditLogEntry['resourceType'];
  resourceId: string;
  resourceName: string;
  details?: Record<string, unknown>;
  severityLevel?: SeverityLevel;
}

interface DbAuditLog {
  id: string;
  user_id: string;
  user_name: string;
  action: string;
  resource_type: string;
  resource_id: string;
  resource_name: string;
  details: Json | null;
  ip_address: string | null;
  user_agent: string | null;
  request_id: string | null;
  severity_level: string | null;
  created_at: string;
}

// Generate a unique request ID for tracing
function generateRequestId(): string {
  return crypto.randomUUID();
}

// Get client info for forensic logging
function getClientInfo(): { userAgent: string; requestId: string } {
  return {
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'server',
    requestId: generateRequestId(),
  };
}

// Determine severity level based on action
function inferSeverityLevel(action: AuditAction, details?: Record<string, unknown>): SeverityLevel {
  // Critical actions
  if (action === 'delete' || action === 'settings_change') {
    return 'warning';
  }
  
  // Check for failed operations
  if (details?.failed || details?.error) {
    return 'warning';
  }
  
  // Check for security-related events
  if (details?.securityEvent || details?.blocked) {
    return 'critical';
  }
  
  return 'info';
}

class AuditService {
  async getLogs(
    page = 1,
    pageSize = 20,
    filters?: {
      action?: AuditAction;
      resourceType?: AuditLogEntry['resourceType'];
      userId?: string;
      startDate?: string;
      endDate?: string;
      severityLevel?: SeverityLevel;
    }
  ): Promise<PaginatedResponse<AuditLogEntry>> {
    let query = supabase
      .from('audit_logs')
      .select('*', { count: 'exact' });

    if (filters?.action) {
      query = query.eq('action', filters.action);
    }

    if (filters?.resourceType) {
      query = query.eq('resource_type', filters.resourceType);
    }

    if (filters?.userId) {
      query = query.eq('user_id', filters.userId);
    }

    if (filters?.startDate) {
      query = query.gte('created_at', filters.startDate);
    }

    if (filters?.endDate) {
      query = query.lte('created_at', filters.endDate);
    }

    if (filters?.severityLevel) {
      query = query.eq('severity_level', filters.severityLevel);
    }

    query = query
      .order('created_at', { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);

    const { data, error, count } = await query;

    if (error) {
      throw new Error(error.message);
    }

    const logs: AuditLogEntry[] = (data || []).map((item) => this.mapToAuditLog(item as DbAuditLog));

    return {
      data: logs,
      total: count || 0,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize),
    };
  }

  async getLogById(id: string): Promise<AuditLogEntry | null> {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    return data ? this.mapToAuditLog(data as DbAuditLog) : null;
  }

  // Log an action - called internally by other services
  // Enhanced with forensic data capture
  async log(input: LogInput): Promise<void> {
    const { data: session } = await supabase.auth.getSession();
    if (!session.session?.user) {
      console.warn('Cannot log action: not authenticated');
      return;
    }

    // Get user name from profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('name')
      .eq('id', session.session.user.id)
      .maybeSingle();

    // Get client forensic info
    const clientInfo = getClientInfo();
    const severityLevel = input.severityLevel || inferSeverityLevel(input.action, input.details);

    try {
      const insertData = {
        user_id: session.session.user.id,
        user_name: profile?.name || 'Unknown',
        action: input.action,
        resource_type: input.resourceType,
        resource_id: input.resourceId,
        resource_name: input.resourceName,
        details: (input.details as Json) || null,
        user_agent: clientInfo.userAgent,
        request_id: clientInfo.requestId,
        severity_level: severityLevel,
      };
      
      await supabase.from('audit_logs').insert(insertData);
    } catch (e) {
      console.error('Failed to log action:', e);
    }
  }

  // Log a failed action (convenience method)
  async logFailure(
    action: AuditAction,
    resourceType: AuditLogEntry['resourceType'],
    resourceId: string,
    resourceName: string,
    error: string
  ): Promise<void> {
    await this.log({
      action,
      resourceType,
      resourceId,
      resourceName,
      details: { failed: true, error },
      severityLevel: 'warning',
    });
  }

  // Log a security event (convenience method)
  async logSecurityEvent(
    action: AuditAction,
    resourceType: AuditLogEntry['resourceType'],
    resourceId: string,
    resourceName: string,
    securityDetails: Record<string, unknown>
  ): Promise<void> {
    await this.log({
      action,
      resourceType,
      resourceId,
      resourceName,
      details: { securityEvent: true, ...securityDetails },
      severityLevel: 'critical',
    });
  }

  // Get activity summary for dashboard
  async getActivitySummary(): Promise<{
    todayCount: number;
    weekCount: number;
    recentActions: AuditLogEntry[];
    criticalCount: number;
  }> {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

    // Get today's count
    const { count: todayCount } = await supabase
      .from('audit_logs')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', todayStart);

    // Get week's count
    const { count: weekCount } = await supabase
      .from('audit_logs')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', weekAgo);

    // Get critical events count (last 7 days)
    const { count: criticalCount } = await supabase
      .from('audit_logs')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', weekAgo)
      .eq('severity_level', 'critical');

    // Get recent actions
    const { data: recentData } = await supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    return {
      todayCount: todayCount || 0,
      weekCount: weekCount || 0,
      criticalCount: criticalCount || 0,
      recentActions: (recentData || []).map((item) => this.mapToAuditLog(item as DbAuditLog)),
    };
  }

  // Get logs by severity for security monitoring
  async getLogsBySeverity(
    severityLevel: SeverityLevel,
    limit = 100
  ): Promise<AuditLogEntry[]> {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('severity_level', severityLevel)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(error.message);
    }

    return (data || []).map((item) => this.mapToAuditLog(item as DbAuditLog));
  }

  private mapToAuditLog(data: DbAuditLog): AuditLogEntry {
    return {
      id: data.id,
      userId: data.user_id,
      userName: data.user_name,
      action: data.action as AuditAction,
      resourceType: data.resource_type as AuditLogEntry['resourceType'],
      resourceId: data.resource_id,
      resourceName: data.resource_name,
      details: {
        ...(data.details as Record<string, unknown> || {}),
        userAgent: data.user_agent,
        requestId: data.request_id,
        severityLevel: data.severity_level,
      },
      ipAddress: data.ip_address || undefined,
      timestamp: data.created_at,
    };
  }
}

export const auditService = new AuditService();
export default auditService;
