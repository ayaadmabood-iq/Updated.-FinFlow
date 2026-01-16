import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useTeamActivity } from '@/hooks/useCollaboration';
import {
  FileText,
  MessageSquare,
  Upload,
  Download,
  Users,
  Settings,
  Bot,
  Lightbulb,
  AlertCircle,
  CheckCircle2,
  Edit,
  Trash2,
  Share2,
  Eye,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface TeamActivityFeedProps {
  teamId: string;
  limit?: number;
  compact?: boolean;
}

const actionConfig: Record<string, { icon: React.ElementType; color: string }> = {
  'document.uploaded': { icon: Upload, color: 'text-green-500' },
  'document.processed': { icon: CheckCircle2, color: 'text-blue-500' },
  'document.deleted': { icon: Trash2, color: 'text-red-500' },
  'document.exported': { icon: Download, color: 'text-purple-500' },
  'document.shared': { icon: Share2, color: 'text-orange-500' },
  'document.viewed': { icon: Eye, color: 'text-gray-500' },
  'chat.message': { icon: MessageSquare, color: 'text-blue-500' },
  'chat.thread_created': { icon: MessageSquare, color: 'text-green-500' },
  'ai.insight': { icon: Lightbulb, color: 'text-yellow-500' },
  'ai.task_completed': { icon: Bot, color: 'text-purple-500' },
  'ai.risk_detected': { icon: AlertCircle, color: 'text-red-500' },
  'annotation.created': { icon: Edit, color: 'text-blue-500' },
  'annotation.resolved': { icon: CheckCircle2, color: 'text-green-500' },
  'member.joined': { icon: Users, color: 'text-green-500' },
  'member.left': { icon: Users, color: 'text-orange-500' },
  'project.created': { icon: FileText, color: 'text-green-500' },
  'project.updated': { icon: Settings, color: 'text-blue-500' },
  default: { icon: FileText, color: 'text-muted-foreground' },
};

function getActionConfig(action: string) {
  return actionConfig[action] || actionConfig.default;
}

function formatActionText(action: string, resourceType: string, resourceName: string | null) {
  const parts = action.split('.');
  const verb = parts[1] || parts[0];
  
  const verbMap: Record<string, string> = {
    uploaded: 'uploaded',
    processed: 'finished processing',
    deleted: 'deleted',
    exported: 'exported',
    shared: 'shared',
    viewed: 'viewed',
    message: 'sent a message in',
    thread_created: 'started a conversation about',
    insight: 'discovered an insight in',
    task_completed: 'completed a research task on',
    risk_detected: 'found a potential risk in',
    created: 'created',
    resolved: 'resolved an annotation on',
    joined: 'joined the team',
    left: 'left the team',
    updated: 'updated',
  };

  const actionText = verbMap[verb] || verb;
  
  if (resourceName) {
    return `${actionText} "${resourceName}"`;
  }
  
  return `${actionText} a ${resourceType}`;
}

export function TeamActivityFeed({ teamId, limit = 50, compact = false }: TeamActivityFeedProps) {
  const { data: activities, isLoading } = useTeamActivity(teamId, limit);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">Loading activity...</p>
        </CardContent>
      </Card>
    );
  }

  if (!activities || activities.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">No recent activity</p>
        </CardContent>
      </Card>
    );
  }

  const groupedByDate = activities.reduce((acc, activity) => {
    const date = new Date(activity.createdAt).toDateString();
    if (!acc[date]) acc[date] = [];
    acc[date].push(activity);
    return acc;
  }, {} as Record<string, typeof activities>);

  return (
    <Card className={compact ? '' : 'h-full'}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Team Activity</CardTitle>
          <Badge variant="secondary">{activities.length} events</Badge>
        </div>
      </CardHeader>
      
      <CardContent>
        <ScrollArea className={compact ? 'max-h-[400px]' : 'h-[calc(100%-60px)]'}>
          <div className="space-y-6">
            {Object.entries(groupedByDate).map(([date, dateActivities]) => (
              <div key={date}>
                <div className="sticky top-0 bg-card z-10 py-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {new Date(date).toLocaleDateString('en-US', {
                      weekday: 'long',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </p>
                </div>
                
                <div className="space-y-3">
                  {dateActivities.map((activity) => {
                    const config = getActionConfig(activity.action);
                    const Icon = config.icon;
                    
                    return (
                      <div
                        key={activity.id}
                        className="flex items-start gap-3 group hover:bg-muted/50 p-2 rounded-lg -mx-2 transition-colors"
                      >
                        <div className={`mt-0.5 p-1.5 rounded-full bg-muted ${config.color}`}>
                          <Icon className="h-3.5 w-3.5" />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-5 w-5">
                              <AvatarFallback className="text-xs">
                                {activity.userId.slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm">
                              {formatActionText(
                                activity.action,
                                activity.resourceType,
                                activity.resourceName
                              )}
                            </span>
                          </div>
                          
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
