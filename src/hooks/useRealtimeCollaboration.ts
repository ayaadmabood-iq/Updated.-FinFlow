import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { collaborationService, DocumentLock, CollaborativeEdit } from '@/services/collaborationService';

// Real-time Cursor Sync
export interface UserCursor {
  userId: string;
  userName?: string;
  color: string;
  position: { x: number; y: number } | null;
  selection: { start: number; end: number } | null;
}

const CURSOR_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6',
  '#3b82f6', '#8b5cf6', '#ec4899', '#f43f5e', '#06b6d4',
];

function getUserColor(userId: string): string {
  const hash = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return CURSOR_COLORS[hash % CURSOR_COLORS.length];
}

export function useCursorSync(resourceType: string, resourceId: string) {
  const { user } = useAuth();
  const [cursors, setCursors] = useState<Map<string, UserCursor>>(new Map());

  useEffect(() => {
    if (!user || !resourceId) return;

    const channelName = `cursors-${resourceType}-${resourceId}`;
    const channel = supabase.channel(channelName, {
      config: { broadcast: { self: false } },
    });

    channel
      .on('broadcast', { event: 'cursor' }, ({ payload }) => {
        if (payload.userId !== user.id) {
          setCursors((prev) => {
            const next = new Map(prev);
            next.set(payload.userId, {
              userId: payload.userId,
              userName: payload.userName,
              color: getUserColor(payload.userId),
              position: payload.position,
              selection: payload.selection,
            });
            return next;
          });
        }
      })
      .on('broadcast', { event: 'cursor_leave' }, ({ payload }) => {
        setCursors((prev) => {
          const next = new Map(prev);
          next.delete(payload.userId);
          return next;
        });
      })
      .subscribe();

    return () => {
      channel.send({
        type: 'broadcast',
        event: 'cursor_leave',
        payload: { userId: user.id },
      });
      supabase.removeChannel(channel);
    };
  }, [user, resourceType, resourceId]);

  const updateCursor = useCallback(
    (position: { x: number; y: number } | null, selection: { start: number; end: number } | null = null) => {
      if (!user || !resourceId) return;

      const channelName = `cursors-${resourceType}-${resourceId}`;
      const channel = supabase.channel(channelName);

      channel.send({
        type: 'broadcast',
        event: 'cursor',
        payload: {
          userId: user.id,
          userName: user.email?.split('@')[0] || 'User',
          position,
          selection,
        },
      });
    },
    [user, resourceType, resourceId]
  );

  return { cursors: Array.from(cursors.values()), updateCursor };
}

// Document Locks
export function useDocumentLocks(documentId: string | undefined) {
  const queryClient = useQueryClient();
  const [locks, setLocks] = useState<DocumentLock[]>([]);

  const query = useQuery({
    queryKey: ['document-locks', documentId],
    queryFn: () => documentId ? collaborationService.getDocumentLocks(documentId) : [],
    enabled: !!documentId,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  useEffect(() => {
    if (query.data) {
      setLocks(query.data);
    }
  }, [query.data]);

  // Subscribe to realtime lock changes
  useEffect(() => {
    if (!documentId) return;

    const channel = supabase
      .channel(`document-locks-${documentId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'document_locks',
          filter: `document_id=eq.${documentId}`,
        },
        () => {
          query.refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [documentId, query]);

  return { ...query, data: locks };
}

export function useAcquireLock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ documentId, fieldName }: { documentId: string; fieldName: string }) =>
      collaborationService.acquireLock(documentId, fieldName),
    onSuccess: (_, { documentId }) => {
      queryClient.invalidateQueries({ queryKey: ['document-locks', documentId] });
    },
  });
}

export function useReleaseLock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ documentId, fieldName }: { documentId: string; fieldName: string }) =>
      collaborationService.releaseLock(documentId, fieldName),
    onSuccess: (_, { documentId }) => {
      queryClient.invalidateQueries({ queryKey: ['document-locks', documentId] });
    },
  });
}

// Collaborative Edit History
export function useEditHistory(documentId: string | undefined, limit = 50) {
  const [edits, setEdits] = useState<CollaborativeEdit[]>([]);

  const query = useQuery({
    queryKey: ['edit-history', documentId, limit],
    queryFn: () => documentId ? collaborationService.getEditHistory(documentId, limit) : [],
    enabled: !!documentId,
  });

  useEffect(() => {
    if (query.data) {
      setEdits(query.data);
    }
  }, [query.data]);

  // Subscribe to realtime edit changes
  useEffect(() => {
    if (!documentId) return;

    const channel = supabase
      .channel(`collaborative-edits-${documentId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'collaborative_edits',
          filter: `document_id=eq.${documentId}`,
        },
        (payload) => {
          const newEdit = payload.new as Record<string, unknown>;
          setEdits((prev) => [{
            id: newEdit.id as string,
            documentId: newEdit.document_id as string,
            userId: newEdit.user_id as string,
            fieldName: newEdit.field_name as string,
            previousValue: newEdit.previous_value as string | null,
            newValue: newEdit.new_value as string | null,
            editType: newEdit.edit_type as string,
            createdAt: newEdit.created_at as string,
            isReverted: (newEdit.is_reverted as boolean) || false,
            revertedBy: newEdit.reverted_by as string | null,
            revertedAt: newEdit.reverted_at as string | null,
          }, ...prev].slice(0, limit));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [documentId, limit]);

  return { ...query, data: edits };
}

export function useRecordEdit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      documentId,
      fieldName,
      previousValue,
      newValue,
      editType = 'update',
    }: {
      documentId: string;
      fieldName: string;
      previousValue: string | null;
      newValue: string | null;
      editType?: string;
    }) => collaborationService.recordEdit(documentId, fieldName, previousValue, newValue, editType),
    onSuccess: (_, { documentId }) => {
      queryClient.invalidateQueries({ queryKey: ['edit-history', documentId] });
    },
  });
}

export function useRevertEdit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (editId: string) => collaborationService.revertEdit(editId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['edit-history'] });
    },
  });
}

// Thread Branching
export function useThreadBranches(threadId: string | undefined) {
  return useQuery({
    queryKey: ['thread-branches', threadId],
    queryFn: () => threadId ? collaborationService.getThreadBranches(threadId) : [],
    enabled: !!threadId,
  });
}

export function useCreateBranch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      parentThreadId,
      messageId,
      title,
      context,
      teamId,
      projectId,
    }: {
      parentThreadId: string;
      messageId: string;
      title: string;
      context: string;
      teamId: string;
      projectId: string;
    }) => collaborationService.createBranch(parentThreadId, messageId, title, context, teamId, projectId),
    onSuccess: (_, { parentThreadId }) => {
      queryClient.invalidateQueries({ queryKey: ['thread-branches', parentThreadId] });
      queryClient.invalidateQueries({ queryKey: ['shared-chat-threads'] });
    },
  });
}

// Team Activity Logging
export function useLogActivity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      teamId,
      action,
      resourceType,
      resourceId,
      resourceName,
      metadata = {},
    }: {
      teamId: string;
      action: string;
      resourceType: string;
      resourceId: string;
      resourceName: string | null;
      metadata?: Record<string, unknown>;
    }) => collaborationService.logActivity(teamId, action, resourceType, resourceId, resourceName, metadata),
    onSuccess: (_, { teamId }) => {
      queryClient.invalidateQueries({ queryKey: ['team-activities', teamId] });
    },
  });
}
