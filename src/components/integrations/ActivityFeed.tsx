import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Activity, 
  FileText, 
  Send, 
  Webhook, 
  AlertCircle,
  CheckCircle,
  XCircle,
  Cloud,
  Mail,
  MessageSquare,
  RefreshCw,
  Loader2
} from 'lucide-react';
import { useIntegrationEvents, useRealtimeEvents } from '@/hooks/useIntegrations';
import { IntegrationEvent, IntegrationProvider } from '@/services/integrationService';

interface ActivityFeedProps {
  projectId?: string;
  compact?: boolean;
}

const eventTypeIcons: Record<string, React.ReactNode> = {
  api_ingest: <FileText className="h-4 w-4" />,
  webhook_received: <Webhook className="h-4 w-4" />,
  notification_sent: <Send className="h-4 w-4" />,
  notification_failed: <AlertCircle className="h-4 w-4" />,
  file_detected: <FileText className="h-4 w-4" />,
  file_ingested: <FileText className="h-4 w-4" />,
  error: <XCircle className="h-4 w-4" />,
};

const providerIcons: Record<IntegrationProvider, React.ReactNode> = {
  google_drive: <Cloud className="h-4 w-4" />,
  gmail: <Mail className="h-4 w-4" />,
  slack: <MessageSquare className="h-4 w-4" />,
  microsoft_teams: <MessageSquare className="h-4 w-4" />,
  webhook: <Webhook className="h-4 w-4" />,
};

function getStatusColor(status: string): string {
  switch (status) {
    case 'success':
      return 'text-green-500';
    case 'error':
      return 'text-destructive';
    case 'pending':
      return 'text-yellow-500';
    default:
      return 'text-muted-foreground';
  }
}

function EventItem({ event }: { event: IntegrationEvent }) {
  const icon = eventTypeIcons[event.event_type] || <Activity className="h-4 w-4" />;
  const providerIcon = event.provider ? providerIcons[event.provider] : null;
  const statusColor = getStatusColor(event.status);

  return (
    <div className="flex gap-3 py-3 border-b last:border-0">
      <div className={`mt-0.5 ${statusColor}`}>
        {event.status === 'success' ? (
          <CheckCircle className="h-4 w-4" />
        ) : event.status === 'error' ? (
          <XCircle className="h-4 w-4" />
        ) : (
          icon
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm">{event.title}</span>
          {providerIcon && (
            <Badge variant="outline" className="text-xs py-0 px-1.5">
              <span className="mr-1">{providerIcon}</span>
              {event.provider?.replace('_', ' ')}
            </Badge>
          )}
        </div>
        {event.description && (
          <p className="text-sm text-muted-foreground truncate">{event.description}</p>
        )}
        {event.error_message && (
          <p className="text-sm text-destructive">{event.error_message}</p>
        )}
        {event.resource_name && (
          <p className="text-xs text-muted-foreground">
            {event.resource_type}: {event.resource_name}
          </p>
        )}
        <p className="text-xs text-muted-foreground mt-1">
          {new Date(event.created_at).toLocaleString()}
        </p>
      </div>
    </div>
  );
}

export function ActivityFeed({ projectId, compact = false }: ActivityFeedProps) {
  const [eventFilter, setEventFilter] = useState<string>('all');
  const { data: events, isLoading, refetch } = useIntegrationEvents({
    project_id: projectId,
    limit: compact ? 10 : 50,
    event_type: eventFilter === 'all' ? undefined : eventFilter,
  });
  
  // Subscribe to real-time events
  const realtimeEvents = useRealtimeEvents(projectId);
  
  // Combine fetched and real-time events
  const [allEvents, setAllEvents] = useState<IntegrationEvent[]>([]);
  
  useEffect(() => {
    if (events) {
      setAllEvents(events);
    }
  }, [events]);
  
  useEffect(() => {
    if (realtimeEvents.length > 0) {
      const latestEvent = realtimeEvents[0];
      setAllEvents(prev => {
        // Avoid duplicates
        if (prev.some(e => e.id === latestEvent.id)) return prev;
        return [latestEvent, ...prev].slice(0, compact ? 10 : 50);
      });
    }
  }, [realtimeEvents, compact]);

  if (compact) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : allEvents.length > 0 ? (
            <div className="space-y-2">
              {allEvents.slice(0, 5).map((event) => (
                <EventItem key={event.id} event={event} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              No recent activity
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Integration Activity
            </CardTitle>
            <CardDescription>
              Real-time activity from all your integrations
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Select value={eventFilter} onValueChange={setEventFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filter events" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Events</SelectItem>
                <SelectItem value="api_ingest">API Ingestion</SelectItem>
                <SelectItem value="webhook_received">Webhooks</SelectItem>
                <SelectItem value="notification_sent">Notifications</SelectItem>
                <SelectItem value="error">Errors</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : allEvents.length > 0 ? (
          <ScrollArea className="h-[500px]">
            <div className="space-y-1">
              {allEvents.map((event) => (
                <EventItem key={event.id} event={event} />
              ))}
            </div>
          </ScrollArea>
        ) : (
          <div className="text-center py-12">
            <Activity className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No Activity Yet</h3>
            <p className="text-muted-foreground">
              Events from your integrations will appear here
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
