import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Route } from "lucide-react";
import { useKnowledgeGraph } from "@/hooks/useKnowledgeGraph";
import { KnowledgeGraphNode } from "@/services/knowledgeGraphService";

interface Props {
  projectId: string;
  nodes: KnowledgeGraphNode[];
  onPathFound: (nodeIds: string[]) => void;
}

export function GraphPathfinder({ projectId, nodes, onPathFound }: Props) {
  const [startNodeId, setStartNodeId] = useState<string>("");
  const [endNodeId, setEndNodeId] = useState<string>("");
  const [pathResult, setPathResult] = useState<string | null>(null);

  const { findPath, isFindingPath } = useKnowledgeGraph(projectId);

  const handleFindPath = async () => {
    if (!startNodeId || !endNodeId) return;

    try {
      const result = await findPath({ startNodeId, endNodeId });
      if (result) {
        // Extract node IDs from path nodes
        const nodeIds = result.pathNodes.map(node => node.id);
        onPathFound(nodeIds);
        setPathResult(`Found path with ${result.pathLength} steps`);
      } else {
        onPathFound([]);
        setPathResult("No path found between these entities");
      }
    } catch (error) {
      setPathResult("Error finding path");
    }
  };

  const sortedNodes = [...nodes].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <Card>
      <CardContent className="py-4">
        <div className="flex flex-wrap items-center gap-3">
          <Route className="h-5 w-5 text-muted-foreground" />
          <span className="text-sm font-medium">Find Connection</span>

          <Select value={startNodeId} onValueChange={setStartNodeId}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Start entity..." />
            </SelectTrigger>
            <SelectContent>
              {sortedNodes.map(node => (
                <SelectItem key={node.id} value={node.id}>
                  {node.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <span className="text-muted-foreground">→</span>

          <Select value={endNodeId} onValueChange={setEndNodeId}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="End entity..." />
            </SelectTrigger>
            <SelectContent>
              {sortedNodes.filter(n => n.id !== startNodeId).map(node => (
                <SelectItem key={node.id} value={node.id}>
                  {node.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            onClick={handleFindPath}
            disabled={!startNodeId || !endNodeId || isFindingPath}
          >
            {isFindingPath ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Find Path
          </Button>

          {pathResult && (
            <span className="text-sm text-muted-foreground">{pathResult}</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
