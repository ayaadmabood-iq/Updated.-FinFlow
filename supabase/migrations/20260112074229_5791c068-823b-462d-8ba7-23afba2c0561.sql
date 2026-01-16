-- =============================================================================
-- Task 7.2: Knowledge Graph Tables
-- =============================================================================

-- Entity types enum
CREATE TYPE entity_type AS ENUM (
  'person',
  'organization', 
  'location',
  'date',
  'concept',
  'document',
  'event',
  'product',
  'money',
  'law',
  'other'
);

-- Relationship types enum
CREATE TYPE relationship_type AS ENUM (
  'mentioned_in',
  'related_to',
  'contradicts',
  'supports',
  'references',
  'authored_by',
  'owned_by',
  'located_in',
  'occurred_on',
  'involves',
  'similar_to',
  'part_of',
  'preceded_by',
  'followed_by'
);

-- Knowledge Graph Nodes (Entities)
CREATE TABLE public.knowledge_graph_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  entity_type entity_type NOT NULL,
  name TEXT NOT NULL,
  normalized_name TEXT NOT NULL,
  description TEXT,
  properties JSONB DEFAULT '{}',
  embedding vector(1536),
  mention_count INTEGER DEFAULT 1,
  confidence_score NUMERIC(4,3) DEFAULT 1.0,
  first_seen_at TIMESTAMPTZ DEFAULT now(),
  last_seen_at TIMESTAMPTZ DEFAULT now(),
  source_document_ids UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(project_id, entity_type, normalized_name)
);

-- Knowledge Graph Edges (Relationships)
CREATE TABLE public.knowledge_graph_edges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  source_node_id UUID NOT NULL REFERENCES public.knowledge_graph_nodes(id) ON DELETE CASCADE,
  target_node_id UUID NOT NULL REFERENCES public.knowledge_graph_nodes(id) ON DELETE CASCADE,
  relationship_type relationship_type NOT NULL,
  weight NUMERIC(4,3) DEFAULT 1.0,
  properties JSONB DEFAULT '{}',
  evidence_snippets TEXT[] DEFAULT '{}',
  source_document_ids UUID[] DEFAULT '{}',
  is_ai_discovered BOOLEAN DEFAULT false,
  confidence_score NUMERIC(4,3) DEFAULT 1.0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(project_id, source_node_id, target_node_id, relationship_type)
);

-- Hidden Connections (AI-discovered insights)
CREATE TABLE public.knowledge_graph_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  insight_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  involved_node_ids UUID[] DEFAULT '{}',
  involved_edge_ids UUID[] DEFAULT '{}',
  involved_document_ids UUID[] DEFAULT '{}',
  confidence_score NUMERIC(4,3) DEFAULT 0.8,
  is_dismissed BOOLEAN DEFAULT false,
  is_confirmed BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Entity extraction jobs tracking
CREATE TABLE public.entity_extraction_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL,
  user_id UUID NOT NULL,
  status TEXT DEFAULT 'pending',
  entities_extracted INTEGER DEFAULT 0,
  relationships_created INTEGER DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.knowledge_graph_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_graph_edges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_graph_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entity_extraction_jobs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for knowledge_graph_nodes (project owner or team member)
CREATE POLICY "Users can view nodes in their projects"
  ON public.knowledge_graph_nodes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p 
      WHERE p.id = knowledge_graph_nodes.project_id 
      AND p.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.project_shares ps 
      JOIN public.team_members tm ON tm.team_id = ps.team_id
      WHERE ps.project_id = knowledge_graph_nodes.project_id 
      AND tm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert nodes in their projects"
  ON public.knowledge_graph_nodes FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects p 
      WHERE p.id = knowledge_graph_nodes.project_id 
      AND p.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can update nodes in their projects"
  ON public.knowledge_graph_nodes FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p 
      WHERE p.id = knowledge_graph_nodes.project_id 
      AND p.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete nodes in their projects"
  ON public.knowledge_graph_nodes FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p 
      WHERE p.id = knowledge_graph_nodes.project_id 
      AND p.owner_id = auth.uid()
    )
  );

-- RLS Policies for knowledge_graph_edges
CREATE POLICY "Users can view edges in their projects"
  ON public.knowledge_graph_edges FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p 
      WHERE p.id = knowledge_graph_edges.project_id 
      AND p.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.project_shares ps 
      JOIN public.team_members tm ON tm.team_id = ps.team_id
      WHERE ps.project_id = knowledge_graph_edges.project_id 
      AND tm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert edges in their projects"
  ON public.knowledge_graph_edges FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects p 
      WHERE p.id = knowledge_graph_edges.project_id 
      AND p.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can update edges in their projects"
  ON public.knowledge_graph_edges FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p 
      WHERE p.id = knowledge_graph_edges.project_id 
      AND p.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete edges in their projects"
  ON public.knowledge_graph_edges FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p 
      WHERE p.id = knowledge_graph_edges.project_id 
      AND p.owner_id = auth.uid()
    )
  );

-- RLS Policies for knowledge_graph_insights
CREATE POLICY "Users can view insights in their projects"
  ON public.knowledge_graph_insights FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p 
      WHERE p.id = knowledge_graph_insights.project_id 
      AND p.owner_id = auth.uid()
    )
    OR user_id = auth.uid()
  );

CREATE POLICY "Users can insert insights"
  ON public.knowledge_graph_insights FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their insights"
  ON public.knowledge_graph_insights FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their insights"
  ON public.knowledge_graph_insights FOR DELETE
  USING (user_id = auth.uid());

-- RLS Policies for entity_extraction_jobs
CREATE POLICY "Users can view their extraction jobs"
  ON public.entity_extraction_jobs FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert extraction jobs"
  ON public.entity_extraction_jobs FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their extraction jobs"
  ON public.entity_extraction_jobs FOR UPDATE
  USING (user_id = auth.uid());

-- Indexes for performance
CREATE INDEX idx_kg_nodes_project ON public.knowledge_graph_nodes(project_id);
CREATE INDEX idx_kg_nodes_type ON public.knowledge_graph_nodes(entity_type);
CREATE INDEX idx_kg_nodes_normalized ON public.knowledge_graph_nodes(normalized_name);
CREATE INDEX idx_kg_nodes_embedding ON public.knowledge_graph_nodes USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

CREATE INDEX idx_kg_edges_project ON public.knowledge_graph_edges(project_id);
CREATE INDEX idx_kg_edges_source ON public.knowledge_graph_edges(source_node_id);
CREATE INDEX idx_kg_edges_target ON public.knowledge_graph_edges(target_node_id);
CREATE INDEX idx_kg_edges_type ON public.knowledge_graph_edges(relationship_type);

CREATE INDEX idx_kg_insights_project ON public.knowledge_graph_insights(project_id);
CREATE INDEX idx_kg_insights_user ON public.knowledge_graph_insights(user_id);

CREATE INDEX idx_extraction_jobs_project ON public.entity_extraction_jobs(project_id);
CREATE INDEX idx_extraction_jobs_status ON public.entity_extraction_jobs(status);

-- Triggers for updated_at
CREATE TRIGGER update_kg_nodes_updated_at
  BEFORE UPDATE ON public.knowledge_graph_nodes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_kg_edges_updated_at
  BEFORE UPDATE ON public.knowledge_graph_edges
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_kg_insights_updated_at
  BEFORE UPDATE ON public.knowledge_graph_insights
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to find shortest path between two nodes
CREATE OR REPLACE FUNCTION public.find_graph_path(
  p_project_id UUID,
  p_start_node_id UUID,
  p_end_node_id UUID,
  p_max_depth INTEGER DEFAULT 5
)
RETURNS TABLE(
  path_nodes UUID[],
  path_edges UUID[],
  path_length INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE path_search AS (
    SELECT 
      ARRAY[p_start_node_id] AS nodes,
      ARRAY[]::UUID[] AS edges,
      1 AS depth,
      p_start_node_id AS current_node
    
    UNION ALL
    
    SELECT 
      ps.nodes || e.target_node_id,
      ps.edges || e.id,
      ps.depth + 1,
      e.target_node_id
    FROM path_search ps
    JOIN knowledge_graph_edges e ON e.source_node_id = ps.current_node
    WHERE ps.depth < p_max_depth
      AND e.project_id = p_project_id
      AND NOT (e.target_node_id = ANY(ps.nodes))
    
    UNION ALL
    
    SELECT 
      ps.nodes || e.source_node_id,
      ps.edges || e.id,
      ps.depth + 1,
      e.source_node_id
    FROM path_search ps
    JOIN knowledge_graph_edges e ON e.target_node_id = ps.current_node
    WHERE ps.depth < p_max_depth
      AND e.project_id = p_project_id
      AND NOT (e.source_node_id = ANY(ps.nodes))
  )
  SELECT 
    ps.nodes AS path_nodes,
    ps.edges AS path_edges,
    ps.depth AS path_length
  FROM path_search ps
  WHERE ps.current_node = p_end_node_id
  ORDER BY ps.depth
  LIMIT 1;
END;
$$;

-- Function to get graph neighbors
CREATE OR REPLACE FUNCTION public.get_graph_neighbors(
  p_node_id UUID,
  p_depth INTEGER DEFAULT 1
)
RETURNS TABLE(
  node_id UUID,
  node_name TEXT,
  node_type entity_type,
  edge_id UUID,
  relationship relationship_type,
  distance INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE neighbors AS (
    SELECT 
      e.target_node_id AS neighbor_id,
      e.id AS edge_id,
      e.relationship_type,
      1 AS dist
    FROM knowledge_graph_edges e
    WHERE e.source_node_id = p_node_id
    
    UNION
    
    SELECT 
      e.source_node_id AS neighbor_id,
      e.id AS edge_id,
      e.relationship_type,
      1 AS dist
    FROM knowledge_graph_edges e
    WHERE e.target_node_id = p_node_id
    
    UNION ALL
    
    SELECT 
      CASE WHEN e.source_node_id = n.neighbor_id THEN e.target_node_id ELSE e.source_node_id END,
      e.id,
      e.relationship_type,
      n.dist + 1
    FROM neighbors n
    JOIN knowledge_graph_edges e ON (e.source_node_id = n.neighbor_id OR e.target_node_id = n.neighbor_id)
    WHERE n.dist < p_depth
      AND CASE WHEN e.source_node_id = n.neighbor_id THEN e.target_node_id ELSE e.source_node_id END != p_node_id
  )
  SELECT DISTINCT ON (n.neighbor_id)
    n.neighbor_id AS node_id,
    kn.name AS node_name,
    kn.entity_type AS node_type,
    n.edge_id,
    n.relationship_type AS relationship,
    n.dist AS distance
  FROM neighbors n
  JOIN knowledge_graph_nodes kn ON kn.id = n.neighbor_id
  WHERE n.neighbor_id != p_node_id
  ORDER BY n.neighbor_id, n.dist;
END;
$$;