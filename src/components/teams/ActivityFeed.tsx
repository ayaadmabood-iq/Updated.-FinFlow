import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TeamActivity, useTeamActivities } from '@/hooks/useTeams';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { 
  FolderPlus, UserPlus, FileText, Brain, Settings, Trash2, 
  Edit, Share2, Download, Play, CheckCircle 
} from 'lucide-react';

interface ActivityFeedProps {
  teamId: string;
}

const actionIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  'project.created': FolderPlus,
  'project.updated': Edit,
  'project.deleted': Trash2,
  'project.shared': Share2,
  'member.invited': UserPlus,
  'member.joined': UserPlus,
  'member.removed': Trash2,
  'dataset.created': FileText,
  'dataset.updated': Edit,
  'dataset.exported': Download,
  'training.started': Play,
  'training.completed': CheckCircle,
  'model.created': Brain,
  'settings.updated': Settings,
};

const actionColors: Record<string, string> = {
  'project.created': 'bg-green-100 text-green-600 dark:bg-green-900/30',
  'project.deleted': 'bg-red-100 text-red-600 dark:bg-red-900/30',
  'member.invited': 'bg-blue-100 text-blue-600 dark:bg-blue-900/30',
  'member.removed': 'bg-red-100 text-red-600 dark:bg-red-900/30',
  'training.started': 'bg-purple-100 text-purple-600 dark:bg-purple-900/30',
  'training.completed': 'bg-green-100 text-green-600 dark:bg-green-900/30',
};

export function ActivityFeed({ teamId }: ActivityFeedProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { data: activities = [], isLoading } = useTeamActivities(teamId);

  // Subscribe to realtime updates
  useEffect(() => {
    const channel = supabase
      .channel(`team_activities_${teamId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'team_activities',
          filter: `team_id=eq.${teamId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['team-activities', teamId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [teamId, queryClient]);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getActionMessage = (activity: TeamActivity) => {
    const resourceName = activity.resource_name ? `"${activity.resource_name}"` : '';
    
    const messages: Record<string, string> = {
      'project.created': t('teams.activity.projectCreated', 'created project {{name}}', { name: resourceName }),
      'project.updated': t('teams.activity.projectUpdated', 'updated project {{name}}', { name: resourceName }),
      'project.deleted': t('teams.activity.projectDeleted', 'deleted project {{name}}', { name: resourceName }),
      'project.shared': t('teams.activity.projectShared', 'shared project {{name}}', { name: resourceName }),
      'member.invited': t('teams.activity.memberInvited', 'invited a new member'),
      'member.joined': t('teams.activity.memberJoined', 'joined the team'),
      'member.removed': t('teams.activity.memberRemoved', 'removed a member'),
      'dataset.created': t('teams.activity.datasetCreated', 'created dataset {{name}}', { name: resourceName }),
      'dataset.updated': t('teams.activity.datasetUpdated', 'updated dataset {{name}}', { name: resourceName }),
      'dataset.exported': t('teams.activity.datasetExported', 'exported dataset {{name}}', { name: resourceName }),
      'training.started': t('teams.activity.trainingStarted', 'started training {{name}}', { name: resourceName }),
      'training.completed': t('teams.activity.trainingCompleted', 'completed training {{name}}', { name: resourceName }),
      'model.created': t('teams.activity.modelCreated', 'created model {{name}}', { name: resourceName }),
      'settings.updated': t('teams.activity.settingsUpdated', 'updated team settings'),
    };

    return messages[activity.action] || activity.action;
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-start gap-3 animate-pulse">
            <div className="h-8 w-8 rounded-full bg-muted" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-muted rounded w-3/4" />
              <div className="h-3 bg-muted rounded w-1/4" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>{t('teams.noActivity', 'No activity yet')}</p>
        <p className="text-sm">{t('teams.noActivityDesc', 'Activity will appear here as team members work on projects.')}</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[400px]">
      <div className="space-y-4 pr-4">
        {activities.map((activity) => {
          const Icon = actionIcons[activity.action] || Edit;
          const colorClass = actionColors[activity.action] || 'bg-muted';

          return (
            <div key={activity.id} className="flex items-start gap-3">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-xs bg-primary/10 text-primary">
                  {getInitials(activity.profile?.name || 'U')}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 min-w-0">
                <p className="text-sm">
                  <span className="font-medium">{activity.profile?.name || 'Unknown'}</span>{' '}
                  <span className="text-muted-foreground">{getActionMessage(activity)}</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                </p>
              </div>
              
              <div className={`p-1.5 rounded-full ${colorClass}`}>
                <Icon className="h-3.5 w-3.5" />
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}
