import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { TeamSwitcher } from '@/components/teams/TeamSwitcher';
import { MemberList } from '@/components/teams/MemberList';
import { ActivityFeed } from '@/components/teams/ActivityFeed';
import { InviteMemberDialog } from '@/components/teams/InviteMemberDialog';
import { 
  useTeams, useTeam, useTeamMembers, useTeamInvitations, 
  useUpdateTeam, useDeleteTeam, useCancelInvitation, Team, TeamMember 
} from '@/hooks/useTeams';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { 
  Users, Settings, Activity, UserPlus, Trash2, Save, 
  Loader2, Mail, Clock, X, Crown, Shield, AlertTriangle 
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function TeamSettings() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');

  const { data: teams = [] } = useTeams();
  const { data: team } = useTeam(selectedTeam?.id || null);
  const { data: members = [] } = useTeamMembers(selectedTeam?.id || null);
  const { data: invitations = [] } = useTeamInvitations(selectedTeam?.id || null);
  const updateTeam = useUpdateTeam();
  const deleteTeam = useDeleteTeam();
  const cancelInvitation = useCancelInvitation();

  // Get current user's role in the team
  const currentUserRole = useMemo(() => {
    if (!user || !members.length) return 'viewer' as TeamMember['role'];
    const membership = members.find(m => m.user_id === user.id);
    return membership?.role || 'viewer';
  }, [user, members]);

  const isAdmin = currentUserRole === 'owner' || currentUserRole === 'admin';
  const isOwner = currentUserRole === 'owner';

  // Sync edit state when team changes
  useMemo(() => {
    if (team) {
      setEditName(team.name);
      setEditDescription(team.description || '');
    }
  }, [team]);

  const handleSaveSettings = async () => {
    if (!selectedTeam) return;

    try {
      await updateTeam.mutateAsync({
        teamId: selectedTeam.id,
        input: { name: editName, description: editDescription },
      });
      toast({
        title: t('teams.settingsSaved', 'Settings saved'),
        description: t('teams.settingsSavedDesc', 'Team settings have been updated.'),
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: t('teams.error', 'Error'),
        description: error.message,
      });
    }
  };

  const handleDeleteTeam = async () => {
    if (!selectedTeam) return;

    try {
      await deleteTeam.mutateAsync(selectedTeam.id);
      toast({
        title: t('teams.deleted', 'Team deleted'),
        description: t('teams.deletedDesc', 'The team has been permanently deleted.'),
      });
      setSelectedTeam(null);
      setShowDeleteDialog(false);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: t('teams.error', 'Error'),
        description: error.message,
      });
    }
  };

  const handleCancelInvitation = async (invitationId: string) => {
    if (!selectedTeam) return;

    try {
      await cancelInvitation.mutateAsync({ invitationId, teamId: selectedTeam.id });
      toast({
        title: t('teams.invitationCancelled', 'Invitation cancelled'),
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: t('teams.error', 'Error'),
        description: error.message,
      });
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Users className="h-6 w-6 text-primary" />
              {t('teams.teamSettings', 'Team Settings')}
            </h1>
            <p className="text-muted-foreground">
              {t('teams.teamSettingsDesc', 'Manage your teams, members, and collaboration settings.')}
            </p>
          </div>
          <TeamSwitcher selectedTeam={selectedTeam} onSelectTeam={setSelectedTeam} />
        </div>

        {!selectedTeam ? (
          /* No Team Selected */
          <Card>
            <CardContent className="py-12 text-center">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">{t('teams.selectTeamPrompt', 'Select a Team')}</h3>
              <p className="text-muted-foreground mb-4">
                {t('teams.selectTeamDesc', 'Choose a team from the dropdown above to manage its settings, or create a new team.')}
              </p>
            </CardContent>
          </Card>
        ) : (
          /* Team Settings Tabs */
          <Tabs defaultValue="members" className="space-y-6">
            <TabsList>
              <TabsTrigger value="members" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                {t('teams.members', 'Members')}
                <Badge variant="secondary" className="ml-1">{members.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="activity" className="flex items-center gap-2">
                <Activity className="h-4 w-4" />
                {t('teams.activity', 'Activity')}
              </TabsTrigger>
              {isAdmin && (
                <TabsTrigger value="settings" className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  {t('teams.settings', 'Settings')}
                </TabsTrigger>
              )}
            </TabsList>

            {/* Members Tab */}
            <TabsContent value="members" className="space-y-6">
              {/* Invite Button */}
              {isAdmin && (
                <div className="flex justify-end">
                  <Button onClick={() => setShowInviteDialog(true)}>
                    <UserPlus className="h-4 w-4 me-1.5" />
                    {t('teams.inviteMember', 'Invite Member')}
                  </Button>
                </div>
              )}

              {/* Members List */}
              <Card>
                <CardHeader>
                  <CardTitle>{t('teams.teamMembers', 'Team Members')}</CardTitle>
                  <CardDescription>
                    {t('teams.teamMembersDesc', 'People who have access to this team\'s projects and resources.')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <MemberList members={members} teamId={selectedTeam.id} currentUserRole={currentUserRole} />
                </CardContent>
              </Card>

              {/* Pending Invitations */}
              {isAdmin && invitations.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Mail className="h-5 w-5" />
                      {t('teams.pendingInvitations', 'Pending Invitations')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {invitations.map((invitation) => (
                        <div
                          key={invitation.id}
                          className="flex items-center justify-between p-3 rounded-lg border"
                        >
                          <div className="flex items-center gap-3">
                            <Mail className="h-5 w-5 text-muted-foreground" />
                            <div>
                              <p className="font-medium">{invitation.email}</p>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Badge variant="outline">{invitation.role}</Badge>
                                <span>•</span>
                                <Clock className="h-3 w-3" />
                                <span>
                                  {t('teams.expiresIn', 'Expires {{time}}', {
                                    time: formatDistanceToNow(new Date(invitation.expires_at), { addSuffix: true }),
                                  })}
                                </span>
                              </div>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCancelInvitation(invitation.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Activity Tab */}
            <TabsContent value="activity">
              <Card>
                <CardHeader>
                  <CardTitle>{t('teams.recentActivity', 'Recent Activity')}</CardTitle>
                  <CardDescription>
                    {t('teams.recentActivityDesc', 'A log of recent actions taken by team members.')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ActivityFeed teamId={selectedTeam.id} />
                </CardContent>
              </Card>
            </TabsContent>

            {/* Settings Tab */}
            {isAdmin && (
              <TabsContent value="settings" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>{t('teams.generalSettings', 'General Settings')}</CardTitle>
                    <CardDescription>
                      {t('teams.generalSettingsDesc', 'Update your team\'s name and description.')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="teamName">{t('teams.teamName', 'Team Name')}</Label>
                      <Input
                        id="teamName"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="teamDesc">{t('teams.description', 'Description')}</Label>
                      <Textarea
                        id="teamDesc"
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        rows={3}
                      />
                    </div>
                    <Button onClick={handleSaveSettings} disabled={updateTeam.isPending}>
                      {updateTeam.isPending ? (
                        <Loader2 className="h-4 w-4 me-1.5 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4 me-1.5" />
                      )}
                      {t('common.save', 'Save Changes')}
                    </Button>
                  </CardContent>
                </Card>

                {/* Danger Zone */}
                {isOwner && (
                  <Card className="border-destructive/50">
                    <CardHeader>
                      <CardTitle className="text-destructive flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5" />
                        {t('teams.dangerZone', 'Danger Zone')}
                      </CardTitle>
                      <CardDescription>
                        {t('teams.dangerZoneDesc', 'Irreversible actions that affect the entire team.')}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button variant="destructive" onClick={() => setShowDeleteDialog(true)}>
                        <Trash2 className="h-4 w-4 me-1.5" />
                        {t('teams.deleteTeam', 'Delete Team')}
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            )}
          </Tabs>
        )}

        {/* Invite Dialog */}
        {selectedTeam && (
          <InviteMemberDialog
            teamId={selectedTeam.id}
            teamName={selectedTeam.name}
            open={showInviteDialog}
            onOpenChange={setShowInviteDialog}
          />
        )}

        {/* Delete Confirmation */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('teams.deleteTeamConfirm', 'Delete Team?')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('teams.deleteTeamConfirmDesc', 'This will permanently delete "{{name}}" and remove all members. Shared projects will no longer be accessible to team members. This action cannot be undone.', {
                  name: selectedTeam?.name,
                })}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('common.cancel', 'Cancel')}</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteTeam}
                className="bg-destructive hover:bg-destructive/90"
              >
                {t('teams.deleteTeam', 'Delete Team')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
