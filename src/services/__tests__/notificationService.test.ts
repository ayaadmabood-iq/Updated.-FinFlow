import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockSupabase } from '@/test/mocks/supabase';

// Ensure supabase is mocked before importing notificationService
vi.mock('@/integrations/supabase/client', () => ({
  supabase: mockSupabase,
}));

import { notificationService } from '../notificationService';

describe('NotificationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset the mock chain
    mockSupabase._mockQueryBuilder.select.mockReturnThis();
    mockSupabase._mockQueryBuilder.eq.mockReturnThis();
    mockSupabase._mockQueryBuilder.order.mockReturnThis();
    mockSupabase._mockQueryBuilder.limit.mockReturnThis();
    mockSupabase._mockQueryBuilder.update.mockReturnThis();
    mockSupabase._mockQueryBuilder.delete.mockReturnThis();
  });

  describe('getNotifications', () => {
    it('should fetch notifications successfully', async () => {
      const mockNotifications = [
        {
          id: 'notif-1',
          user_id: 'user-1',
          type: 'processing_complete',
          title: 'Document Ready',
          message: 'Your document has been processed.',
          data: null,
          read: false,
          created_at: '2024-01-15T10:00:00Z',
        },
      ];

      mockSupabase._mockQueryBuilder.limit.mockResolvedValueOnce({
        data: mockNotifications,
        error: null,
      });

      const result = await notificationService.getNotifications();

      expect(result.notifications).toHaveLength(1);
      expect(result.notifications[0].id).toBe('notif-1');
      expect(result.notifications[0].type).toBe('processing_complete');
    });

    it('should respect limit parameter', async () => {
      mockSupabase._mockQueryBuilder.limit.mockResolvedValueOnce({
        data: [],
        error: null,
      });

      await notificationService.getNotifications(5);

      expect(mockSupabase._mockQueryBuilder.limit).toHaveBeenCalledWith(5);
    });
  });

  describe('markAsRead', () => {
    it('should mark single notification as read', async () => {
      mockSupabase._mockQueryBuilder.eq.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      await notificationService.markAsRead('notif-1');

      expect(mockSupabase._mockQueryBuilder.update).toHaveBeenCalledWith({ read: true });
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all notifications as read', async () => {
      mockSupabase._mockQueryBuilder.eq.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      await notificationService.markAllAsRead();

      expect(mockSupabase._mockQueryBuilder.update).toHaveBeenCalledWith({ read: true });
    });
  });

  describe('deleteNotification', () => {
    it('should delete a notification', async () => {
      mockSupabase._mockQueryBuilder.eq.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      await notificationService.deleteNotification('notif-1');

      expect(mockSupabase._mockQueryBuilder.delete).toHaveBeenCalled();
    });
  });
});
