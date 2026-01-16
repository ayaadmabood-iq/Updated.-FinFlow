import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminService, GetUsersParams, UpdateUserInput } from '@/services/adminService';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

export function useAdminStats() {
  return useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: () => adminService.getStats(),
    staleTime: 30000, // 30 seconds
  });
}

export function useAdminMetrics() {
  return useQuery({
    queryKey: ['admin', 'metrics'],
    queryFn: () => adminService.getMetrics(),
    staleTime: 60000, // 1 minute
    refetchInterval: 60000, // Auto-refresh every minute
  });
}

export function useAdminUsers(params: GetUsersParams = {}) {
  return useQuery({
    queryKey: ['admin', 'users', params],
    queryFn: () => adminService.getUsers(params),
    staleTime: 10000, // 10 seconds
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: (input: UpdateUserInput) => adminService.updateUser(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
      toast.success(t('common.success'));
    },
    onError: (error: Error) => {
      toast.error(error.message || t('common.error'));
    },
  });
}
