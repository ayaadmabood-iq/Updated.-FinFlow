/**
 * @fileoverview React hooks for document data management.
 * 
 * This module provides React Query-based hooks for fetching, uploading,
 * updating, and deleting documents. All hooks include automatic cache
 * management and toast notifications for user feedback.
 * 
 * @module hooks/useDocuments
 * @version 1.0.0
 * 
 * @example
 * ```tsx
 * import { useDocuments, useUploadDocument } from '@/hooks/useDocuments';
 * 
 * function DocumentList({ projectId }: { projectId: string }) {
 *   const { data: docs, isLoading } = useDocuments(projectId);
 *   const uploadDoc = useUploadDocument(projectId);
 * 
 *   if (isLoading) return <Loading />;
 *   
 *   return (
 *     <div>
 *       {docs?.data.map(doc => (
 *         <DocumentCard key={doc.id} document={doc} />
 *       ))}
 *       <FileUploader onUpload={(file) => uploadDoc.mutate({ file })} />
 *     </div>
 *   );
 * }
 * ```
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { documentService } from '@/services/documentService';
import type { Document, UpdateDocumentInput } from '@/types';
import { toast } from 'sonner';

/**
 * Fetches a paginated list of documents for a project.
 * 
 * The query is automatically disabled when no projectId is provided.
 * 
 * @function useDocuments
 * @param {string} projectId - The UUID of the project
 * @param {number} [page=1] - Page number (1-indexed)
 * @param {number} [pageSize=50] - Number of documents per page
 * @returns {UseQueryResult<PaginatedResponse<Document>>} Query result containing documents
 * 
 * @example
 * ```tsx
 * function DocumentGrid({ projectId }: { projectId: string }) {
 *   const [page, setPage] = useState(1);
 *   const { data, isLoading, error } = useDocuments(projectId, page, 20);
 * 
 *   if (isLoading) return <DocumentSkeleton />;
 *   if (error) return <ErrorMessage error={error} />;
 * 
 *   return (
 *     <>
 *       <div className="grid grid-cols-3 gap-4">
 *         {data?.data.map(doc => (
 *           <DocumentCard key={doc.id} document={doc} />
 *         ))}
 *       </div>
 *       <Pagination 
 *         page={page} 
 *         totalPages={data?.totalPages} 
 *         onPageChange={setPage}
 *       />
 *     </>
 *   );
 * }
 * ```
 */
export function useDocuments(projectId: string, page = 1, pageSize = 50) {
  return useQuery({
    queryKey: ['documents', projectId, page, pageSize],
    queryFn: () => documentService.getDocuments(projectId, page, pageSize),
    enabled: !!projectId,
  });
}

/**
 * Fetches a single document by its ID.
 * 
 * The query is automatically disabled when no id is provided.
 * 
 * @function useDocument
 * @param {string} id - The UUID of the document to fetch
 * @returns {UseQueryResult<Document>} Query result containing the document
 * 
 * @example
 * ```tsx
 * function DocumentViewer({ documentId }: { documentId: string }) {
 *   const { data: document, isLoading, error } = useDocument(documentId);
 * 
 *   if (isLoading) return <DocumentSkeleton />;
 *   if (error) return <ErrorMessage error={error} />;
 *   if (!document) return <NotFound />;
 * 
 *   return (
 *     <div>
 *       <h1>{document.name}</h1>
 *       <DocumentStatus status={document.status} />
 *       <DocumentContent content={document.extractedText} />
 *     </div>
 *   );
 * }
 * ```
 */
export function useDocument(id: string) {
  return useQuery({
    queryKey: ['document', id],
    queryFn: () => documentService.getDocument(id),
    enabled: !!id,
  });
}

/**
 * Mutation hook for uploading a document to a project.
 * 
 * Automatically invalidates the documents and projects cache on success.
 * Shows toast notifications for success and error states.
 * 
 * @function useUploadDocument
 * @param {string} projectId - The UUID of the project to upload to
 * @returns {UseMutationResult<Document, Error, { file: File; name?: string }>} Mutation result
 * 
 * @example
 * ```tsx
 * function FileUploadButton({ projectId }: { projectId: string }) {
 *   const uploadDocument = useUploadDocument(projectId);
 *   const fileInputRef = useRef<HTMLInputElement>(null);
 * 
 *   const handleFileSelect = (event: ChangeEvent<HTMLInputElement>) => {
 *     const file = event.target.files?.[0];
 *     if (file) {
 *       uploadDocument.mutate({ file, name: file.name });
 *     }
 *   };
 * 
 *   return (
 *     <>
 *       <input 
 *         ref={fileInputRef}
 *         type="file" 
 *         onChange={handleFileSelect}
 *         className="hidden"
 *         accept=".pdf,.doc,.docx,.txt"
 *       />
 *       <button 
 *         onClick={() => fileInputRef.current?.click()}
 *         disabled={uploadDocument.isPending}
 *       >
 *         {uploadDocument.isPending ? 'Uploading...' : 'Upload Document'}
 *       </button>
 *       {uploadDocument.isPending && (
 *         <ProgressBar progress={uploadDocument.progress} />
 *       )}
 *     </>
 *   );
 * }
 * ```
 */
export function useUploadDocument(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ file, name }: { file: File; name?: string }) =>
      documentService.uploadFile(projectId, file, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents', projectId] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Document uploaded successfully');
    },
    onError: (error: Error) => {
      toast.error(`Upload failed: ${error.message}`);
    },
  });
}

/**
 * Mutation hook for updating an existing document.
 * 
 * Automatically invalidates the relevant caches on success.
 * Shows toast notifications for success and error states.
 * 
 * @function useUpdateDocument
 * @returns {UseMutationResult<Document, Error, { id: string; input: UpdateDocumentInput }>} Mutation result
 * 
 * @example
 * ```tsx
 * function DocumentRenameForm({ document }: { document: Document }) {
 *   const updateDocument = useUpdateDocument();
 *   const [name, setName] = useState(document.name);
 * 
 *   const handleSubmit = (e: FormEvent) => {
 *     e.preventDefault();
 *     updateDocument.mutate({
 *       id: document.id,
 *       input: { name },
 *     });
 *   };
 * 
 *   return (
 *     <form onSubmit={handleSubmit}>
 *       <input 
 *         value={name} 
 *         onChange={(e) => setName(e.target.value)}
 *         placeholder="Document name"
 *       />
 *       <button type="submit" disabled={updateDocument.isPending}>
 *         {updateDocument.isPending ? 'Saving...' : 'Save'}
 *       </button>
 *     </form>
 *   );
 * }
 * ```
 */
export function useUpdateDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateDocumentInput }) =>
      documentService.updateDocument(id, input),
    onSuccess: (document: Document) => {
      queryClient.invalidateQueries({ queryKey: ['documents', document.projectId] });
      queryClient.invalidateQueries({ queryKey: ['document', document.id] });
      toast.success('Document updated');
    },
    onError: (error: Error) => {
      toast.error(`Update failed: ${error.message}`);
    },
  });
}

/**
 * Mutation hook for deleting a document.
 * 
 * Performs a soft delete and invalidates relevant caches.
 * Shows toast notifications for success and error states.
 * 
 * @function useDeleteDocument
 * @returns {UseMutationResult<void, Error, string>} Mutation result
 * 
 * @example
 * ```tsx
 * function DeleteDocumentButton({ documentId }: { documentId: string }) {
 *   const deleteDocument = useDeleteDocument();
 * 
 *   const handleDelete = () => {
 *     if (confirm('Are you sure you want to delete this document?')) {
 *       deleteDocument.mutate(documentId);
 *     }
 *   };
 * 
 *   return (
 *     <button 
 *       onClick={handleDelete}
 *       disabled={deleteDocument.isPending}
 *       className="text-destructive"
 *     >
 *       {deleteDocument.isPending ? 'Deleting...' : 'Delete'}
 *     </button>
 *   );
 * }
 * ```
 */
export function useDeleteDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => documentService.deleteDocument(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Document deleted');
    },
    onError: (error: Error) => {
      toast.error(`Delete failed: ${error.message}`);
    },
  });
}

/**
 * Query hook for fetching a signed download URL for a document.
 * 
 * This hook is configured for manual fetching only (enabled: false).
 * The URL is cached for 4 minutes (expires after 5).
 * 
 * @function useDownloadUrl
 * @param {string} id - The UUID of the document
 * @returns {UseQueryResult<SignedUrlResponse>} Query result with refetch function
 * 
 * @example
 * ```tsx
 * function DownloadButton({ documentId }: { documentId: string }) {
 *   const { refetch, isFetching } = useDownloadUrl(documentId);
 * 
 *   const handleDownload = async () => {
 *     const result = await refetch();
 *     if (result.data) {
 *       window.open(result.data.url, '_blank');
 *     }
 *   };
 * 
 *   return (
 *     <button onClick={handleDownload} disabled={isFetching}>
 *       {isFetching ? 'Preparing...' : 'Download'}
 *     </button>
 *   );
 * }
 * ```
 */
export function useDownloadUrl(id: string) {
  return useQuery({
    queryKey: ['document-download', id],
    queryFn: () => documentService.getDownloadUrl(id),
    enabled: false, // Manual fetch only
    staleTime: 4 * 60 * 1000, // 4 minutes (URL expires in 5)
  });
}

/**
 * Query hook for fetching a document preview.
 * 
 * Returns preview data including thumbnails or extracted content
 * suitable for display. Cached for 4 minutes.
 * 
 * @function useDocumentPreview
 * @param {string} id - The UUID of the document
 * @returns {UseQueryResult<DocumentPreview>} Query result containing preview data
 * 
 * @example
 * ```tsx
 * function DocumentPreviewCard({ documentId }: { documentId: string }) {
 *   const { data: preview, isLoading, error } = useDocumentPreview(documentId);
 * 
 *   if (isLoading) return <PreviewSkeleton />;
 *   if (error) return <PreviewError />;
 * 
 *   return (
 *     <div className="preview-card">
 *       {preview?.thumbnailUrl && (
 *         <img src={preview.thumbnailUrl} alt="Document preview" />
 *       )}
 *       <p className="preview-text">{preview?.textPreview}</p>
 *     </div>
 *   );
 * }
 * ```
 */
export function useDocumentPreview(id: string) {
  return useQuery({
    queryKey: ['document-preview', id],
    queryFn: () => documentService.getPreview(id),
    enabled: !!id,
    staleTime: 4 * 60 * 1000,
  });
}
