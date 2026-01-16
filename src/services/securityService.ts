// Security Service - Handles PII detection, masking, security audit logs, and session management

import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

// Types
export type SeverityLevel = 'info' | 'warning' | 'critical' | 'emergency';
export type ActionCategory = 'access' | 'export' | 'permission' | 'security' | 'processing' | 'authentication';
export type PIICategory = 'name' | 'email' | 'phone' | 'ssn' | 'credit_card' | 'address' | 'ip_address' | 'date_of_birth' | 'medical' | 'financial' | 'custom';
export type MaskStrategy = 'redact' | 'hash' | 'pseudonymize' | 'tokenize';

export interface SecurityAuditLogEntry {
  id: string;
  userId: string;
  userName: string;
  action: string;
  actionCategory: ActionCategory;
  resourceType: string;
  resourceId: string;
  resourceName: string;
  severityLevel: SeverityLevel;
  clientIp?: string;
  userAgent?: string;
  requestId?: string;
  sessionId?: string;
  details?: Record<string, unknown>;
  piiAccessed: boolean;
  dataExported: boolean;
  complianceFlags: string[];
  createdAt: string;
}

export interface PIIDetectionRule {
  id: string;
  name: string;
  description?: string;
  pattern: string;
  patternType: 'regex' | 'keyword' | 'ml_entity';
  piiCategory: PIICategory;
  severity: 'low' | 'medium' | 'high' | 'critical';
  isActive: boolean;
  maskStrategy: MaskStrategy;
  maskReplacement: string;
}

export interface PIIDetection {
  id: string;
  documentId: string;
  chunkId?: string;
  ruleId?: string;
  piiCategory: PIICategory;
  originalHash: string;
  maskedReplacement: string;
  positionStart?: number;
  positionEnd?: number;
  confidence: number;
  isMasked: boolean;
  maskedAt?: string;
  createdAt: string;
}

export interface ProjectPrivacySettings {
  id: string;
  projectId: string;
  piiMaskingEnabled: boolean;
  piiCategoriesToMask: PIICategory[];
  localProcessingOnly: boolean;
  aiProvider: string;
  aiProviderRegion: string;
  dataResidencyRegion: string;
  allowExternalAiCalls: boolean;
  requireConsentForAi: boolean;
  autoExpireDocumentsDays?: number;
  watermarkExports: boolean;
  watermarkPreviews: boolean;
  gdprCompliant: boolean;
  hipaaCompliant: boolean;
}

export interface SecureShareLink {
  id: string;
  resourceType: 'document' | 'project' | 'dataset' | 'report';
  resourceId: string;
  createdBy: string;
  accessToken: string;
  hasPassword: boolean;
  expiresAt?: string;
  maxViews?: number;
  viewCount: number;
  requireEmail: boolean;
  allowedEmails?: string[];
  watermarkEnabled: boolean;
  downloadEnabled: boolean;
  isActive: boolean;
  lastAccessedAt?: string;
  revokedAt?: string;
  createdAt: string;
}

export interface UserSession {
  id: string;
  userId: string;
  deviceInfo: {
    browser?: string;
    os?: string;
    device?: string;
  };
  ipAddress?: string;
  userAgent?: string;
  lastActiveAt: string;
  expiresAt: string;
  isActive: boolean;
  isCurrent: boolean;
  createdAt: string;
}

// Helper functions
function generateRequestId(): string {
  return crypto.randomUUID();
}

function getClientInfo(): { userAgent: string; requestId: string } {
  return {
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'server',
    requestId: generateRequestId(),
  };
}

function hashString(str: string): string {
  // Simple hash for client-side (not cryptographic)
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(16);
}

class SecurityService {
  // ==================== Security Audit Logs ====================

  async logSecurityEvent(input: {
    action: string;
    actionCategory: ActionCategory;
    resourceType: string;
    resourceId: string;
    resourceName: string;
    severityLevel?: SeverityLevel;
    details?: Record<string, unknown>;
    piiAccessed?: boolean;
    dataExported?: boolean;
    complianceFlags?: string[];
  }): Promise<void> {
    const { data: session } = await supabase.auth.getSession();
    if (!session.session?.user) {
      console.warn('Cannot log security event: not authenticated');
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('name')
      .eq('id', session.session.user.id)
      .maybeSingle();

    const clientInfo = getClientInfo();

    try {
      await supabase.from('security_audit_logs').insert({
        user_id: session.session.user.id,
        user_name: profile?.name || 'Unknown',
        action: input.action,
        action_category: input.actionCategory,
        resource_type: input.resourceType,
        resource_id: input.resourceId,
        resource_name: input.resourceName,
        severity_level: input.severityLevel || 'info',
        user_agent: clientInfo.userAgent,
        request_id: clientInfo.requestId,
        details: (input.details as Json) || null,
        pii_accessed: input.piiAccessed || false,
        data_exported: input.dataExported || false,
        compliance_flags: input.complianceFlags || [],
      });
    } catch (e) {
      console.error('Failed to log security event:', e);
    }
  }

  async getSecurityLogs(
    page = 1,
    pageSize = 50,
    filters?: {
      actionCategory?: ActionCategory;
      severityLevel?: SeverityLevel;
      startDate?: string;
      endDate?: string;
      piiAccessedOnly?: boolean;
      dataExportedOnly?: boolean;
    }
  ): Promise<{ data: SecurityAuditLogEntry[]; total: number }> {
    let query = supabase
      .from('security_audit_logs')
      .select('*', { count: 'exact' });

    if (filters?.actionCategory) {
      query = query.eq('action_category', filters.actionCategory);
    }
    if (filters?.severityLevel) {
      query = query.eq('severity_level', filters.severityLevel);
    }
    if (filters?.startDate) {
      query = query.gte('created_at', filters.startDate);
    }
    if (filters?.endDate) {
      query = query.lte('created_at', filters.endDate);
    }
    if (filters?.piiAccessedOnly) {
      query = query.eq('pii_accessed', true);
    }
    if (filters?.dataExportedOnly) {
      query = query.eq('data_exported', true);
    }

    query = query
      .order('created_at', { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);

    const { data, error, count } = await query;

    if (error) throw new Error(error.message);

    return {
      data: (data || []).map(this.mapSecurityLog),
      total: count || 0,
    };
  }

  async getSecuritySummary(): Promise<{
    criticalEvents: number;
    piiAccessCount: number;
    exportCount: number;
    recentEvents: SecurityAuditLogEntry[];
  }> {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const [criticalResult, piiResult, exportResult, recentResult] = await Promise.all([
      supabase.from('security_audit_logs').select('*', { count: 'exact', head: true })
        .gte('created_at', weekAgo).in('severity_level', ['critical', 'emergency']),
      supabase.from('security_audit_logs').select('*', { count: 'exact', head: true })
        .gte('created_at', weekAgo).eq('pii_accessed', true),
      supabase.from('security_audit_logs').select('*', { count: 'exact', head: true })
        .gte('created_at', weekAgo).eq('data_exported', true),
      supabase.from('security_audit_logs').select('*')
        .order('created_at', { ascending: false }).limit(10),
    ]);

    return {
      criticalEvents: criticalResult.count || 0,
      piiAccessCount: piiResult.count || 0,
      exportCount: exportResult.count || 0,
      recentEvents: (recentResult.data || []).map(this.mapSecurityLog),
    };
  }

  // ==================== PII Detection ====================

  async getPIIRules(): Promise<PIIDetectionRule[]> {
    const { data, error } = await supabase
      .from('pii_detection_rules')
      .select('*')
      .eq('is_active', true)
      .order('pii_category');

    if (error) throw new Error(error.message);

    return (data || []).map(this.mapPIIRule);
  }

  detectPII(text: string, rules: PIIDetectionRule[]): Array<{
    rule: PIIDetectionRule;
    matches: Array<{ text: string; start: number; end: number }>;
  }> {
    const results: Array<{
      rule: PIIDetectionRule;
      matches: Array<{ text: string; start: number; end: number }>;
    }> = [];

    for (const rule of rules) {
      if (rule.patternType !== 'regex') continue;

      try {
        const regex = new RegExp(rule.pattern, 'gi');
        const matches: Array<{ text: string; start: number; end: number }> = [];
        let match;

        while ((match = regex.exec(text)) !== null) {
          matches.push({
            text: match[0],
            start: match.index,
            end: match.index + match[0].length,
          });
        }

        if (matches.length > 0) {
          results.push({ rule, matches });
        }
      } catch (e) {
        console.error(`Invalid regex pattern for rule ${rule.name}:`, e);
      }
    }

    return results;
  }

  maskText(text: string, detections: ReturnType<typeof this.detectPII>): string {
    let maskedText = text;
    const replacements: Array<{ start: number; end: number; replacement: string }> = [];

    for (const { rule, matches } of detections) {
      for (const match of matches) {
        replacements.push({
          start: match.start,
          end: match.end,
          replacement: rule.maskReplacement,
        });
      }
    }

    // Sort by position descending to replace from end to start
    replacements.sort((a, b) => b.start - a.start);

    for (const { start, end, replacement } of replacements) {
      maskedText = maskedText.slice(0, start) + replacement + maskedText.slice(end);
    }

    return maskedText;
  }

  async savePIIDetections(
    documentId: string,
    detections: ReturnType<typeof this.detectPII>,
    chunkId?: string
  ): Promise<void> {
    const records = detections.flatMap(({ rule, matches }) =>
      matches.map(match => ({
        document_id: documentId,
        chunk_id: chunkId || null,
        rule_id: rule.id,
        pii_category: rule.piiCategory,
        original_hash: hashString(match.text),
        masked_replacement: rule.maskReplacement,
        position_start: match.start,
        position_end: match.end,
        confidence: 1.0,
        is_masked: false,
      }))
    );

    if (records.length > 0) {
      const { error } = await supabase.from('pii_detections').insert(records);
      if (error) throw new Error(error.message);
    }
  }

  async getDocumentPIIDetections(documentId: string): Promise<PIIDetection[]> {
    const { data, error } = await supabase
      .from('pii_detections')
      .select('*')
      .eq('document_id', documentId)
      .order('position_start');

    if (error) throw new Error(error.message);

    return (data || []).map(this.mapPIIDetection);
  }

  // ==================== Privacy Settings ====================

  async getProjectPrivacySettings(projectId: string): Promise<ProjectPrivacySettings | null> {
    const { data, error } = await supabase
      .from('project_privacy_settings')
      .select('*')
      .eq('project_id', projectId)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return data ? this.mapPrivacySettings(data) : null;
  }

  async upsertProjectPrivacySettings(
    projectId: string,
    settings: Partial<Omit<ProjectPrivacySettings, 'id' | 'projectId'>>
  ): Promise<ProjectPrivacySettings> {
    const { data, error } = await supabase
      .from('project_privacy_settings')
      .upsert({
        project_id: projectId,
        pii_masking_enabled: settings.piiMaskingEnabled,
        pii_categories_to_mask: settings.piiCategoriesToMask,
        local_processing_only: settings.localProcessingOnly,
        ai_provider: settings.aiProvider,
        ai_provider_region: settings.aiProviderRegion,
        data_residency_region: settings.dataResidencyRegion,
        allow_external_ai_calls: settings.allowExternalAiCalls,
        require_consent_for_ai: settings.requireConsentForAi,
        auto_expire_documents_days: settings.autoExpireDocumentsDays,
        watermark_exports: settings.watermarkExports,
        watermark_previews: settings.watermarkPreviews,
        gdpr_compliant: settings.gdprCompliant,
        hipaa_compliant: settings.hipaaCompliant,
      }, { onConflict: 'project_id' })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return this.mapPrivacySettings(data);
  }

  // ==================== Secure Share Links ====================

  async createSecureShareLink(input: {
    resourceType: SecureShareLink['resourceType'];
    resourceId: string;
    password?: string;
    expiresAt?: string;
    maxViews?: number;
    requireEmail?: boolean;
    allowedEmails?: string[];
    watermarkEnabled?: boolean;
    downloadEnabled?: boolean;
  }): Promise<SecureShareLink> {
    const { data: session } = await supabase.auth.getSession();
    if (!session.session?.user) throw new Error('Not authenticated');

    const accessToken = crypto.randomUUID() + crypto.randomUUID().replace(/-/g, '');

    const { data, error } = await supabase
      .from('secure_share_links')
      .insert({
        resource_type: input.resourceType,
        resource_id: input.resourceId,
        created_by: session.session.user.id,
        access_token: accessToken,
        password_hash: input.password ? hashString(input.password) : null,
        expires_at: input.expiresAt,
        max_views: input.maxViews,
        require_email: input.requireEmail || false,
        allowed_emails: input.allowedEmails || [],
        watermark_enabled: input.watermarkEnabled ?? true,
        download_enabled: input.downloadEnabled ?? true,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return this.mapShareLink(data);
  }

  async getShareLinks(resourceType?: string, resourceId?: string): Promise<SecureShareLink[]> {
    let query = supabase.from('secure_share_links').select('*');

    if (resourceType) query = query.eq('resource_type', resourceType);
    if (resourceId) query = query.eq('resource_id', resourceId);

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return (data || []).map(this.mapShareLink);
  }

  async revokeShareLink(linkId: string): Promise<void> {
    const { error } = await supabase
      .from('secure_share_links')
      .update({ is_active: false, revoked_at: new Date().toISOString() })
      .eq('id', linkId);

    if (error) throw new Error(error.message);
  }

  async verifyShareLink(accessToken: string, password?: string): Promise<{
    valid: boolean;
    link?: SecureShareLink;
    reason?: string;
  }> {
    const { data, error } = await supabase
      .from('secure_share_links')
      .select('*')
      .eq('access_token', accessToken)
      .eq('is_active', true)
      .maybeSingle();

    if (error || !data) return { valid: false, reason: 'Link not found' };

    // Check expiration
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      return { valid: false, reason: 'Link has expired' };
    }

    // Check view limit
    if (data.max_views && data.view_count >= data.max_views) {
      return { valid: false, reason: 'View limit reached' };
    }

    // Check password
    if (data.password_hash && (!password || hashString(password) !== data.password_hash)) {
      return { valid: false, reason: 'Invalid password' };
    }

    // Increment view count
    await supabase
      .from('secure_share_links')
      .update({ 
        view_count: data.view_count + 1, 
        last_accessed_at: new Date().toISOString() 
      })
      .eq('id', data.id);

    return { valid: true, link: this.mapShareLink(data) };
  }

  // ==================== Session Management ====================

  async getUserSessions(): Promise<UserSession[]> {
    const { data: session } = await supabase.auth.getSession();
    if (!session.session?.user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('user_sessions')
      .select('*')
      .eq('user_id', session.session.user.id)
      .eq('is_active', true)
      .order('last_active_at', { ascending: false });

    if (error) throw new Error(error.message);
    
    const currentToken = session.session.access_token;
    return (data || []).map(s => ({
      ...this.mapSession(s),
      isCurrent: s.session_token === currentToken,
    }));
  }

  async revokeSession(sessionId: string): Promise<void> {
    const { error } = await supabase
      .from('user_sessions')
      .update({ 
        is_active: false, 
        revoked_at: new Date().toISOString(),
        revoked_reason: 'User revoked' 
      })
      .eq('id', sessionId);

    if (error) throw new Error(error.message);
  }

  async revokeAllOtherSessions(): Promise<void> {
    const { data: session } = await supabase.auth.getSession();
    if (!session.session?.user) throw new Error('Not authenticated');

    const currentToken = session.session.access_token;

    const { error } = await supabase
      .from('user_sessions')
      .update({ 
        is_active: false, 
        revoked_at: new Date().toISOString(),
        revoked_reason: 'User revoked all sessions' 
      })
      .eq('user_id', session.session.user.id)
      .neq('session_token', currentToken);

    if (error) throw new Error(error.message);
  }

  // ==================== Mappers ====================

  private mapSecurityLog(data: Record<string, unknown>): SecurityAuditLogEntry {
    return {
      id: data.id as string,
      userId: data.user_id as string,
      userName: data.user_name as string,
      action: data.action as string,
      actionCategory: data.action_category as ActionCategory,
      resourceType: data.resource_type as string,
      resourceId: data.resource_id as string,
      resourceName: data.resource_name as string,
      severityLevel: data.severity_level as SeverityLevel,
      clientIp: data.client_ip as string | undefined,
      userAgent: data.user_agent as string | undefined,
      requestId: data.request_id as string | undefined,
      sessionId: data.session_id as string | undefined,
      details: data.details as Record<string, unknown> | undefined,
      piiAccessed: data.pii_accessed as boolean,
      dataExported: data.data_exported as boolean,
      complianceFlags: (data.compliance_flags as string[]) || [],
      createdAt: data.created_at as string,
    };
  }

  private mapPIIRule(data: Record<string, unknown>): PIIDetectionRule {
    return {
      id: data.id as string,
      name: data.name as string,
      description: data.description as string | undefined,
      pattern: data.pattern as string,
      patternType: data.pattern_type as 'regex' | 'keyword' | 'ml_entity',
      piiCategory: data.pii_category as PIICategory,
      severity: data.severity as 'low' | 'medium' | 'high' | 'critical',
      isActive: data.is_active as boolean,
      maskStrategy: data.mask_strategy as MaskStrategy,
      maskReplacement: data.mask_replacement as string,
    };
  }

  private mapPIIDetection(data: Record<string, unknown>): PIIDetection {
    return {
      id: data.id as string,
      documentId: data.document_id as string,
      chunkId: data.chunk_id as string | undefined,
      ruleId: data.rule_id as string | undefined,
      piiCategory: data.pii_category as PIICategory,
      originalHash: data.original_hash as string,
      maskedReplacement: data.masked_replacement as string,
      positionStart: data.position_start as number | undefined,
      positionEnd: data.position_end as number | undefined,
      confidence: data.confidence as number,
      isMasked: data.is_masked as boolean,
      maskedAt: data.masked_at as string | undefined,
      createdAt: data.created_at as string,
    };
  }

  private mapPrivacySettings(data: Record<string, unknown>): ProjectPrivacySettings {
    return {
      id: data.id as string,
      projectId: data.project_id as string,
      piiMaskingEnabled: data.pii_masking_enabled as boolean,
      piiCategoriesToMask: (data.pii_categories_to_mask as string[]) as PIICategory[],
      localProcessingOnly: data.local_processing_only as boolean,
      aiProvider: data.ai_provider as string,
      aiProviderRegion: data.ai_provider_region as string,
      dataResidencyRegion: data.data_residency_region as string,
      allowExternalAiCalls: data.allow_external_ai_calls as boolean,
      requireConsentForAi: data.require_consent_for_ai as boolean,
      autoExpireDocumentsDays: data.auto_expire_documents_days as number | undefined,
      watermarkExports: data.watermark_exports as boolean,
      watermarkPreviews: data.watermark_previews as boolean,
      gdprCompliant: data.gdpr_compliant as boolean,
      hipaaCompliant: data.hipaa_compliant as boolean,
    };
  }

  private mapShareLink(data: Record<string, unknown>): SecureShareLink {
    return {
      id: data.id as string,
      resourceType: data.resource_type as SecureShareLink['resourceType'],
      resourceId: data.resource_id as string,
      createdBy: data.created_by as string,
      accessToken: data.access_token as string,
      hasPassword: !!data.password_hash,
      expiresAt: data.expires_at as string | undefined,
      maxViews: data.max_views as number | undefined,
      viewCount: data.view_count as number,
      requireEmail: data.require_email as boolean,
      allowedEmails: data.allowed_emails as string[] | undefined,
      watermarkEnabled: data.watermark_enabled as boolean,
      downloadEnabled: data.download_enabled as boolean,
      isActive: data.is_active as boolean,
      lastAccessedAt: data.last_accessed_at as string | undefined,
      revokedAt: data.revoked_at as string | undefined,
      createdAt: data.created_at as string,
    };
  }

  private mapSession(data: Record<string, unknown>): Omit<UserSession, 'isCurrent'> {
    return {
      id: data.id as string,
      userId: data.user_id as string,
      deviceInfo: (data.device_info as { browser?: string; os?: string; device?: string }) || {},
      ipAddress: data.ip_address as string | undefined,
      userAgent: data.user_agent as string | undefined,
      lastActiveAt: data.last_active_at as string,
      expiresAt: data.expires_at as string,
      isActive: data.is_active as boolean,
      createdAt: data.created_at as string,
    };
  }
}

export const securityService = new SecurityService();
export default securityService;
