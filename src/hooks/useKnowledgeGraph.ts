import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { knowledgeGraphService, GraphData, GraphSearchResult, PathResult } from "@/services/knowledgeGraphService";
import { toast } from "sonner";

export function useKnowledgeGraph(projectId: string | undefined) {
  const queryClient = useQueryClient();

  const graphDataQuery = useQuery<GraphData>({
    queryKey: ["knowledge-graph", projectId],
    queryFn: () => knowledgeGraphService.getGraphData(projectId!),
    enabled: !!projectId,
    staleTime: 60000, // 1 minute
  });

  const extractionJobsQuery = useQuery({
    queryKey: ["extraction-jobs", projectId],
    queryFn: () => knowledgeGraphService.getExtractionJobs(projectId!),
    enabled: !!projectId,
  });

  const extractEntitiesMutation = useMutation({
    mutationFn: ({ documentId }: { documentId?: string }) =>
      knowledgeGraphService.extractEntities(projectId!, documentId),
    onSuccess: (data) => {
      toast.success(`Extracted ${data.entitiesExtracted} entities and ${data.relationshipsCreated} relationships`);
      queryClient.invalidateQueries({ queryKey: ["knowledge-graph", projectId] });
      queryClient.invalidateQueries({ queryKey: ["extraction-jobs", projectId] });
    },
    onError: (error: Error) => {
      toast.error(`Extraction failed: ${error.message}`);
    },
  });

  const discoverConnectionsMutation = useMutation({
    mutationFn: () => knowledgeGraphService.discoverConnections(projectId!),
    onSuccess: (data) => {
      toast.success(`Discovered ${data.insightsDiscovered} new insights`);
      queryClient.invalidateQueries({ queryKey: ["knowledge-graph", projectId] });
    },
    onError: (error: Error) => {
      toast.error(`Discovery failed: ${error.message}`);
    },
  });

  const graphSearchMutation = useMutation<GraphSearchResult, Error, { query: string; useGraphContext?: boolean }>({
    mutationFn: ({ query, useGraphContext }) =>
      knowledgeGraphService.graphSearch(projectId!, query, { useGraphContext }),
    onError: (error) => {
      toast.error(`Search failed: ${error.message}`);
    },
  });

  const findPathMutation = useMutation<PathResult | null, Error, { startNodeId: string; endNodeId: string }>({
    mutationFn: ({ startNodeId, endNodeId }) =>
      knowledgeGraphService.findPath(projectId!, startNodeId, endNodeId),
  });

  const dismissInsightMutation = useMutation({
    mutationFn: (insightId: string) => knowledgeGraphService.dismissInsight(insightId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["knowledge-graph", projectId] });
    },
  });

  const confirmInsightMutation = useMutation({
    mutationFn: (insightId: string) => knowledgeGraphService.confirmInsight(insightId),
    onSuccess: () => {
      toast.success("Insight confirmed");
      queryClient.invalidateQueries({ queryKey: ["knowledge-graph", projectId] });
    },
  });

  return {
    // Data
    graphData: graphDataQuery.data,
    isLoading: graphDataQuery.isLoading,
    error: graphDataQuery.error,
    extractionJobs: extractionJobsQuery.data,

    // Mutations
    extractEntities: extractEntitiesMutation.mutate,
    isExtracting: extractEntitiesMutation.isPending,

    discoverConnections: discoverConnectionsMutation.mutate,
    isDiscovering: discoverConnectionsMutation.isPending,

    graphSearch: graphSearchMutation.mutateAsync,
    searchResult: graphSearchMutation.data,
    isSearching: graphSearchMutation.isPending,

    findPath: findPathMutation.mutateAsync,
    isFindingPath: findPathMutation.isPending,

    dismissInsight: dismissInsightMutation.mutate,
    confirmInsight: confirmInsightMutation.mutate,

    // Refresh
    refetch: graphDataQuery.refetch,
  };
}
