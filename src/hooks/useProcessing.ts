import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { processingService } from '@/services/processingService';
import { toast } from 'sonner';
import { PipelineStage } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { getHumanReadableError } from '@/components/errors/HumanReadableError';
import { useCallback, useRef, useState } from 'react';

// Operation lock to prevent double-triggers
let processingLock = new Set<string>();

export function useProcessDocument() {
  const queryClient = useQueryClient();
  const [lockedDocuments, setLockedDocuments] = useState<Set<string>>(new Set());

  const processDocument = useMutation({
    mutationFn: async ({ documentId, resumeFrom }: { documentId: string; resumeFrom?: PipelineStage }) => {
      // Double-trigger protection
      if (processingLock.has(documentId)) {
        throw new Error('Processing already in progress for this document');
      }
      
      processingLock.add(documentId);
      setLockedDocuments(prev => new Set([...prev, documentId]));
      
      try {
        // If resumeFrom is provided, call with that parameter
        if (resumeFrom) {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) throw new Error('Not authenticated');
          
          const { data, error } = await supabase.functions.invoke('process-document', {
            body: { documentId, resumeFrom },
          });
          
          if (error) throw error;
          return data;
        }
        
        return processingService.processDocument(documentId);
      } finally {
        processingLock.delete(documentId);
        setLockedDocuments(prev => {
          const next = new Set(prev);
          next.delete(documentId);
          return next;
        });
      }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['document', result.documentId] });
      queryClient.invalidateQueries({ queryKey: ['chunks', result.documentId] });
      
      if (result.success) {
        toast.success(`Document processed: ${result.chunkCount} chunks created`);
      } else {
        const errorInfo = getHumanReadableError(result.error || 'Unknown error');
        toast.error(errorInfo.title, {
          description: errorInfo.description,
        });
      }
    },
    onError: (error: Error) => {
      const errorInfo = getHumanReadableError(error.message);
      toast.error(errorInfo.title, {
        description: errorInfo.description,
      });
    },
  });

  // Wrapper to prevent double-clicks
  const processWithLock = useCallback(async (documentId: string, resumeFrom?: PipelineStage) => {
    if (lockedDocuments.has(documentId)) {
      toast.info('Please wait', {
        description: 'This document is already being processed.',
      });
      return;
    }
    
    return processDocument.mutateAsync({ documentId, resumeFrom });
  }, [processDocument, lockedDocuments]);

  return {
    processDocument: processWithLock,
    isProcessing: processDocument.isPending,
    isLocked: (documentId: string) => lockedDocuments.has(documentId),
  };
}

export function useResumeDocument() {
  const { processDocument, isProcessing, isLocked } = useProcessDocument();
  
  const resumeFromStage = useCallback(async (documentId: string, stage: PipelineStage) => {
    return processDocument(documentId, stage);
  }, [processDocument]);
  
  return {
    resumeFromStage,
    isResuming: isProcessing,
    isLocked,
  };
}

export function useChunks(documentId: string, page = 1, pageSize = 20) {
  return useQuery({
    queryKey: ['chunks', documentId, page, pageSize],
    queryFn: () => processingService.getChunks(documentId, page, pageSize),
    enabled: !!documentId,
  });
}

export function useDocumentWithProcessing(id: string) {
  return useQuery({
    queryKey: ['document-processing', id],
    queryFn: () => processingService.getDocumentWithProcessing(id),
    enabled: !!id,
  });
}
