import { useTeamActivity } from '@/hooks/useCollaboration';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Activity,
  FileText,
  MessageSquare,
  Upload,
  Download,
  Users,
  Bot,
  Lightbulb,
  AlertCircle,
  CheckCircle2,
  Edit,
  Share2,
  Eye,
  Bell,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ActivityPulseSidebarProps {
  teamId: string;
  limit?: number;
}

const actionConfig: Record<string, { icon: React.ElementType; color: string; bgColor: string }> = {
  'document.uploaded': { icon: Upload, color: 'text-green-600', bgColor: 'bg-green-100' },
  'document.processed': { icon: CheckCircle2, color: 'text-blue-600', bgColor: 'bg-blue-100' },
  'document.shared': { icon: Share2, color: 'text-orange-600', bgColor: 'bg-orange-100' },
  'document.viewed': { icon: Eye, color: 'text-gray-600', bgColor: 'bg-gray-100' },
  'document.exported': { icon: Download, color: 'text-purple-600', bgColor: 'bg-purple-100' },
  'chat.message': { icon: MessageSquare, color: 'text-blue-600', bgColor: 'bg-blue-100' },
  'chat.thread_created': { icon: MessageSquare, color: 'text-green-600', bgColor: 'bg-green-100' },
  'ai.insight': { icon: Lightbulb, color: 'text-yellow-600', bgColor: 'bg-yellow-100' },
  'ai.summary': { icon: Bot, color: 'text-purple-600', bgColor: 'bg-purple-100' },
  'ai.risk_detected': { icon: AlertCircle, color: 'text-red-600', bgColor: 'bg-red-100' },
  'annotation.created': { icon: Edit, color: 'text-blue-600', bgColor: 'bg-blue-100' },
  'annotation.resolved': { icon: CheckCircle2, color: 'text-green-600', bgColor: 'bg-green-100' },
  'member.joined': { icon: Users, color: 'text-green-600', bgColor: 'bg-green-100' },
  default: { icon: FileText, color: 'text-gray-600', bgColor: 'bg-gray-100' },
};

function getActionConfig(action: string) {
  return actionConfig[action] || actionConfig.default;
}

function formatActivityMessage(action: string, resourceName: string | null): string {
  const parts = action.split('.');
  const verb = parts[1] || parts[0];
  
  const messages: Record<string, string> = {
    uploaded: `uploaded "${resourceName}"`,
    processed: `finished processing "${resourceName}"`,
    shared: `shared "${resourceName}"`,
    viewed: `is viewing "${resourceName}"`,
    exported: `exported "${resourceName}"`,
    message: `sent a message in "${resourceName}"`,
    thread_created: `started a discussion about "${resourceName}"`,
    insight: `AI discovered insights in "${resourceName}"`,
    summary: `AI generated summary for "${resourceName}"`,
    risk_detected: `AI found risks in "${resourceName}"`,
    created: `created annotation on "${resourceName}"`,
    resolved: `resolved annotation on "${resourceName}"`,
    joined: 'joined the team',
  };

  return messages[verb] || `${verb} ${resourceName || 'item'}`;
}

function ActivityItem({ activity }: { activity: { 
  id: string; 
  action: string; 
  resourceName: string | null; 
  userId: string; 
  createdAt: string;
  metadata: Record<string, unknown>;
}}) {
  const config = getActionConfig(activity.action);
  const Icon = config.icon;

  return (
    <div className="flex items-start gap-3 p-3 hover:bg-muted/50 rounded-lg transition-colors">
      <div className={`p-2 rounded-full ${config.bgColor}`}>
        <Icon className={`h-4 w-4 ${config.color}`} />
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Avatar className="h-5 w-5">
            <AvatarFallback className="text-xs">
              {activity.userId.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm">
            {formatActivityMessage(activity.action, activity.resourceName)}
          </span>
        </div>
        
        <p className="text-xs text-muted-foreground mt-1">
          {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
        </p>
      </div>
    </div>
  );
}

export function ActivityPulseSidebar({ teamId, limit = 30 }: ActivityPulseSidebarProps) {
  const { data: activities, isLoading } = useTeamActivity(teamId, limit);
  const recentCount = activities?.filter(a => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    return new Date(a.createdAt) > fiveMinutesAgo;
  }).length || 0;

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="relative gap-2">
          <Activity className="h-4 w-4" />
          <span className="hidden sm:inline">Activity</span>
          {recentCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs animate-pulse"
            >
              {recentCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      
      <SheetContent className="w-[400px] sm:w-[450px] p-0">
        <SheetHeader className="p-4 border-b">
          <SheetTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Activity Pulse
            </span>
            <Badge variant="secondary">
              {activities?.length || 0} events
            </Badge>
          </SheetTitle>
        </SheetHeader>
        
        <ScrollArea className="h-[calc(100vh-80px)]">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : !activities || activities.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Bell className="h-12 w-12 mb-4 opacity-50" />
              <p>No recent activity</p>
              <p className="text-sm mt-1">Team activity will appear here</p>
            </div>
          ) : (
            <div className="p-2">
              {activities.map((activity) => (
                <ActivityItem key={activity.id} activity={activity} />
              ))}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
