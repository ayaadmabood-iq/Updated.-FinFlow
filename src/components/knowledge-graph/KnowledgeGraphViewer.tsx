import { useCallback, useMemo, useRef, useState, useEffect } from "react";
import ForceGraph2D, { ForceGraphMethods, NodeObject, LinkObject } from "react-force-graph-2d";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, RefreshCw, Sparkles, Search, ZoomIn, ZoomOut, Maximize2 } from "lucide-react";
import { useKnowledgeGraph } from "@/hooks/useKnowledgeGraph";
import { KnowledgeGraphNode, KnowledgeGraphEdge } from "@/services/knowledgeGraphService";
import { GraphNodeDetail } from "./GraphNodeDetail";
import { GraphInsightsPanel } from "./GraphInsightsPanel";
import { GraphPathfinder } from "./GraphPathfinder";

interface Props {
  projectId: string;
}

interface GraphNode extends NodeObject {
  id: string;
  name: string;
  entityType: string;
  mentionCount: number;
  confidenceScore: number;
  color?: string;
  size?: number;
}

interface GraphLink extends LinkObject {
  id: string;
  source: string;
  target: string;
  relationshipType: string;
  weight: number;
  isAiDiscovered: boolean;
}

const ENTITY_COLORS: Record<string, string> = {
  person: "#ef4444",
  organization: "#3b82f6",
  location: "#22c55e",
  date: "#eab308",
  concept: "#a855f7",
  document: "#06b6d4",
  event: "#f97316",
  product: "#ec4899",
  money: "#84cc16",
  law: "#6366f1",
  other: "#6b7280",
};

export function KnowledgeGraphViewer({ projectId }: Props) {
  const graphRef = useRef<ForceGraphMethods>();
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [filterType, setFilterType] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showPathfinder, setShowPathfinder] = useState(false);
  const [highlightedPath, setHighlightedPath] = useState<Set<string>>(new Set());

  const {
    graphData,
    isLoading,
    extractEntities,
    isExtracting,
    discoverConnections,
    isDiscovering,
    refetch,
  } = useKnowledgeGraph(projectId);

  // Update dimensions on container resize
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setDimensions({ width: rect.width, height: Math.max(400, rect.height - 100) });
      }
    };

    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, []);

  // Transform data for force graph
  const { graphNodes, graphLinks } = useMemo(() => {
    if (!graphData) return { graphNodes: [], graphLinks: [] };

    let nodes = graphData.nodes;
    let edges = graphData.edges;

    // Filter by entity type
    if (filterType !== "all") {
      nodes = nodes.filter(n => n.entityType === filterType);
      const nodeIds = new Set(nodes.map(n => n.id));
      edges = edges.filter(e => nodeIds.has(e.sourceNodeId) && nodeIds.has(e.targetNodeId));
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      nodes = nodes.filter(n => n.name.toLowerCase().includes(query));
      const nodeIds = new Set(nodes.map(n => n.id));
      edges = edges.filter(e => nodeIds.has(e.sourceNodeId) && nodeIds.has(e.targetNodeId));
    }

    const graphNodes: GraphNode[] = nodes.map(node => ({
      id: node.id,
      name: node.name,
      entityType: node.entityType,
      mentionCount: node.mentionCount,
      confidenceScore: node.confidenceScore,
      color: ENTITY_COLORS[node.entityType] || ENTITY_COLORS.other,
      size: Math.min(20, 5 + node.mentionCount * 2),
    }));

    const nodeIds = new Set(graphNodes.map(n => n.id));
    const graphLinks: GraphLink[] = edges
      .filter(edge => nodeIds.has(edge.sourceNodeId) && nodeIds.has(edge.targetNodeId))
      .map(edge => ({
        id: edge.id,
        source: edge.sourceNodeId,
        target: edge.targetNodeId,
        relationshipType: edge.relationshipType,
        weight: edge.weight,
        isAiDiscovered: edge.isAiDiscovered,
      }));

    return { graphNodes, graphLinks };
  }, [graphData, filterType, searchQuery]);

  const handleNodeClick = useCallback((node: NodeObject) => {
    setSelectedNode(node as GraphNode);
    // Center on node
    graphRef.current?.centerAt(node.x, node.y, 500);
    graphRef.current?.zoom(2, 500);
  }, []);

  const handleZoomIn = () => graphRef.current?.zoom(graphRef.current.zoom() * 1.5, 300);
  const handleZoomOut = () => graphRef.current?.zoom(graphRef.current.zoom() / 1.5, 300);
  const handleFitView = () => graphRef.current?.zoomToFit(400, 50);

  const handlePathFound = (nodeIds: string[]) => {
    setHighlightedPath(new Set(nodeIds));
    // Highlight the path nodes
    if (nodeIds.length > 0) {
      const firstNode = graphNodes.find(n => n.id === nodeIds[0]);
      if (firstNode && firstNode.x && firstNode.y) {
        graphRef.current?.centerAt(firstNode.x, firstNode.y, 500);
      }
    }
  };

  const nodeCanvasObject = useCallback((node: NodeObject, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const gNode = node as GraphNode;
    const size = gNode.size || 8;
    const label = gNode.name;
    const fontSize = 12 / globalScale;
    const isHighlighted = highlightedPath.has(gNode.id);
    
    // Draw node circle
    ctx.beginPath();
    ctx.arc(node.x!, node.y!, size, 0, 2 * Math.PI);
    ctx.fillStyle = isHighlighted ? "#fbbf24" : (gNode.color || "#6b7280");
    ctx.fill();

    // Draw border
    ctx.strokeStyle = isHighlighted ? "#f59e0b" : "#fff";
    ctx.lineWidth = isHighlighted ? 3 / globalScale : 1.5 / globalScale;
    ctx.stroke();

    // Draw label
    if (globalScale > 0.5) {
      ctx.font = `${fontSize}px Inter, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillStyle = "hsl(var(--foreground))";
      ctx.fillText(label.length > 20 ? label.slice(0, 20) + "..." : label, node.x!, node.y! + size + 2);
    }
  }, [highlightedPath]);

  const linkColor = useCallback((link: LinkObject) => {
    const gLink = link as GraphLink;
    if (gLink.isAiDiscovered) return "rgba(168, 85, 247, 0.6)";
    return "rgba(156, 163, 175, 0.4)";
  }, []);

  const linkWidth = useCallback((link: LinkObject) => {
    const gLink = link as GraphLink;
    return Math.max(1, gLink.weight * 3);
  }, []);

  const entityTypes = useMemo(() => {
    if (!graphData) return [];
    const types = new Set(graphData.nodes.map(n => n.entityType));
    return Array.from(types).sort();
  }, [graphData]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex-1 min-w-[200px] max-w-sm">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search entities..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {entityTypes.map(type => (
              <SelectItem key={type} value={type}>
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: ENTITY_COLORS[type] || ENTITY_COLORS.other }}
                  />
                  {type}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex gap-1">
          <Button variant="outline" size="icon" onClick={handleZoomIn}>
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={handleZoomOut}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={handleFitView}>
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>

        <Button 
          variant="outline" 
          onClick={() => setShowPathfinder(!showPathfinder)}
        >
          {showPathfinder ? "Hide Pathfinder" : "Pathfinder"}
        </Button>

        <Button
          variant="outline"
          onClick={() => extractEntities({})}
          disabled={isExtracting}
        >
          {isExtracting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
          Extract Entities
        </Button>

        <Button
          variant="default"
          onClick={() => discoverConnections()}
          disabled={isDiscovering}
        >
          {isDiscovering ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
          Discover Connections
        </Button>
      </div>

      {/* Stats */}
      <div className="flex gap-4 flex-wrap">
        <Badge variant="secondary">{graphNodes.length} Entities</Badge>
        <Badge variant="secondary">{graphLinks.length} Relationships</Badge>
        {graphData?.insights && graphData.insights.length > 0 && (
          <Badge variant="default">{graphData.insights.length} Insights</Badge>
        )}
      </div>

      {/* Pathfinder */}
      {showPathfinder && (
        <GraphPathfinder
          projectId={projectId}
          nodes={graphData?.nodes || []}
          onPathFound={handlePathFound}
        />
      )}

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Graph */}
        <Card className="lg:col-span-3" ref={containerRef}>
          <CardContent className="p-0 overflow-hidden rounded-lg">
            {graphNodes.length > 0 ? (
              <ForceGraph2D
                ref={graphRef}
                graphData={{ nodes: graphNodes, links: graphLinks }}
                width={dimensions.width}
                height={dimensions.height}
                nodeCanvasObject={nodeCanvasObject}
                linkColor={linkColor}
                linkWidth={linkWidth}
                onNodeClick={handleNodeClick}
                nodeRelSize={1}
                linkDirectionalParticles={2}
                linkDirectionalParticleWidth={2}
                linkDirectionalParticleSpeed={0.005}
                d3AlphaDecay={0.02}
                d3VelocityDecay={0.3}
                cooldownTime={3000}
                enableNodeDrag={true}
                enableZoomInteraction={true}
                enablePanInteraction={true}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-96 text-muted-foreground">
                <p className="mb-4">No entities found in this project</p>
                <Button onClick={() => extractEntities({})}>
                  Extract Entities from Documents
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sidebar */}
        <div className="space-y-4">
          {selectedNode ? (
            <GraphNodeDetail
              projectId={projectId}
              node={selectedNode}
              onClose={() => setSelectedNode(null)}
            />
          ) : (
            <GraphInsightsPanel
              insights={graphData?.insights || []}
              projectId={projectId}
            />
          )}
        </div>
      </div>

      {/* Legend */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm">Entity Types</CardTitle>
        </CardHeader>
        <CardContent className="py-2">
          <div className="flex flex-wrap gap-4">
            {Object.entries(ENTITY_COLORS).map(([type, color]) => (
              <div key={type} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                <span className="text-sm capitalize">{type}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
