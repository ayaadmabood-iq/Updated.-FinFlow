// Security hooks for PII detection, audit logs, privacy settings, and session management

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  securityService, 
  type SecurityAuditLogEntry, 
  type PIIDetectionRule,
  type PIIDetection,
  type ProjectPrivacySettings,
  type SecureShareLink,
  type UserSession,
  type ActionCategory,
  type SeverityLevel,
  type PIICategory,
} from '@/services/securityService';
import { toast } from 'sonner';

// Re-export types for use in components
export type { SecurityAuditLogEntry, PIIDetectionRule, PIIDetection, ProjectPrivacySettings, SecureShareLink, UserSession, ActionCategory, SeverityLevel, PIICategory };

// ==================== Security Audit Logs ====================

export function useSecurityLogs(
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
) {
  return useQuery({
    queryKey: ['securityLogs', page, pageSize, filters],
    queryFn: () => securityService.getSecurityLogs(page, pageSize, filters),
  });
}

export function useSecuritySummary() {
  return useQuery({
    queryKey: ['securitySummary'],
    queryFn: () => securityService.getSecuritySummary(),
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}

export function useLogSecurityEvent() {
  return useMutation({
    mutationFn: (input: Parameters<typeof securityService.logSecurityEvent>[0]) =>
      securityService.logSecurityEvent(input),
  });
}

// ==================== PII Detection ====================

export function usePIIRules() {
  return useQuery({
    queryKey: ['piiRules'],
    queryFn: () => securityService.getPIIRules(),
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}

export function useDetectPII() {
  const { data: rules = [] } = usePIIRules();

  return {
    detect: (text: string) => securityService.detectPII(text, rules),
    mask: (text: string) => {
      const detections = securityService.detectPII(text, rules);
      return securityService.maskText(text, detections);
    },
    rules,
  };
}

export function useDocumentPIIDetections(documentId: string) {
  return useQuery({
    queryKey: ['piiDetections', documentId],
    queryFn: () => securityService.getDocumentPIIDetections(documentId),
    enabled: !!documentId,
  });
}

export function useSavePIIDetections() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ 
      documentId, 
      detections, 
      chunkId 
    }: { 
      documentId: string; 
      detections: ReturnType<typeof securityService.detectPII>; 
      chunkId?: string;
    }) => securityService.savePIIDetections(documentId, detections, chunkId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['piiDetections', variables.documentId] });
    },
  });
}

// ==================== Privacy Settings ====================

export function useProjectPrivacySettings(projectId: string) {
  return useQuery({
    queryKey: ['privacySettings', projectId],
    queryFn: () => securityService.getProjectPrivacySettings(projectId),
    enabled: !!projectId,
  });
}

export function useUpdateProjectPrivacySettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ 
      projectId, 
      settings 
    }: { 
      projectId: string; 
      settings: Partial<Omit<ProjectPrivacySettings, 'id' | 'projectId'>>;
    }) => securityService.upsertProjectPrivacySettings(projectId, settings),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['privacySettings', variables.projectId] });
      toast.success('Privacy settings updated');
    },
    onError: (error) => {
      toast.error(`Failed to update settings: ${error.message}`);
    },
  });
}

// ==================== Secure Share Links ====================

export function useShareLinks(resourceType?: string, resourceId?: string) {
  return useQuery({
    queryKey: ['shareLinks', resourceType, resourceId],
    queryFn: () => securityService.getShareLinks(resourceType, resourceId),
  });
}

export function useCreateShareLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: Parameters<typeof securityService.createSecureShareLink>[0]) =>
      securityService.createSecureShareLink(input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['shareLinks', variables.resourceType, variables.resourceId] });
      toast.success('Share link created');
    },
    onError: (error) => {
      toast.error(`Failed to create share link: ${error.message}`);
    },
  });
}

export function useRevokeShareLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (linkId: string) => securityService.revokeShareLink(linkId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shareLinks'] });
      toast.success('Share link revoked');
    },
    onError: (error) => {
      toast.error(`Failed to revoke share link: ${error.message}`);
    },
  });
}

export function useVerifyShareLink() {
  return useMutation({
    mutationFn: ({ accessToken, password }: { accessToken: string; password?: string }) =>
      securityService.verifyShareLink(accessToken, password),
  });
}

// ==================== Session Management ====================

export function useUserSessions() {
  return useQuery({
    queryKey: ['userSessions'],
    queryFn: () => securityService.getUserSessions(),
    refetchInterval: 60000, // Refresh every minute
  });
}

export function useRevokeSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (sessionId: string) => securityService.revokeSession(sessionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userSessions'] });
      toast.success('Session revoked');
    },
    onError: (error) => {
      toast.error(`Failed to revoke session: ${error.message}`);
    },
  });
}

export function useRevokeAllSessions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => securityService.revokeAllOtherSessions(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userSessions'] });
      toast.success('All other sessions revoked');
    },
    onError: (error) => {
      toast.error(`Failed to revoke sessions: ${error.message}`);
    },
  });
}

