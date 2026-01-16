import { useEffect, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { logger } from '@/lib/logger';

const STALE_PROCESSING_THRESHOLD_MS = 30 * 60 * 1000; // 30 minutes
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // Check every 5 minutes

export interface StaleDocument {
  id: string;
  name: string;
  status: string;
  updated_at: string;
  staleDuration: number;
}

export interface UseStaleDataCleanupReturn {
  checkForStaleData: () => Promise<StaleDocument[]>;
  markDocumentFailed: (documentId: string, reason: string) => Promise<void>;
  isChecking: boolean;
  staleDocuments: StaleDocument[];
}

export function useStaleDataCleanup(projectId?: string): UseStaleDataCleanupReturn {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const staleDocsRef = useRef<StaleDocument[]>([]);
  const isCheckingRef = useRef(false);
  
  const checkForStaleData = useCallback(async (): Promise<StaleDocument[]> => {
    if (!user?.id || isCheckingRef.current) return [];
    
    isCheckingRef.current = true;
    
    try {
      const thresholdDate = new Date(Date.now() - STALE_PROCESSING_THRESHOLD_MS).toISOString();
      
      let query = supabase
        .from('documents')
        .select('id, name, status, updated_at, project_id')
        .eq('owner_id', user.id)
        .eq('status', 'processing')
        .lt('updated_at', thresholdDate)
        .is('deleted_at', null);
      
      if (projectId) {
        query = query.eq('project_id', projectId);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('[StaleDataCleanup] Error checking for stale documents:', error);
        return [];
      }
      
      const staleDocuments: StaleDocument[] = (data || []).map(doc => ({
        id: doc.id,
        name: doc.name,
        status: doc.status,
        updated_at: doc.updated_at,
        staleDuration: Date.now() - new Date(doc.updated_at).getTime(),
      }));
      
      staleDocsRef.current = staleDocuments;

      if (staleDocuments.length > 0) {
        logger.info(`Found ${staleDocuments.length} stale documents`, {
          count: staleDocuments.length,
          component: 'StaleDataCleanup',
          projectId
        });
      }

      return staleDocuments;
    } finally {
      isCheckingRef.current = false;
    }
  }, [user?.id, projectId]);
  
  const markDocumentFailed = useCallback(async (
    documentId: string, 
    reason: string
  ): Promise<void> => {
    const { error } = await supabase
      .from('documents')
      .update({
        status: 'error',
        error_message: reason,
        updated_at: new Date().toISOString(),
      })
      .eq('id', documentId);
    
    if (error) {
      console.error('[StaleDataCleanup] Error marking document as failed:', error);
      throw error;
    }
    
    // Invalidate document queries
    queryClient.invalidateQueries({ queryKey: ['documents'] });
    queryClient.invalidateQueries({ queryKey: ['document', documentId] });

    logger.info(`Marked document ${documentId} as failed`, {
      documentId,
      reason,
      component: 'StaleDataCleanup'
    });
  }, [queryClient]);
  
  // Auto-cleanup stale documents
  useEffect(() => {
    if (!user?.id) return;
    
    const performCleanup = async () => {
      const staleDocuments = await checkForStaleData();
      
      // Auto-mark as failed after threshold
      for (const doc of staleDocuments) {
        if (doc.staleDuration > STALE_PROCESSING_THRESHOLD_MS) {
          await markDocumentFailed(
            doc.id, 
            `Processing timed out after ${Math.round(doc.staleDuration / 60000)} minutes. The operation may have failed silently.`
          );
        }
      }
    };
    
    // Initial check
    performCleanup();
    
    // Periodic checks
    const interval = setInterval(performCleanup, CLEANUP_INTERVAL_MS);
    
    return () => clearInterval(interval);
  }, [user?.id, checkForStaleData, markDocumentFailed]);
  
  return {
    checkForStaleData,
    markDocumentFailed,
    isChecking: isCheckingRef.current,
    staleDocuments: staleDocsRef.current,
  };
}
