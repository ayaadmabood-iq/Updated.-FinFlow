import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TeamMember, useUpdateMemberRole, useRemoveMember } from '@/hooks/useTeams';
import { useAuth } from '@/hooks/useAuth';
import { MoreHorizontal, Shield, Edit, Eye, Crown, UserMinus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MemberListProps {
  members: TeamMember[];
  teamId: string;
  currentUserRole: TeamMember['role'];
}

const roleIcons: Record<TeamMember['role'], React.ComponentType<{ className?: string }>> = {
  owner: Crown,
  admin: Shield,
  editor: Edit,
  viewer: Eye,
};

const roleColors: Record<TeamMember['role'], string> = {
  owner: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  admin: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  editor: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  viewer: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
};

export function MemberList({ members, teamId, currentUserRole }: MemberListProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const updateRole = useUpdateMemberRole();
  const removeMember = useRemoveMember();
  const [removingMember, setRemovingMember] = useState<TeamMember | null>(null);

  const canManageMembers = currentUserRole === 'owner' || currentUserRole === 'admin';

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleRoleChange = async (memberId: string, newRole: TeamMember['role']) => {
    await updateRole.mutateAsync({ memberId, role: newRole, teamId });
  };

  const handleRemoveMember = async () => {
    if (!removingMember) return;
    await removeMember.mutateAsync({ memberId: removingMember.id, teamId });
    setRemovingMember(null);
  };

  return (
    <>
      <div className="space-y-2">
        {members.map((member) => {
          const RoleIcon = roleIcons[member.role];
          const isCurrentUser = member.user_id === user?.id;
          const canModify = canManageMembers && member.role !== 'owner' && !isCurrentUser;

          return (
            <div
              key={member.id}
              className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {getInitials(member.profile?.name || 'U')}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">
                      {member.profile?.name || 'Unknown User'}
                      {isCurrentUser && (
                        <span className="text-muted-foreground font-normal"> ({t('teams.you', 'you')})</span>
                      )}
                    </p>
                  </div>
                  <p className="text-sm text-muted-foreground">{member.profile?.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {canModify ? (
                  <Select
                    value={member.role}
                    onValueChange={(value) => handleRoleChange(member.id, value as TeamMember['role'])}
                  >
                    <SelectTrigger className="w-[120px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="viewer">{t('teams.roles.viewer', 'Viewer')}</SelectItem>
                      <SelectItem value="editor">{t('teams.roles.editor', 'Editor')}</SelectItem>
                      <SelectItem value="admin">{t('teams.roles.admin', 'Admin')}</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Badge variant="secondary" className={cn('flex items-center gap-1', roleColors[member.role])}>
                    <RoleIcon className="h-3 w-3" />
                    {t(`teams.roles.${member.role}`, member.role)}
                  </Badge>
                )}

                {canModify && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => setRemovingMember(member)}
                      >
                        <UserMinus className="h-4 w-4 me-2" />
                        {t('teams.removeMember', 'Remove from team')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <AlertDialog open={!!removingMember} onOpenChange={() => setRemovingMember(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('teams.removeConfirmTitle', 'Remove Member')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('teams.removeConfirmDesc', 'Are you sure you want to remove {{name}} from the team? They will lose access to all shared projects.', {
                name: removingMember?.profile?.name || 'this member',
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel', 'Cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemoveMember} className="bg-destructive hover:bg-destructive/90">
              {t('teams.remove', 'Remove')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
