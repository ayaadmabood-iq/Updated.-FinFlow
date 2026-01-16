import { useQuery, useQueryClient } from '@tanstack/react-query';
import { quotaService, type QuotaStatus } from '@/services/quotaService';
import { useAuth } from './useAuth';

// Refresh interval: 60 seconds
const QUOTA_REFRESH_INTERVAL = 60 * 1000;

export function useQuotaStatus() {
  const { isAuthenticated } = useAuth();

  return useQuery<QuotaStatus>({
    queryKey: ['quota-status'],
    queryFn: () => quotaService.getQuotaStatus(),
    enabled: isAuthenticated,
    refetchInterval: QUOTA_REFRESH_INTERVAL,
    staleTime: 30000, // Consider data stale after 30 seconds
  });
}

export function useQuotaCheck() {
  const { data: quotaStatus, isLoading } = useQuotaStatus();
  const queryClient = useQueryClient();

  const checkDocumentsQuota = (): { allowed: boolean; nearLimit: boolean } => {
    if (!quotaStatus) return { allowed: true, nearLimit: false };
    
    const exceeded = quotaService.isQuotaExceeded(quotaStatus.documents);
    const nearLimit = quotaService.isNearLimit(quotaStatus.documents);
    
    return { allowed: !exceeded, nearLimit };
  };

  const checkStorageQuota = (incomingBytes: number): { allowed: boolean; nearLimit: boolean } => {
    if (!quotaStatus) return { allowed: true, nearLimit: false };
    
    const { storage } = quotaStatus;
    if (storage.limit === null) return { allowed: true, nearLimit: false };
    
    const projectedUsage = storage.current + incomingBytes;
    const allowed = projectedUsage <= storage.limit;
    const nearLimit = storage.current >= storage.limit * 0.8;
    
    return { allowed, nearLimit };
  };

  const checkProcessingQuota = (): { allowed: boolean; nearLimit: boolean } => {
    if (!quotaStatus) return { allowed: true, nearLimit: false };
    
    const exceeded = quotaService.isQuotaExceeded(quotaStatus.processing);
    const nearLimit = quotaService.isNearLimit(quotaStatus.processing);
    
    return { allowed: !exceeded, nearLimit };
  };

  const refetch = () => {
    queryClient.invalidateQueries({ queryKey: ['quota-status'] });
  };

  return {
    quotaStatus,
    isLoading,
    checkDocumentsQuota,
    checkStorageQuota,
    checkProcessingQuota,
    refetch,
  };
}
