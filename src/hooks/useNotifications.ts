import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationService, type NotificationsResponse } from '@/services/notificationService';
import { useAuth } from './useAuth';

// Refresh interval: 30 seconds
const NOTIFICATION_REFRESH_INTERVAL = 30 * 1000;

export function useNotifications(limit = 20) {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery<NotificationsResponse>({
    queryKey: ['notifications', limit],
    queryFn: () => notificationService.getNotifications(limit),
    enabled: isAuthenticated,
    refetchInterval: NOTIFICATION_REFRESH_INTERVAL,
    staleTime: 15000, // Consider data stale after 15 seconds
    refetchOnWindowFocus: true,
  });

  const markAsReadMutation = useMutation({
    mutationFn: (notificationId: string) => notificationService.markAsRead(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: () => notificationService.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const deleteNotificationMutation = useMutation({
    mutationFn: (notificationId: string) => notificationService.deleteNotification(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  return {
    notifications: query.data?.notifications ?? [],
    unreadCount: query.data?.unreadCount ?? 0,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
    markAsRead: markAsReadMutation.mutate,
    markAllAsRead: markAllAsReadMutation.mutate,
    deleteNotification: deleteNotificationMutation.mutate,
    isMarkingAsRead: markAsReadMutation.isPending,
    isMarkingAllAsRead: markAllAsReadMutation.isPending,
  };
}
