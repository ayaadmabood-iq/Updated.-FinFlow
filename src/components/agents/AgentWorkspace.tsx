import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Brain, Search, BarChart3, ShieldCheck, Play, StopCircle, 
  MessageSquare, ChevronDown, ChevronRight, AlertTriangle,
  CheckCircle2, Clock, Loader2
} from 'lucide-react';
import { 
  useResearchTasks, useResearchTask, useActivityLogs,
  useCreateResearchTask, useStartResearchTask, useSendIntervention 
} from '@/hooks/useAgents';
import type { AgentActivityLog, ResearchTask } from '@/services/agentService';

interface AgentWorkspaceProps {
  projectId: string;
}

const AGENT_ICONS = {
  manager: Brain,
  researcher: Search,
  analyst: BarChart3,
  critic: ShieldCheck,
};

const AGENT_COLORS = {
  manager: 'text-purple-500',
  researcher: 'text-blue-500',
  analyst: 'text-green-500',
  critic: 'text-orange-500',
};

export function AgentWorkspace({ projectId }: AgentWorkspaceProps) {
  const { t } = useTranslation();
  const [title, setTitle] = useState('');
  const [goal, setGoal] = useState('');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState('');

  const { data: tasks, isLoading: tasksLoading } = useResearchTasks(projectId);
  const { data: selectedTask } = useResearchTask(selectedTaskId || undefined);
  const { data: logs } = useActivityLogs(selectedTaskId || undefined);
  
  const createTask = useCreateResearchTask();
  const { startTask, isRunning, currentPhase, progress, activeAgent, activeTool } = useStartResearchTask();
  const sendIntervention = useSendIntervention();

  const handleCreateAndStart = async () => {
    if (!title.trim() || !goal.trim()) return;
    const task = await createTask.mutateAsync({ projectId, title, goal });
    setSelectedTaskId(task.id);
    setTitle('');
    setGoal('');
    startTask(task.id);
  };

  const handleCancel = () => {
    if (selectedTaskId) {
      sendIntervention.mutate({ taskId: selectedTaskId, interventionType: 'cancel' });
    }
  };

  const handleSendFeedback = () => {
    if (selectedTaskId && feedbackMessage.trim()) {
      sendIntervention.mutate({ 
        taskId: selectedTaskId, 
        interventionType: 'feedback',
        message: feedbackMessage 
      });
      setFeedbackMessage('');
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Task Creation */}
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            {t('agents.newResearch', 'New Research Task')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            placeholder={t('agents.taskTitle', 'Task title...')}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <Textarea
            placeholder={t('agents.researchGoal', 'Describe your research goal...')}
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            rows={4}
          />
          <Button 
            onClick={handleCreateAndStart} 
            disabled={!title.trim() || !goal.trim() || createTask.isPending}
            className="w-full"
          >
            {createTask.isPending ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Play className="mr-2 h-4 w-4" />}
            {t('agents.startResearch', 'Start Research')}
          </Button>

          <div className="pt-4 border-t">
            <h4 className="text-sm font-medium mb-2">{t('agents.recentTasks', 'Recent Tasks')}</h4>
            <ScrollArea className="h-[200px]">
              {tasks?.map((task) => (
                <div
                  key={task.id}
                  onClick={() => setSelectedTaskId(task.id)}
                  className={`p-2 rounded cursor-pointer mb-1 ${
                    selectedTaskId === task.id ? 'bg-primary/10' : 'hover:bg-muted'
                  }`}
                >
                  <div className="font-medium text-sm truncate">{task.title}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant={task.status === 'completed' ? 'default' : 'secondary'}>
                      {task.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{task.progressPercent}%</span>
                  </div>
                </div>
              ))}
            </ScrollArea>
          </div>
        </CardContent>
      </Card>

      {/* Agent Activity */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{t('agents.agentActivity', 'Agent Activity')}</span>
            {isRunning && selectedTaskId && (
              <Button variant="destructive" size="sm" onClick={handleCancel}>
                <StopCircle className="mr-2 h-4 w-4" />
                {t('agents.cancel', 'Cancel')}
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {selectedTask && (
            <div className="space-y-4">
              {/* Progress */}
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>{currentPhase || selectedTask.currentPhase || 'Waiting'}</span>
                  <span>{progress || selectedTask.progressPercent}%</span>
                </div>
                <Progress value={progress || selectedTask.progressPercent} />
              </div>

              {/* Active Agent */}
              {activeAgent && (
                <div className="flex items-center gap-2 p-3 bg-muted rounded-lg animate-pulse">
                  {AGENT_ICONS[activeAgent as keyof typeof AGENT_ICONS] && (
                    <span className={AGENT_COLORS[activeAgent as keyof typeof AGENT_COLORS]}>
                      {(() => { const Icon = AGENT_ICONS[activeAgent as keyof typeof AGENT_ICONS]; return <Icon className="h-5 w-5" />; })()}
                    </span>
                  )}
                  <span className="font-medium capitalize">{activeAgent}</span>
                  {activeTool && <Badge variant="outline">{activeTool}</Badge>}
                  <Loader2 className="animate-spin h-4 w-4 ml-auto" />
                </div>
              )}

              {/* Activity Log */}
              <ScrollArea className="h-[300px] border rounded-lg p-2">
                {logs?.map((log) => (
                  <AgentLogEntry key={log.id} log={log} />
                ))}
                {(!logs || logs.length === 0) && (
                  <div className="text-center text-muted-foreground py-8">
                    {t('agents.noActivity', 'No activity yet')}
                  </div>
                )}
              </ScrollArea>

              {/* Conflicts */}
              {selectedTask.conflictsFound.length > 0 && (
                <div className="border border-orange-500/50 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-orange-500 font-medium mb-2">
                    <AlertTriangle className="h-4 w-4" />
                    {t('agents.conflictsFound', 'Conflicts Found')} ({selectedTask.conflictsFound.length})
                  </div>
                  {selectedTask.conflictsFound.map((conflict, i) => (
                    <div key={i} className="text-sm text-muted-foreground">{conflict.description}</div>
                  ))}
                </div>
              )}

              {/* User Feedback */}
              {isRunning && (
                <div className="flex gap-2">
                  <Input
                    placeholder={t('agents.feedbackPlaceholder', 'Send feedback to agents...')}
                    value={feedbackMessage}
                    onChange={(e) => setFeedbackMessage(e.target.value)}
                  />
                  <Button onClick={handleSendFeedback} disabled={!feedbackMessage.trim()}>
                    <MessageSquare className="h-4 w-4" />
                  </Button>
                </div>
              )}

              {/* Final Report */}
              {selectedTask.status === 'completed' && selectedTask.finalReportMarkdown && (
                <Collapsible>
                  <CollapsibleTrigger asChild>
                    <Button variant="outline" className="w-full">
                      <CheckCircle2 className="mr-2 h-4 w-4 text-green-500" />
                      {t('agents.viewReport', 'View Final Report')}
                      <ChevronDown className="ml-auto h-4 w-4" />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-2">
                    <div className="prose prose-sm max-w-none p-4 border rounded-lg bg-muted/50">
                      <pre className="whitespace-pre-wrap text-sm">{selectedTask.finalReportMarkdown}</pre>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )}
            </div>
          )}

          {!selectedTask && (
            <div className="text-center text-muted-foreground py-12">
              {t('agents.selectTask', 'Create or select a research task to view agent activity')}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function AgentLogEntry({ log }: { log: AgentActivityLog }) {
  const [isOpen, setIsOpen] = useState(false);
  const Icon = AGENT_ICONS[log.agentRole];
  const colorClass = AGENT_COLORS[log.agentRole];

  return (
    <div className="border-b last:border-0 py-2">
      <div 
        className="flex items-center gap-2 cursor-pointer"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        <Icon className={`h-4 w-4 ${colorClass}`} />
        <span className="font-medium capitalize text-sm">{log.agentRole}</span>
        <span className="text-xs text-muted-foreground">{log.action}</span>
        {log.toolUsed && <Badge variant="outline" className="text-xs">{log.toolUsed}</Badge>}
        {log.durationMs && <span className="text-xs text-muted-foreground ml-auto">{log.durationMs}ms</span>}
      </div>
      {isOpen && log.outputSummary && (
        <div className="ml-6 mt-2 text-xs text-muted-foreground bg-muted p-2 rounded">
          {log.outputSummary}
        </div>
      )}
    </div>
  );
}

export default AgentWorkspace;
