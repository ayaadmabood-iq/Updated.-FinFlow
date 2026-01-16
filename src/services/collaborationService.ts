import { supabase } from '@/integrations/supabase/client';

export interface DocumentLock {
  id: string;
  documentId: string;
  userId: string;
  fieldName: string;
  lockedAt: string;
  expiresAt: string;
  isActive: boolean;
}

export interface CollaborativeEdit {
  id: string;
  documentId: string;
  userId: string;
  fieldName: string;
  previousValue: string | null;
  newValue: string | null;
  editType: string;
  createdAt: string;
  isReverted: boolean;
  revertedBy: string | null;
  revertedAt: string | null;
}

export interface CursorPosition {
  userId: string;
  resourceType: string;
  resourceId: string;
  position: { x: number; y: number } | null;
  selection: { start: number; end: number } | null;
  lastUpdated: string;
}

class CollaborationService {
  // Document Locks
  async acquireLock(documentId: string, fieldName: string): Promise<DocumentLock | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // First, clean up expired locks
    await supabase
      .from('document_locks')
      .delete()
      .lt('expires_at', new Date().toISOString());

    // Check if there's an existing active lock by another user
    const { data: existingLock } = await supabase
      .from('document_locks')
      .select('*')
      .eq('document_id', documentId)
      .eq('field_name', fieldName)
      .eq('is_active', true)
      .neq('user_id', user.id)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (existingLock) {
      return null; // Lock exists, cannot acquire
    }

    // Try to acquire or extend the lock
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 minutes
    
    const { data, error } = await supabase
      .from('document_locks')
      .upsert({
        document_id: documentId,
        user_id: user.id,
        field_name: fieldName,
        locked_at: new Date().toISOString(),
        expires_at: expiresAt,
        is_active: true,
      }, { onConflict: 'document_id,field_name,user_id' })
      .select()
      .single();

    if (error) {
      console.error('Failed to acquire lock:', error);
      return null;
    }

    return {
      id: data.id,
      documentId: data.document_id,
      userId: data.user_id,
      fieldName: data.field_name,
      lockedAt: data.locked_at,
      expiresAt: data.expires_at,
      isActive: data.is_active,
    };
  }

  async releaseLock(documentId: string, fieldName: string): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { error } = await supabase
      .from('document_locks')
      .update({ is_active: false })
      .eq('document_id', documentId)
      .eq('field_name', fieldName)
      .eq('user_id', user.id);

    return !error;
  }

  async getDocumentLocks(documentId: string): Promise<DocumentLock[]> {
    const { data, error } = await supabase
      .from('document_locks')
      .select('*')
      .eq('document_id', documentId)
      .eq('is_active', true)
      .gt('expires_at', new Date().toISOString());

    if (error) {
      console.error('Failed to get locks:', error);
      return [];
    }

    return data.map(lock => ({
      id: lock.id,
      documentId: lock.document_id,
      userId: lock.user_id,
      fieldName: lock.field_name,
      lockedAt: lock.locked_at,
      expiresAt: lock.expires_at,
      isActive: lock.is_active,
    }));
  }

  // Collaborative Edit History
  async recordEdit(
    documentId: string,
    fieldName: string,
    previousValue: string | null,
    newValue: string | null,
    editType: string = 'update'
  ): Promise<CollaborativeEdit | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('collaborative_edits')
      .insert({
        document_id: documentId,
        user_id: user.id,
        field_name: fieldName,
        previous_value: previousValue,
        new_value: newValue,
        edit_type: editType,
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to record edit:', error);
      return null;
    }

    return {
      id: data.id,
      documentId: data.document_id,
      userId: data.user_id,
      fieldName: data.field_name,
      previousValue: data.previous_value,
      newValue: data.new_value,
      editType: data.edit_type,
      createdAt: data.created_at,
      isReverted: data.is_reverted || false,
      revertedBy: data.reverted_by,
      revertedAt: data.reverted_at,
    };
  }

  async getEditHistory(documentId: string, limit: number = 50): Promise<CollaborativeEdit[]> {
    const { data, error } = await supabase
      .from('collaborative_edits')
      .select('*')
      .eq('document_id', documentId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Failed to get edit history:', error);
      return [];
    }

    return data.map(edit => ({
      id: edit.id,
      documentId: edit.document_id,
      userId: edit.user_id,
      fieldName: edit.field_name,
      previousValue: edit.previous_value,
      newValue: edit.new_value,
      editType: edit.edit_type,
      createdAt: edit.created_at,
      isReverted: edit.is_reverted || false,
      revertedBy: edit.reverted_by,
      revertedAt: edit.reverted_at,
    }));
  }

  async revertEdit(editId: string): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { error } = await supabase
      .from('collaborative_edits')
      .update({
        is_reverted: true,
        reverted_by: user.id,
        reverted_at: new Date().toISOString(),
      })
      .eq('id', editId);

    return !error;
  }

  // Thread Branching
  async createBranch(
    parentThreadId: string,
    messageId: string,
    title: string,
    context: string,
    teamId: string,
    projectId: string
  ): Promise<string | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('shared_chat_threads')
      .insert({
        team_id: teamId,
        project_id: projectId,
        title,
        description: `Branch from: ${context.slice(0, 100)}...`,
        created_by: user.id,
        participant_ids: [user.id],
        parent_thread_id: parentThreadId,
        branch_point_message_id: messageId,
        branch_context: context,
      })
      .select('id')
      .single();

    if (error) {
      console.error('Failed to create branch:', error);
      return null;
    }

    return data.id;
  }

  async getThreadBranches(threadId: string): Promise<Array<{ id: string; title: string; createdAt: string }>> {
    const { data, error } = await supabase
      .from('shared_chat_threads')
      .select('id, title, created_at')
      .eq('parent_thread_id', threadId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to get branches:', error);
      return [];
    }

    return data.map(b => ({
      id: b.id,
      title: b.title,
      createdAt: b.created_at,
    }));
  }

  // AI Mentions in Annotations
  async createAnnotationWithMention(
    documentId: string,
    teamId: string | undefined,
    annotationType: 'highlight' | 'comment' | 'question' | 'critical' | 'action_item',
    content: string,
    selectedText: string | undefined,
    mentions: string[]
  ): Promise<string | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const insertData: {
      document_id: string;
      user_id: string;
      team_id?: string;
      annotation_type: 'highlight' | 'comment' | 'question' | 'critical' | 'action_item';
      content: string;
      selected_text?: string;
      mentions: string[];
    } = {
      document_id: documentId,
      user_id: user.id,
      annotation_type: annotationType,
      content,
      mentions,
    };

    if (teamId) {
      insertData.team_id = teamId;
    }

    if (selectedText) {
      insertData.selected_text = selectedText;
    }

    const { data, error } = await supabase
      .from('document_annotations')
      .insert(insertData)
      .select('id')
      .single();

    if (error) {
      console.error('Failed to create annotation:', error);
      return null;
    }

    return data.id;
  }

  // Log Team Activity
  async logActivity(
    teamId: string,
    action: string,
    resourceType: string,
    resourceId: string,
    resourceName: string | null,
    metadata: object = {}
  ): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from('team_activities')
      .insert([{
        team_id: teamId,
        user_id: user.id,
        action,
        resource_type: resourceType,
        resource_id: resourceId,
        resource_name: resourceName || undefined,
        metadata: JSON.parse(JSON.stringify(metadata)),
      }]);
  }
}

export const collaborationService = new CollaborationService();
