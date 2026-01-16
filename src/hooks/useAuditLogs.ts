import { useQuery } from '@tanstack/react-query';
import { auditService } from '@/services/auditService';
import type { AuditLogEntry, AuditAction } from '@/types';

interface AuditFilters {
  action?: AuditAction;
  resourceType?: AuditLogEntry['resourceType'];
  userId?: string;
  startDate?: string;
  endDate?: string;
}

export function useAuditLogs(page = 1, pageSize = 20, filters?: AuditFilters) {
  return useQuery({
    queryKey: ['auditLogs', page, pageSize, filters],
    queryFn: () => auditService.getLogs(page, pageSize, filters),
  });
}

export function useActivitySummary() {
  return useQuery({
    queryKey: ['activitySummary'],
    queryFn: () => auditService.getActivitySummary(),
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}
