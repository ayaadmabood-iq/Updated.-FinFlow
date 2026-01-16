import { useParams } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { KnowledgeGraphViewer, GraphSearchChat } from "@/components/graph";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Network, MessageSquare } from "lucide-react";

export default function ProjectKnowledgeGraph() {
  const { id: projectId } = useParams<{ id: string }>();

  if (!projectId) {
    return <div>Project not found</div>;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Network className="h-6 w-6" />
            Knowledge Graph
          </h1>
          <p className="text-muted-foreground">
            Visualize entities and relationships across your documents
          </p>
        </div>

        <Tabs defaultValue="graph" className="space-y-4">
          <TabsList>
            <TabsTrigger value="graph" className="flex items-center gap-2">
              <Network className="h-4 w-4" />
              Graph View
            </TabsTrigger>
            <TabsTrigger value="chat" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Graph Chat
            </TabsTrigger>
          </TabsList>

          <TabsContent value="graph">
            <KnowledgeGraphViewer projectId={projectId} />
          </TabsContent>

          <TabsContent value="chat" className="h-[600px]">
            <GraphSearchChat projectId={projectId} />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
