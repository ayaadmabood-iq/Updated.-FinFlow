import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useBenchmarks, useCreateBenchmark, useRunBenchmark, useBenchmarkRuns, useDeleteBenchmark } from "@/hooks/useEvaluation";
import { QualityBenchmark, BenchmarkRun } from "@/services/evaluationService";
import { Plus, Play, Trash2, Loader2, CheckCircle, XCircle, Clock, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface BenchmarkDashboardProps {
  projectId: string;
}

export function BenchmarkDashboard({ projectId }: BenchmarkDashboardProps) {
  const { data: benchmarks, isLoading } = useBenchmarks(projectId);
  const createBenchmark = useCreateBenchmark();
  const runBenchmark = useRunBenchmark();
  const deleteBenchmark = useDeleteBenchmark();
  
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newBenchmark, setNewBenchmark] = useState({
    name: "",
    description: "",
    questionsText: "",
  });
  const [selectedBenchmark, setSelectedBenchmark] = useState<QualityBenchmark | null>(null);

  const handleCreateBenchmark = async () => {
    // Parse questions from text (one per line)
    const questions = newBenchmark.questionsText
      .split("\n")
      .filter((q) => q.trim())
      .map((q, i) => ({
        id: `q-${i + 1}`,
        question: q.trim(),
      }));

    if (questions.length === 0) return;

    await createBenchmark.mutateAsync({
      projectId,
      name: newBenchmark.name,
      description: newBenchmark.description,
      questions,
    });

    setIsCreateOpen(false);
    setNewBenchmark({ name: "", description: "", questionsText: "" });
  };

  const handleRunBenchmark = async (benchmark: QualityBenchmark) => {
    await runBenchmark.mutateAsync({
      benchmarkId: benchmark.id,
      projectId,
    });
  };

  const handleDeleteBenchmark = async (benchmarkId: string) => {
    await deleteBenchmark.mutateAsync({ benchmarkId, projectId });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Quality Benchmarks</h3>
          <p className="text-sm text-muted-foreground">
            Track AI performance with standardized test suites
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              New Benchmark
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create Quality Benchmark</DialogTitle>
              <DialogDescription>
                Create a test suite to evaluate AI performance over time
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  placeholder="e.g., Contract Review Accuracy"
                  value={newBenchmark.name}
                  onChange={(e) => setNewBenchmark({ ...newBenchmark, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  placeholder="What does this benchmark test?"
                  value={newBenchmark.description}
                  onChange={(e) => setNewBenchmark({ ...newBenchmark, description: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="questions">Test Questions (one per line)</Label>
                <Textarea
                  id="questions"
                  placeholder="What is the contract start date?&#10;Who are the parties involved?&#10;What are the payment terms?"
                  value={newBenchmark.questionsText}
                  onChange={(e) => setNewBenchmark({ ...newBenchmark, questionsText: e.target.value })}
                  className="h-40"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCreateBenchmark}
                disabled={!newBenchmark.name || !newBenchmark.questionsText || createBenchmark.isPending}
              >
                {createBenchmark.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Create Benchmark
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {benchmarks?.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-muted p-3 mb-4">
              <TrendingUp className="h-6 w-6 text-muted-foreground" />
            </div>
            <h4 className="font-medium mb-2">No Benchmarks Yet</h4>
            <p className="text-sm text-muted-foreground mb-4">
              Create a benchmark to start tracking AI performance
            </p>
            <Button variant="outline" onClick={() => setIsCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create First Benchmark
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {benchmarks?.map((benchmark) => (
            <BenchmarkCard
              key={benchmark.id}
              benchmark={benchmark}
              onRun={() => handleRunBenchmark(benchmark)}
              onDelete={() => handleDeleteBenchmark(benchmark.id)}
              onSelect={() => setSelectedBenchmark(benchmark)}
              isRunning={runBenchmark.isPending}
            />
          ))}
        </div>
      )}

      {selectedBenchmark && (
        <Dialog open={!!selectedBenchmark} onOpenChange={() => setSelectedBenchmark(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{selectedBenchmark.name}</DialogTitle>
              <DialogDescription>{selectedBenchmark.description}</DialogDescription>
            </DialogHeader>
            <BenchmarkRunHistory benchmarkId={selectedBenchmark.id} />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

interface BenchmarkCardProps {
  benchmark: QualityBenchmark;
  onRun: () => void;
  onDelete: () => void;
  onSelect: () => void;
  isRunning: boolean;
}

function BenchmarkCard({ benchmark, onRun, onDelete, onSelect, isRunning }: BenchmarkCardProps) {
  const questions = benchmark.questions || [];
  const avgScore = benchmark.avg_score ?? 0;

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <CardTitle className="text-base">{benchmark.name}</CardTitle>
          <Badge variant={benchmark.is_active ? "default" : "secondary"}>
            {benchmark.is_active ? "Active" : "Inactive"}
          </Badge>
        </div>
        <CardDescription className="line-clamp-2">
          {benchmark.description || `${questions.length} test questions`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Questions</span>
          <span className="font-medium">{questions.length}</span>
        </div>

        {benchmark.last_run_at && (
          <>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Last Score</span>
                <span className={cn("font-medium", getScoreColor(avgScore))}>
                  {Math.round(avgScore)}%
                </span>
              </div>
              <Progress value={avgScore} className="h-2" />
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              Last run {format(new Date(benchmark.last_run_at), "MMM d, yyyy")}
            </div>
          </>
        )}

        <div className="flex gap-2 pt-2">
          <Button
            variant="default"
            size="sm"
            className="flex-1 gap-1"
            onClick={onRun}
            disabled={isRunning}
          >
            {isRunning ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Play className="h-3 w-3" />
            )}
            Run
          </Button>
          <Button variant="outline" size="sm" onClick={onSelect}>
            History
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function BenchmarkRunHistory({ benchmarkId }: { benchmarkId: string }) {
  const { data: runs, isLoading } = useBenchmarkRuns(benchmarkId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!runs || runs.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No runs yet. Click "Run" to execute this benchmark.
      </div>
    );
  }

  return (
    <ScrollArea className="max-h-[400px]">
      <div className="space-y-4">
        {runs.map((run, index) => {
          const prevRun = runs[index + 1];
          const scoreDiff = prevRun
            ? (run.avg_confidence_score ?? 0) - (prevRun.avg_confidence_score ?? 0)
            : 0;

          return (
            <Card key={run.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Badge variant={run.status === "completed" ? "default" : "secondary"}>
                      {run.status}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {format(new Date(run.created_at), "MMM d, yyyy HH:mm")}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {scoreDiff !== 0 && (
                      <div
                        className={cn(
                          "flex items-center gap-1 text-xs",
                          scoreDiff > 0 ? "text-green-600" : "text-red-600"
                        )}
                      >
                        {scoreDiff > 0 ? (
                          <TrendingUp className="h-3 w-3" />
                        ) : (
                          <TrendingDown className="h-3 w-3" />
                        )}
                        {scoreDiff > 0 ? "+" : ""}
                        {Math.round(scoreDiff)}%
                      </div>
                    )}
                    <span className="font-medium">
                      {run.avg_confidence_score !== null
                        ? `${Math.round(run.avg_confidence_score)}%`
                        : "N/A"}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span>{run.passed_questions} passed</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-red-600" />
                    <span>{run.total_questions - run.passed_questions} failed</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>{run.avg_response_time_ms}ms avg</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </ScrollArea>
  );
}
