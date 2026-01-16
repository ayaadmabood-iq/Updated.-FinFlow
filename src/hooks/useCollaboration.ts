import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useEffect, useState } from 'react';
import type { Database } from '@/integrations/supabase/types';

type SharedChatThread = Database['public']['Tables']['shared_chat_threads']['Row'];
type ChatMessage = Database['public']['Tables']['chat_messages']['Row'];
type DocumentAnnotation = Database['public']['Tables']['document_annotations']['Row'];
type KnowledgeBase = Database['public']['Tables']['knowledge_bases']['Row'];
type KnowledgeBaseArticle = Database['public']['Tables']['knowledge_base_articles']['Row'];
type AnnotationType = Database['public']['Enums']['annotation_type'];

// Shared Chat Threads
export function useSharedChatThreads(teamId: string | undefined) {
  return useQuery({
    queryKey: ['shared-chat-threads', teamId],
    queryFn: async () => {
      if (!teamId) return [];
      const { data, error } = await supabase
        .from('shared_chat_threads')
        .select('*')
        .eq('team_id', teamId)
        .order('last_message_at', { ascending: false, nullsFirst: false });
      
      if (error) throw error;
      return data as SharedChatThread[];
    },
    enabled: !!teamId,
  });
}

export function useSharedChatThread(threadId: string | undefined) {
  return useQuery({
    queryKey: ['shared-chat-thread', threadId],
    queryFn: async () => {
      if (!threadId) return null;
      const { data, error } = await supabase
        .from('shared_chat_threads')
        .select('*')
        .eq('id', threadId)
        .single();
      
      if (error) throw error;
      return data as SharedChatThread;
    },
    enabled: !!threadId,
  });
}

export function useChatMessages(threadId: string | undefined) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const queryClient = useQueryClient();

  // Initial fetch
  const query = useQuery({
    queryKey: ['chat-messages', threadId],
    queryFn: async () => {
      if (!threadId) return [];
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('thread_id', threadId)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return data as ChatMessage[];
    },
    enabled: !!threadId,
  });

  // Sync local state with query data
  useEffect(() => {
    if (query.data) {
      setMessages(query.data);
    }
  }, [query.data]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!threadId) return;

    const channel = supabase
      .channel(`chat-messages-${threadId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `thread_id=eq.${threadId}`,
        },
        (payload) => {
          const newMessage = payload.new as ChatMessage;
          setMessages((prev) => [...prev, newMessage]);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chat_messages',
          filter: `thread_id=eq.${threadId}`,
        },
        (payload) => {
          const updatedMessage = payload.new as ChatMessage;
          setMessages((prev) =>
            prev.map((msg) => (msg.id === updatedMessage.id ? updatedMessage : msg))
          );
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'chat_messages',
          filter: `thread_id=eq.${threadId}`,
        },
        (payload) => {
          const deletedId = (payload.old as ChatMessage).id;
          setMessages((prev) => prev.filter((msg) => msg.id !== deletedId));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [threadId]);

  return { ...query, data: messages };
}

export function useCreateChatThread() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      teamId,
      projectId,
      title,
      description,
    }: {
      teamId: string;
      projectId: string;
      title: string;
      description?: string;
    }) => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('shared_chat_threads')
        .insert({
          team_id: teamId,
          project_id: projectId,
          title,
          description,
          created_by: user.id,
          participant_ids: [user.id],
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, { teamId }) => {
      queryClient.invalidateQueries({ queryKey: ['shared-chat-threads', teamId] });
    },
  });
}

export function useSendMessage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      threadId,
      content,
      senderType = 'user',
      mentions = [],
      documentRefs = [],
    }: {
      threadId: string;
      content: string;
      senderType?: 'user' | 'ai';
      mentions?: string[];
      documentRefs?: string[];
    }) => {
      if (!user && senderType === 'user') throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('chat_messages')
        .insert({
          thread_id: threadId,
          sender_id: user?.id || '00000000-0000-0000-0000-000000000000',
          sender_type: senderType,
          content,
          mentions,
          document_refs: documentRefs,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, { threadId }) => {
      queryClient.invalidateQueries({ queryKey: ['chat-messages', threadId] });
    },
  });
}

// Document Annotations
export function useDocumentAnnotations(documentId: string | undefined, teamId?: string) {
  const [annotations, setAnnotations] = useState<DocumentAnnotation[]>([]);

  const query = useQuery({
    queryKey: ['document-annotations', documentId, teamId],
    queryFn: async () => {
      if (!documentId) return [];
      
      let queryBuilder = supabase
        .from('document_annotations')
        .select('*')
        .eq('document_id', documentId);
      
      if (teamId) {
        queryBuilder = queryBuilder.eq('team_id', teamId);
      }
      
      const { data, error } = await queryBuilder.order('created_at', { ascending: true });
      
      if (error) throw error;
      return data as DocumentAnnotation[];
    },
    enabled: !!documentId,
  });

  useEffect(() => {
    if (query.data) {
      setAnnotations(query.data);
    }
  }, [query.data]);

  // Realtime subscription
  useEffect(() => {
    if (!documentId) return;

    const channel = supabase
      .channel(`annotations-${documentId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'document_annotations',
          filter: `document_id=eq.${documentId}`,
        },
        () => {
          // Refetch on any change
          query.refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [documentId, query]);

  return { ...query, data: annotations };
}

export function useCreateAnnotation() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      documentId,
      teamId,
      annotationType,
      content,
      selectedText,
      startOffset,
      endOffset,
      pageNumber,
      position,
    }: {
      documentId: string;
      teamId?: string;
      annotationType: AnnotationType;
      content: string;
      selectedText?: string;
      startOffset?: number;
      endOffset?: number;
      pageNumber?: number;
      position?: { x: number; y: number; width: number; height: number };
    }) => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('document_annotations')
        .insert({
          document_id: documentId,
          user_id: user.id,
          team_id: teamId,
          annotation_type: annotationType,
          content,
          selected_text: selectedText,
          start_offset: startOffset,
          end_offset: endOffset,
          page_number: pageNumber,
          position,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, { documentId, teamId }) => {
      queryClient.invalidateQueries({ queryKey: ['document-annotations', documentId, teamId] });
    },
  });
}

export function useResolveAnnotation() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ annotationId }: { annotationId: string }) => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('document_annotations')
        .update({
          is_resolved: true,
          resolved_by: user.id,
          resolved_at: new Date().toISOString(),
        })
        .eq('id', annotationId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-annotations'] });
    },
  });
}

// Knowledge Bases
export function useKnowledgeBases(teamId: string | undefined) {
  return useQuery({
    queryKey: ['knowledge-bases', teamId],
    queryFn: async () => {
      if (!teamId) return [];
      const { data, error } = await supabase
        .from('knowledge_bases')
        .select('*')
        .eq('team_id', teamId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as KnowledgeBase[];
    },
    enabled: !!teamId,
  });
}

export function useKnowledgeBaseArticles(knowledgeBaseId: string | undefined) {
  return useQuery({
    queryKey: ['kb-articles', knowledgeBaseId],
    queryFn: async () => {
      if (!knowledgeBaseId) return [];
      const { data, error } = await supabase
        .from('knowledge_base_articles')
        .select('*')
        .eq('knowledge_base_id', knowledgeBaseId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as KnowledgeBaseArticle[];
    },
    enabled: !!knowledgeBaseId,
  });
}

export function useCreateKnowledgeBase() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      teamId,
      name,
      description,
      isPublic = false,
    }: {
      teamId: string;
      name: string;
      description?: string;
      isPublic?: boolean;
    }) => {
      if (!user) throw new Error('Not authenticated');

      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

      const { data, error } = await supabase
        .from('knowledge_bases')
        .insert({
          team_id: teamId,
          name,
          description,
          slug,
          is_public: isPublic,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, { teamId }) => {
      queryClient.invalidateQueries({ queryKey: ['knowledge-bases', teamId] });
    },
  });
}

export function useCreateArticle() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      knowledgeBaseId,
      title,
      contentMarkdown,
      summary,
      sourceDocumentIds = [],
      tags = [],
      isPublished = false,
    }: {
      knowledgeBaseId: string;
      title: string;
      contentMarkdown: string;
      summary?: string;
      sourceDocumentIds?: string[];
      tags?: string[];
      isPublished?: boolean;
    }) => {
      if (!user) throw new Error('Not authenticated');

      const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-');

      const { data, error } = await supabase
        .from('knowledge_base_articles')
        .insert({
          knowledge_base_id: knowledgeBaseId,
          title,
          slug,
          content_markdown: contentMarkdown,
          summary,
          source_document_ids: sourceDocumentIds,
          tags,
          is_published: isPublished,
          published_at: isPublished ? new Date().toISOString() : null,
          author_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, { knowledgeBaseId }) => {
      queryClient.invalidateQueries({ queryKey: ['kb-articles', knowledgeBaseId] });
    },
  });
}

// User Presence
export function usePresence(resourceType: string, resourceId: string, teamId?: string) {
  const { user } = useAuth();
  const [presentUsers, setPresentUsers] = useState<Array<{ userId: string; metadata: Record<string, unknown> }>>([]);

  useEffect(() => {
    if (!user || !resourceId) return;

    const channelName = `presence-${resourceType}-${resourceId}`;
    const channel = supabase.channel(channelName);

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const users = Object.values(state).flat().map((p: unknown) => {
          const presence = p as { userId: string; [key: string]: unknown };
          return {
            userId: presence.userId,
            metadata: presence as Record<string, unknown>,
          };
        });
        setPresentUsers(users);
      })
      .on('presence', { event: 'join' }, () => {
        // User joined - presence state updated via sync event
      })
      .on('presence', { event: 'leave' }, () => {
        // User left - presence state updated via sync event
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            userId: user.id,
            teamId,
            resourceType,
            resourceId,
            onlineAt: new Date().toISOString(),
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, resourceType, resourceId, teamId]);

  return { presentUsers };
}

// Team Activity Feed
export function useTeamActivity(teamId: string | undefined, limit = 50) {
  const [activities, setActivities] = useState<Array<{
    id: string;
    action: string;
    resourceType: string;
    resourceName: string | null;
    userId: string;
    createdAt: string;
    metadata: Record<string, unknown>;
  }>>([]);

  const query = useQuery({
    queryKey: ['team-activities', teamId, limit],
    queryFn: async () => {
      if (!teamId) return [];
      const { data, error } = await supabase
        .from('team_activities')
        .select('*')
        .eq('team_id', teamId)
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (error) throw error;
      return data.map(a => ({
        id: a.id,
        action: a.action,
        resourceType: a.resource_type,
        resourceName: a.resource_name,
        userId: a.user_id,
        createdAt: a.created_at,
        metadata: (a.metadata || {}) as Record<string, unknown>,
      }));
    },
    enabled: !!teamId,
  });

  useEffect(() => {
    if (query.data) {
      setActivities(query.data);
    }
  }, [query.data]);

  // Realtime subscription for new activities
  useEffect(() => {
    if (!teamId) return;

    const channel = supabase
      .channel(`team-activities-${teamId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'team_activities',
          filter: `team_id=eq.${teamId}`,
        },
        (payload) => {
          const newActivity = payload.new as Database['public']['Tables']['team_activities']['Row'];
          setActivities((prev) => [{
            id: newActivity.id,
            action: newActivity.action,
            resourceType: newActivity.resource_type,
            resourceName: newActivity.resource_name,
            userId: newActivity.user_id,
            createdAt: newActivity.created_at,
            metadata: (newActivity.metadata || {}) as Record<string, unknown>,
          }, ...prev].slice(0, limit));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [teamId, limit]);

  return { ...query, data: activities };
}
