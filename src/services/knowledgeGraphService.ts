import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

// Database row types for mapping (compatible with Supabase Json type)
interface KnowledgeGraphNodeRow {
  id: string;
  project_id: string;
  entity_type: string;
  name: string;
  normalized_name: string | null;
  description: string | null;
  properties: Json | null;
  mention_count: number;
  confidence_score: number | string;
  source_document_ids: string[] | null;
  created_at: string;
  updated_at?: string;
}

interface KnowledgeGraphEdgeRow {
  id: string;
  project_id: string;
  source_node_id: string;
  target_node_id: string;
  relationship_type: string;
  weight: number | string;
  properties: Json | null;
  evidence_snippets: string[] | null;
  source_document_ids: string[] | null;
  is_ai_discovered: boolean;
  confidence_score: number | string;
  created_at: string;
}

interface KnowledgeGraphInsightRow {
  id: string;
  project_id: string;
  user_id: string;
  insight_type: string;
  title: string;
  description: string | null;
  involved_node_ids: string[] | null;
  involved_edge_ids: string[] | null;
  involved_document_ids: string[] | null;
  confidence_score: number | string;
  is_dismissed: boolean;
  is_confirmed: boolean;
  created_at: string;
}

/** Entity extraction job record */
interface ExtractionJobRow {
  id: string;
  project_id: string;
  document_id: string;
  user_id: string;
  status: string;
  entities_extracted: number;
  relationships_created: number;
  started_at: string;
  completed_at: string | null;
  error_message: string | null;
  created_at: string;
}
export interface KnowledgeGraphNode {
  id: string;
  projectId: string;
  entityType: string;
  name: string;
  normalizedName: string;
  description?: string;
  properties?: Record<string, unknown>;
  mentionCount: number;
  confidenceScore: number;
  sourceDocumentIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface KnowledgeGraphEdge {
  id: string;
  projectId: string;
  sourceNodeId: string;
  targetNodeId: string;
  relationshipType: string;
  weight: number;
  properties?: Record<string, unknown>;
  evidenceSnippets: string[];
  sourceDocumentIds: string[];
  isAiDiscovered: boolean;
  confidenceScore: number;
  createdAt: string;
}

export interface KnowledgeGraphInsight {
  id: string;
  projectId: string;
  userId: string;
  insightType: string;
  title: string;
  description: string;
  involvedNodeIds: string[];
  involvedEdgeIds: string[];
  involvedDocumentIds: string[];
  confidenceScore: number;
  isDismissed: boolean;
  isConfirmed: boolean;
  createdAt: string;
}

export interface GraphData {
  nodes: KnowledgeGraphNode[];
  edges: KnowledgeGraphEdge[];
  insights: KnowledgeGraphInsight[];
}

export interface GraphSearchResult {
  answer: string;
  graphContext: {
    entities: KnowledgeGraphNode[];
    neighbors: NeighborResult[];
    paths: PathResult[];
  };
  sources: Array<{
    id: string;
    name: string;
    summary?: string;
  }>;
}

export interface PathResult {
  pathNodes: PathNode[];
  pathEdges: PathEdge[];
  pathLength: number;
}

interface PathNode {
  id: string;
  name?: string;
  entity_type?: string;
  [key: string]: unknown;
}

interface PathEdge {
  id: string;
  relationship_type?: string;
  [key: string]: unknown;
}

interface NeighborResult {
  nodeId: string;
  nodeName: string;
  nodeType: string;
  edgeId: string;
  relationship: string;
  distance: number;
}

class KnowledgeGraphService {
  async getGraphData(projectId: string): Promise<GraphData> {
    const [nodesResult, edgesResult, insightsResult] = await Promise.all([
      supabase
        .from("knowledge_graph_nodes")
        .select("*")
        .eq("project_id", projectId)
        .order("mention_count", { ascending: false })
        .limit(500),
      supabase
        .from("knowledge_graph_edges")
        .select("*")
        .eq("project_id", projectId)
        .order("weight", { ascending: false })
        .limit(1000),
      supabase
        .from("knowledge_graph_insights")
        .select("*")
        .eq("project_id", projectId)
        .eq("is_dismissed", false)
        .order("created_at", { ascending: false })
        .limit(50),
    ]);

    if (nodesResult.error) throw nodesResult.error;
    if (edgesResult.error) throw edgesResult.error;

    return {
      nodes: (nodesResult.data || []).map(this.mapNode),
      edges: (edgesResult.data || []).map(this.mapEdge),
      insights: (insightsResult.data || []).map(this.mapInsight),
    };
  }

  async extractEntities(projectId: string, documentId?: string): Promise<{
    jobId: string;
    entitiesExtracted: number;
    relationshipsCreated: number;
  }> {
    const { data, error } = await supabase.functions.invoke("extract-entities", {
      body: { projectId, documentId },
    });

    if (error) throw error;
    return data;
  }

  async discoverConnections(projectId: string): Promise<{
    insightsDiscovered: number;
    insights: KnowledgeGraphInsight[];
  }> {
    const { data, error } = await supabase.functions.invoke("discover-connections", {
      body: { projectId },
    });

    if (error) throw error;
    return {
      insightsDiscovered: data.insightsDiscovered,
      insights: (data.insights || []).map(this.mapInsight),
    };
  }

  async graphSearch(
    projectId: string,
    query: string,
    options?: { useGraphContext?: boolean; maxNeighborDepth?: number }
  ): Promise<GraphSearchResult> {
    const { data, error } = await supabase.functions.invoke("graph-search", {
      body: { projectId, query, ...options },
    });

    if (error) throw error;
    return data;
  }

  async findPath(
    projectId: string,
    startNodeId: string,
    endNodeId: string,
    maxDepth = 5
  ): Promise<PathResult | null> {
    // BFS path finding using edges table
    const visited = new Set<string>();
    const queue: Array<{ nodeId: string; path: string[]; edges: string[] }> = [
      { nodeId: startNodeId, path: [startNodeId], edges: [] }
    ];

    while (queue.length > 0 && queue[0].path.length <= maxDepth) {
      const current = queue.shift()!;
      
      if (current.nodeId === endNodeId) {
        // Fetch node details
        const { data: nodes } = await supabase
          .from('knowledge_graph_nodes')
          .select('*')
          .in('id', current.path);

        const { data: edges } = await supabase
          .from('knowledge_graph_edges')
          .select('*')
          .in('id', current.edges);

        return {
          pathNodes: nodes || [],
          pathEdges: edges || [],
          pathLength: current.path.length - 1,
        };
      }

      if (visited.has(current.nodeId)) continue;
      visited.add(current.nodeId);

      // Get neighbors
      const { data: outEdges } = await supabase
        .from('knowledge_graph_edges')
        .select('id, target_node_id')
        .eq('source_node_id', current.nodeId);

      for (const edge of outEdges || []) {
        if (!visited.has(edge.target_node_id)) {
          queue.push({
            nodeId: edge.target_node_id,
            path: [...current.path, edge.target_node_id],
            edges: [...current.edges, edge.id],
          });
        }
      }
    }

    return null;
  }

  async getNodeNeighbors(
    nodeId: string,
    depth = 1
  ): Promise<Array<{
    nodeId: string;
    nodeName: string;
    nodeType: string;
    edgeId: string;
    relationship: string;
    distance: number;
  }>> {
    const results: Array<{
      nodeId: string;
      nodeName: string;
      nodeType: string;
      edgeId: string;
      relationship: string;
      distance: number;
    }> = [];

    const visited = new Set<string>();
    let currentLevel = [nodeId];

    for (let d = 1; d <= depth; d++) {
      const nextLevel: string[] = [];

      for (const currentNodeId of currentLevel) {
        // Get outgoing edges
        const { data: edges } = await supabase
          .from('knowledge_graph_edges')
          .select(`
            id,
            relationship_type,
            target_node_id,
            knowledge_graph_nodes!knowledge_graph_edges_target_node_id_fkey (
              id,
              name,
              entity_type
            )
          `)
          .eq('source_node_id', currentNodeId);

        for (const edge of edges || []) {
          const targetNode = edge.knowledge_graph_nodes as any;
          if (targetNode && !visited.has(edge.target_node_id)) {
            visited.add(edge.target_node_id);
            nextLevel.push(edge.target_node_id);
            results.push({
              nodeId: targetNode.id,
              nodeName: targetNode.name,
              nodeType: targetNode.entity_type,
              edgeId: edge.id,
              relationship: edge.relationship_type,
              distance: d,
            });
          }
        }
      }

      currentLevel = nextLevel;
    }

    return results;
  }

  async dismissInsight(insightId: string): Promise<void> {
    const { error } = await supabase
      .from("knowledge_graph_insights")
      .update({ is_dismissed: true })
      .eq("id", insightId);

    if (error) throw error;
  }

  async confirmInsight(insightId: string): Promise<void> {
    const { error } = await supabase
      .from("knowledge_graph_insights")
      .update({ is_confirmed: true })
      .eq("id", insightId);

    if (error) throw error;
  }

  async getExtractionJobs(projectId: string): Promise<ExtractionJobRow[]> {
    const { data, error } = await supabase
      .from("entity_extraction_jobs")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) throw error;
    return (data || []) as ExtractionJobRow[];
  }

  private mapNode(row: KnowledgeGraphNodeRow): KnowledgeGraphNode {
    // Convert Json to Record<string, unknown> safely
    const properties = row.properties && typeof row.properties === 'object' && !Array.isArray(row.properties)
      ? (row.properties as Record<string, unknown>)
      : undefined;
    
    return {
      id: row.id,
      projectId: row.project_id,
      entityType: row.entity_type,
      name: row.name,
      normalizedName: row.normalized_name || '',
      description: row.description,
      properties,
      mentionCount: row.mention_count,
      confidenceScore: Number(row.confidence_score),
      sourceDocumentIds: row.source_document_ids || [],
      createdAt: row.created_at,
      updatedAt: row.updated_at || row.created_at,
    };
  }

  private mapEdge(row: KnowledgeGraphEdgeRow): KnowledgeGraphEdge {
    // Convert Json to Record<string, unknown> safely
    const properties = row.properties && typeof row.properties === 'object' && !Array.isArray(row.properties)
      ? (row.properties as Record<string, unknown>)
      : undefined;
    
    return {
      id: row.id,
      projectId: row.project_id,
      sourceNodeId: row.source_node_id,
      targetNodeId: row.target_node_id,
      relationshipType: row.relationship_type,
      weight: Number(row.weight),
      properties,
      evidenceSnippets: row.evidence_snippets || [],
      sourceDocumentIds: row.source_document_ids || [],
      isAiDiscovered: row.is_ai_discovered,
      confidenceScore: Number(row.confidence_score),
      createdAt: row.created_at,
    };
  }

  private mapInsight(row: KnowledgeGraphInsightRow): KnowledgeGraphInsight {
    return {
      id: row.id,
      projectId: row.project_id,
      userId: row.user_id,
      insightType: row.insight_type,
      title: row.title,
      description: row.description || '',
      involvedNodeIds: row.involved_node_ids || [],
      involvedEdgeIds: row.involved_edge_ids || [],
      involvedDocumentIds: row.involved_document_ids || [],
      confidenceScore: Number(row.confidence_score),
      isDismissed: row.is_dismissed,
      isConfirmed: row.is_confirmed,
      createdAt: row.created_at,
    };
  }
}

export const knowledgeGraphService = new KnowledgeGraphService();
