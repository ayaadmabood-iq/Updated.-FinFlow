// Style Profile Manager - Create and manage AI writing styles

import { useState } from 'react';
import { 
  useStyleProfiles, 
  useCreateStyleProfile, 
  useUpdateStyleProfile, 
  useDeleteStyleProfile,
  type StyleProfile 
} from '@/hooks/useDomainAI';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { 
  Palette, 
  Plus, 
  Pencil, 
  Trash2, 
  Check, 
  Sparkles,
  Globe
} from 'lucide-react';

interface StyleProfileManagerProps {
  projectId: string;
}

const TONES = [
  { value: 'professional', label: 'Professional', description: 'Business-appropriate, clear and formal' },
  { value: 'casual', label: 'Casual', description: 'Friendly and conversational' },
  { value: 'formal', label: 'Formal', description: 'Highly structured and official' },
  { value: 'technical', label: 'Technical', description: 'Precise with technical terminology' },
  { value: 'creative', label: 'Creative', description: 'Imaginative and expressive' },
];

const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'ar', label: 'Arabic' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
  { value: 'zh', label: 'Chinese' },
  { value: 'hi', label: 'Hindi' },
];

export function StyleProfileManager({ projectId }: StyleProfileManagerProps) {
  const { data: profiles, isLoading } = useStyleProfiles(projectId);
  const createProfile = useCreateStyleProfile();
  const updateProfile = useUpdateStyleProfile();
  const deleteProfile = useDeleteStyleProfile();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<StyleProfile | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    tone: 'professional',
    formalityLevel: 5,
    writingStyle: '',
    language: 'en',
    customInstructions: '',
  });

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      tone: 'professional',
      formalityLevel: 5,
      writingStyle: '',
      language: 'en',
      customInstructions: '',
    });
  };

  const handleCreate = async () => {
    await createProfile.mutateAsync({
      projectId,
      ...formData,
    });
    setIsCreateOpen(false);
    resetForm();
  };

  const handleUpdate = async () => {
    if (!editingProfile) return;
    await updateProfile.mutateAsync({
      id: editingProfile.id,
      updates: formData,
    });
    setEditingProfile(null);
    resetForm();
  };

  const handleDelete = async (profile: StyleProfile) => {
    await deleteProfile.mutateAsync({ id: profile.id, projectId });
  };

  const handleActivate = async (profile: StyleProfile) => {
    // Deactivate all, activate this one
    for (const p of profiles || []) {
      if (p.isActive && p.id !== profile.id) {
        await updateProfile.mutateAsync({ id: p.id, updates: { isActive: false } });
      }
    }
    await updateProfile.mutateAsync({ id: profile.id, updates: { isActive: true } });
  };

  const openEdit = (profile: StyleProfile) => {
    setEditingProfile(profile);
    setFormData({
      name: profile.name,
      description: profile.description || '',
      tone: profile.tone,
      formalityLevel: profile.formalityLevel,
      writingStyle: profile.writingStyle || '',
      language: profile.language,
      customInstructions: profile.customInstructions || '',
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  const ProfileForm = () => (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Profile Name</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="e.g., Legal Formal"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="language">Language</Label>
          <Select
            value={formData.language}
            onValueChange={(value) => setFormData(prev => ({ ...prev, language: value }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGES.map(lang => (
                <SelectItem key={lang.value} value={lang.value}>
                  {lang.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Input
          id="description"
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          placeholder="Brief description of this style"
        />
      </div>

      <div className="space-y-2">
        <Label>Tone</Label>
        <div className="grid gap-2 md:grid-cols-3">
          {TONES.map(tone => (
            <div
              key={tone.value}
              className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                formData.tone === tone.value
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
              }`}
              onClick={() => setFormData(prev => ({ ...prev, tone: tone.value }))}
            >
              <div className="font-medium text-sm">{tone.label}</div>
              <div className="text-xs text-muted-foreground">{tone.description}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Formality Level: {formData.formalityLevel}/10</Label>
        <Slider
          value={[formData.formalityLevel]}
          onValueChange={([value]) => setFormData(prev => ({ ...prev, formalityLevel: value }))}
          min={1}
          max={10}
          step={1}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Very Casual</span>
          <span>Very Formal</span>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="writingStyle">Writing Style Guidelines</Label>
        <Textarea
          id="writingStyle"
          value={formData.writingStyle}
          onChange={(e) => setFormData(prev => ({ ...prev, writingStyle: e.target.value }))}
          placeholder="Describe specific writing style preferences..."
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="customInstructions">Custom Instructions</Label>
        <Textarea
          id="customInstructions"
          value={formData.customInstructions}
          onChange={(e) => setFormData(prev => ({ ...prev, customInstructions: e.target.value }))}
          placeholder="Additional instructions for the AI..."
          rows={4}
        />
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Style Profiles
          </h3>
          <p className="text-sm text-muted-foreground">
            Define how the AI should write for your project
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              New Profile
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Style Profile</DialogTitle>
              <DialogDescription>
                Define a new writing style for your AI assistant
              </DialogDescription>
            </DialogHeader>
            <ProfileForm />
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleCreate} 
                disabled={!formData.name || createProfile.isPending}
              >
                Create Profile
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {(!profiles || profiles.length === 0) ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Sparkles className="h-12 w-12 text-muted-foreground mb-4" />
            <h4 className="font-semibold mb-2">No Style Profiles Yet</h4>
            <p className="text-sm text-muted-foreground text-center mb-4">
              Create your first style profile to customize how the AI writes
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {profiles.map(profile => (
            <Card key={profile.id} className={profile.isActive ? 'border-primary' : ''}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      {profile.name}
                      {profile.isActive && (
                        <Badge variant="default" className="text-xs">
                          <Check className="h-3 w-3 mr-1" />
                          Active
                        </Badge>
                      )}
                    </CardTitle>
                    {profile.description && (
                      <CardDescription className="text-sm">
                        {profile.description}
                      </CardDescription>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEdit(profile)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Style Profile?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(profile)}>
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2 mb-3">
                  <Badge variant="outline">{profile.tone}</Badge>
                  <Badge variant="outline">
                    <Globe className="h-3 w-3 mr-1" />
                    {LANGUAGES.find(l => l.value === profile.language)?.label || profile.language}
                  </Badge>
                  <Badge variant="outline">
                    Formality: {profile.formalityLevel}/10
                  </Badge>
                </div>
                {!profile.isActive && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => handleActivate(profile)}
                  >
                    Activate This Profile
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editingProfile} onOpenChange={(open) => !open && setEditingProfile(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Style Profile</DialogTitle>
            <DialogDescription>
              Update the writing style settings
            </DialogDescription>
          </DialogHeader>
          <ProfileForm />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingProfile(null)}>
              Cancel
            </Button>
            <Button 
              onClick={handleUpdate} 
              disabled={!formData.name || updateProfile.isPending}
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
