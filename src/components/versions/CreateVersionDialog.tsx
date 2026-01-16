import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Save } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useCreateVersion } from '@/hooks/useVersions';

interface CreateVersionDialogProps {
  datasetId: string;
  trigger?: React.ReactNode;
}

export function CreateVersionDialog({ datasetId, trigger }: CreateVersionDialogProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const createVersion = useCreateVersion();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createVersion.mutateAsync({
      datasetId,
      name: name || undefined,
      description: description || undefined,
    });
    setName('');
    setDescription('');
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Save className="h-4 w-4 mr-2" />
            {t('versions.saveVersion', 'Save Version')}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('versions.createVersion', 'Create Version')}</DialogTitle>
          <DialogDescription>
            {t('versions.createDescription', 'Save a snapshot of the current dataset state')}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="version-name">{t('common.name', 'Name')}</Label>
              <Input
                id="version-name"
                placeholder={t('versions.namePlaceholder', 'e.g., Before major changes')}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="version-description">
                {t('common.description', 'Description')} ({t('common.optional', 'optional')})
              </Label>
              <Textarea
                id="version-description"
                placeholder={t('versions.descriptionPlaceholder', 'Describe what changed...')}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => setOpen(false)}>
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button type="submit" disabled={createVersion.isPending}>
              {createVersion.isPending
                ? t('common.saving', 'Saving...')
                : t('versions.saveVersion', 'Save Version')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
