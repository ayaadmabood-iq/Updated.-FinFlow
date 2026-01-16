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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useInviteMember, TeamMember } from '@/hooks/useTeams';
import { Loader2, Mail, UserPlus } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface InviteMemberDialogProps {
  teamId: string;
  teamName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InviteMemberDialog({ teamId, teamName, open, onOpenChange }: InviteMemberDialogProps) {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<TeamMember['role']>('editor');
  const inviteMember = useInviteMember();

  const roleDescriptions: Record<TeamMember['role'], string> = {
    owner: t('teams.roles.ownerDesc', 'Full control over the team'),
    admin: t('teams.roles.adminDesc', 'Can manage members and settings'),
    editor: t('teams.roles.editorDesc', 'Can edit projects and data'),
    viewer: t('teams.roles.viewerDesc', 'Can only view projects'),
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      toast({
        variant: 'destructive',
        title: t('teams.error', 'Error'),
        description: t('teams.emailRequired', 'Email is required'),
      });
      return;
    }

    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast({
        variant: 'destructive',
        title: t('teams.error', 'Error'),
        description: t('teams.invalidEmail', 'Please enter a valid email address'),
      });
      return;
    }

    try {
      await inviteMember.mutateAsync({ teamId, email, role });
      setEmail('');
      setRole('editor');
      onOpenChange(false);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: t('teams.error', 'Error'),
        description: error.message?.includes('duplicate')
          ? t('teams.alreadyInvited', 'This person has already been invited')
          : error.message,
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              {t('teams.inviteMember', 'Invite Member')}
            </DialogTitle>
            <DialogDescription>
              {t('teams.inviteDesc', 'Invite someone to join "{{name}}"', { name: teamName })}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t('teams.emailAddress', 'Email Address')}</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="colleague@company.com"
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">{t('teams.role', 'Role')}</Label>
              <Select value={role} onValueChange={(v) => setRole(v as TeamMember['role'])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="viewer">
                    <div className="flex flex-col items-start">
                      <span>{t('teams.roles.viewer', 'Viewer')}</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="editor">
                    <div className="flex flex-col items-start">
                      <span>{t('teams.roles.editor', 'Editor')}</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="admin">
                    <div className="flex flex-col items-start">
                      <span>{t('teams.roles.admin', 'Admin')}</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">{roleDescriptions[role]}</p>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button type="submit" disabled={inviteMember.isPending}>
              {inviteMember.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 me-1.5 animate-spin" />
                  {t('teams.sending', 'Sending...')}
                </>
              ) : (
                t('teams.sendInvite', 'Send Invite')
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
