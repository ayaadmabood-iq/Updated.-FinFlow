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
import { Textarea } from '@/components/ui/textarea';
import { useCreateTeam, Team } from '@/hooks/useTeams';
import { Loader2, Users } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface CreateTeamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (team: Team) => void;
}

export function CreateTeamDialog({ open, onOpenChange, onCreated }: CreateTeamDialogProps) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const createTeam = useCreateTeam();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast({
        variant: 'destructive',
        title: t('teams.error', 'Error'),
        description: t('teams.nameRequired', 'Team name is required'),
      });
      return;
    }

    try {
      const team = await createTeam.mutateAsync({ name, description });
      toast({
        title: t('teams.created', 'Team created'),
        description: t('teams.createdDesc', 'Your team "{{name}}" has been created.', { name: team.name }),
      });
      setName('');
      setDescription('');
      onCreated?.(team);
      onOpenChange(false);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: t('teams.error', 'Error'),
        description: error.message,
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              {t('teams.createTeam', 'Create Team')}
            </DialogTitle>
            <DialogDescription>
              {t('teams.createTeamDesc', 'Create a team to collaborate with others on projects and training data.')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">{t('teams.teamName', 'Team Name')}</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('teams.teamNamePlaceholder', 'e.g. AI Research Team')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">{t('teams.description', 'Description')}</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t('teams.descriptionPlaceholder', 'What is this team working on?')}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button type="submit" disabled={createTeam.isPending}>
              {createTeam.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 me-1.5 animate-spin" />
                  {t('teams.creating', 'Creating...')}
                </>
              ) : (
                t('teams.create', 'Create Team')
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
