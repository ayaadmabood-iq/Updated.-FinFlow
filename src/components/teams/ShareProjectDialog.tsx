import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useTeams, Team } from '@/hooks/useTeams';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { Loader2, Share2, Users, Eye, Edit, Shield } from 'lucide-react';

interface ShareProjectDialogProps {
  projectId: string;
  projectName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Permission = 'view' | 'edit' | 'admin';

const permissionIcons: Record<Permission, React.ComponentType<{ className?: string }>> = {
  view: Eye,
  edit: Edit,
  admin: Shield,
};

export function ShareProjectDialog({ projectId, projectName, open, onOpenChange }: ShareProjectDialogProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { data: teams = [] } = useTeams();
  const [selectedTeam, setSelectedTeam] = useState<string>('');
  const [permission, setPermission] = useState<Permission>('view');
  const [loading, setLoading] = useState(false);

  const handleShare = async () => {
    if (!selectedTeam || !user) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('project_shares')
        .upsert({
          project_id: projectId,
          team_id: selectedTeam,
          permission,
          shared_by: user.id,
        });

      if (error) throw error;

      const team = teams.find(t => t.id === selectedTeam);
      toast({
        title: t('teams.projectShared', 'Project Shared'),
        description: t('teams.projectSharedDesc', '"{{project}}" is now shared with {{team}}', {
          project: projectName,
          team: team?.name || 'the team',
        }),
      });

      onOpenChange(false);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: t('teams.error', 'Error'),
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  if (teams.length === 0) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Share2 className="h-5 w-5 text-primary" />
              {t('teams.shareProject', 'Share Project')}
            </DialogTitle>
          </DialogHeader>
          
          <div className="py-6 text-center">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {t('teams.noTeamsToShare', 'You need to create or join a team before sharing projects.')}
            </p>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {t('common.close', 'Close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5 text-primary" />
            {t('teams.shareProject', 'Share Project')}
          </DialogTitle>
          <DialogDescription>
            {t('teams.shareProjectDesc', 'Share "{{name}}" with a team', { name: projectName })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>{t('teams.selectTeam', 'Select Team')}</Label>
            <Select value={selectedTeam} onValueChange={setSelectedTeam}>
              <SelectTrigger>
                <SelectValue placeholder={t('teams.choosePlaceholder', 'Choose a team')} />
              </SelectTrigger>
              <SelectContent>
                {teams.map((team) => (
                  <SelectItem key={team.id} value={team.id}>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      {team.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t('teams.permission', 'Permission Level')}</Label>
            <Select value={permission} onValueChange={(v) => setPermission(v as Permission)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="view">
                  <div className="flex items-center gap-2">
                    <Eye className="h-4 w-4" />
                    {t('teams.permissions.view', 'View Only')}
                  </div>
                </SelectItem>
                <SelectItem value="edit">
                  <div className="flex items-center gap-2">
                    <Edit className="h-4 w-4" />
                    {t('teams.permissions.edit', 'Can Edit')}
                  </div>
                </SelectItem>
                <SelectItem value="admin">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    {t('teams.permissions.admin', 'Full Access')}
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
              {(() => {
                const Icon = permissionIcons[permission];
                return <Icon className="h-4 w-4 text-muted-foreground" />;
              })()}
              <p className="text-xs text-muted-foreground">
                {permission === 'view' && t('teams.permissionViewDesc', 'Team members can view project data but cannot make changes.')}
                {permission === 'edit' && t('teams.permissionEditDesc', 'Team members can edit datasets and training configurations.')}
                {permission === 'admin' && t('teams.permissionAdminDesc', 'Team members have full access including sharing and deletion.')}
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button onClick={handleShare} disabled={!selectedTeam || loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 me-1.5 animate-spin" />
                {t('teams.sharing', 'Sharing...')}
              </>
            ) : (
              <>
                <Share2 className="h-4 w-4 me-1.5" />
                {t('teams.share', 'Share')}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
