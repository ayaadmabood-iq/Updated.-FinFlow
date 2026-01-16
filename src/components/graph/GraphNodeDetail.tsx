import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X, FileText, Link2, Loader2 } from "lucide-react";
import { knowledgeGraphService } from "@/services/knowledgeGraphService";

interface GraphNode {
  id: string;
  name: string;
  entityType: string;
  mentionCount: number;
  confidenceScore: number;
}

interface Neighbor {
  nodeId: string;
  nodeName: string;
  nodeType: string;
  relationship: string;
  distance: number;
}

interface Props {
  projectId: string;
  node: GraphNode;
  onClose: () => void;
}

export function GraphNodeDetail({ projectId, node, onClose }: Props) {
  const [neighbors, setNeighbors] = useState<Neighbor[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    async function loadNeighbors() {
      setIsLoading(true);
      try {
        const data = await knowledgeGraphService.getNodeNeighbors(node.id, 2);
        setNeighbors(data);
      } catch (error) {
        console.error("Failed to load neighbors:", error);
      } finally {
        setIsLoading(false);
      }
    }
    loadNeighbors();
  }, [node.id]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{node.name}</CardTitle>
            <Badge variant="outline" className="mt-1 capitalize">
              {node.entityType}
            </Badge>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="text-muted-foreground">Mentions</div>
          <div className="font-medium">{node.mentionCount}</div>
          <div className="text-muted-foreground">Confidence</div>
          <div className="font-medium">{(node.confidenceScore * 100).toFixed(0)}%</div>
        </div>

        <div>
          <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
            <Link2 className="h-4 w-4" />
            Connected Entities
          </h4>
          {isLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : neighbors.length > 0 ? (
            <ScrollArea className="h-[200px]">
              <div className="space-y-2">
                {neighbors.map((neighbor, idx) => (
                  <div
                    key={`${neighbor.nodeId}-${idx}`}
                    className="p-2 rounded-md bg-muted/50 text-sm"
                  >
                    <div className="font-medium">{neighbor.nodeName}</div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <Badge variant="secondary" className="text-xs capitalize">
                        {neighbor.nodeType}
                      </Badge>
                      <span className="capitalize">{neighbor.relationship.replace(/_/g, " ")}</span>
                      {neighbor.distance > 1 && (
                        <span>• {neighbor.distance} hops</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <p className="text-sm text-muted-foreground">No connections found</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
