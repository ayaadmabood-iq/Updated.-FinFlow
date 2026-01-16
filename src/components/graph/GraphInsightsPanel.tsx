import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Lightbulb, Check, X, AlertTriangle, Link2, GitBranch } from "lucide-react";
import { KnowledgeGraphInsight } from "@/services/knowledgeGraphService";
import { useKnowledgeGraph } from "@/hooks/useKnowledgeGraph";

interface Props {
  insights: KnowledgeGraphInsight[];
  projectId: string;
}

const INSIGHT_ICONS: Record<string, React.ReactNode> = {
  hidden_connection: <Link2 className="h-4 w-4" />,
  contradiction: <AlertTriangle className="h-4 w-4" />,
  pattern: <GitBranch className="h-4 w-4" />,
  cluster: <Lightbulb className="h-4 w-4" />,
};

const INSIGHT_COLORS: Record<string, string> = {
  hidden_connection: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  contradiction: "bg-red-500/10 text-red-500 border-red-500/20",
  pattern: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  cluster: "bg-amber-500/10 text-amber-500 border-amber-500/20",
};

export function GraphInsightsPanel({ insights, projectId }: Props) {
  const { dismissInsight, confirmInsight } = useKnowledgeGraph(projectId);

  if (insights.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Lightbulb className="h-4 w-4" />
            AI Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No insights discovered yet. Click "Discover Connections" to find hidden patterns.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Lightbulb className="h-4 w-4" />
          AI Insights ({insights.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[400px]">
          <div className="space-y-3 p-4 pt-0">
            {insights.map((insight) => (
              <div
                key={insight.id}
                className={`p-3 rounded-lg border ${INSIGHT_COLORS[insight.insightType] || "bg-muted"}`}
              >
                <div className="flex items-start gap-2 mb-2">
                  {INSIGHT_ICONS[insight.insightType] || <Lightbulb className="h-4 w-4" />}
                  <div className="flex-1">
                    <div className="font-medium text-sm">{insight.title}</div>
                    <Badge variant="outline" className="text-xs mt-1 capitalize">
                      {insight.insightType.replace(/_/g, " ")}
                    </Badge>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  {insight.description}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {(insight.confidenceScore * 100).toFixed(0)}% confidence
                  </span>
                  {!insight.isConfirmed && (
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => confirmInsight(insight.id)}
                      >
                        <Check className="h-3.5 w-3.5 text-green-500" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => dismissInsight(insight.id)}
                      >
                        <X className="h-3.5 w-3.5 text-red-500" />
                      </Button>
                    </div>
                  )}
                  {insight.isConfirmed && (
                    <Badge variant="default" className="text-xs">Confirmed</Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
