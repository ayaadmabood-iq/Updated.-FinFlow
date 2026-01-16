import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { dataSourceService, DataSource } from '@/services/dataSourceService';
import { toast } from '@/hooks/use-toast';

export function useDataSources(projectId: string) {
  return useQuery({
    queryKey: ['dataSources', projectId],
    queryFn: () => dataSourceService.getByProject(projectId),
    enabled: !!projectId,
  });
}

export function useAddFile(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (file: File) => dataSourceService.uploadFile(projectId, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dataSources', projectId] });
      toast({
        title: 'File uploaded',
        description: 'Your file has been uploaded successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Upload failed',
        description: error.message,
      });
    },
  });
}

export function useAddUrl(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ url, name }: { url: string; name?: string }) => 
      dataSourceService.addUrl(projectId, url, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dataSources', projectId] });
      toast({
        title: 'URL added',
        description: 'URL content is being fetched.',
      });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Failed to add URL',
        description: error.message,
      });
    },
  });
}

export function useAddText(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ name, content }: { name: string; content: string }) =>
      dataSourceService.addText(projectId, name, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dataSources', projectId] });
      toast({
        title: 'Text added',
        description: 'Your text has been saved successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Failed to add text',
        description: error.message,
      });
    },
  });
}

export function useBulkAddUrls(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (urls: string[]) => dataSourceService.bulkAddUrls(projectId, urls),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['dataSources', projectId] });
      toast({
        title: 'URLs imported',
        description: `Created ${result.summary.created} data sources from ${result.summary.total_requested} URLs.`,
      });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Bulk import failed',
        description: error.message,
      });
    },
  });
}

export function useDeleteDataSource(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => dataSourceService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dataSources', projectId] });
      toast({
        title: 'Source deleted',
        description: 'The data source has been removed.',
      });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Delete failed',
        description: error.message,
      });
    },
  });
}

export function useFetchUrlContent(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dataSourceId: string) => dataSourceService.fetchUrlContent(dataSourceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dataSources', projectId] });
      toast({
        title: 'Content fetched',
        description: 'URL content has been retrieved.',
      });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Fetch failed',
        description: error.message,
      });
    },
  });
}
