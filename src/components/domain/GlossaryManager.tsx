// Glossary Manager - Domain vocabulary and term definitions

import { useState } from 'react';
import {
  useGlossaries,
  useCreateGlossary,
  useUpdateGlossary,
  useDeleteGlossary,
  useGlossaryTerms,
  useCreateGlossaryTerm,
  useUpdateGlossaryTerm,
  useDeleteGlossaryTerm,
  type ProjectGlossary,
  type GlossaryTerm,
} from '@/hooks/useDomainAI';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import {
  Book,
  Plus,
  Pencil,
  Trash2,
  ChevronRight,
  Search,
  Tag,
  Languages,
} from 'lucide-react';

interface GlossaryManagerProps {
  projectId: string;
}

export function GlossaryManager({ projectId }: GlossaryManagerProps) {
  const { data: glossaries, isLoading } = useGlossaries(projectId);
  const createGlossary = useCreateGlossary();
  const updateGlossary = useUpdateGlossary();
  const deleteGlossary = useDeleteGlossary();

  const [selectedGlossary, setSelectedGlossary] = useState<ProjectGlossary | null>(null);
  const [isCreateGlossaryOpen, setIsCreateGlossaryOpen] = useState(false);
  const [newGlossaryName, setNewGlossaryName] = useState('');
  const [newGlossaryDescription, setNewGlossaryDescription] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const handleCreateGlossary = async () => {
    const result = await createGlossary.mutateAsync({
      projectId,
      name: newGlossaryName,
      description: newGlossaryDescription || undefined,
    });
    setIsCreateGlossaryOpen(false);
    setNewGlossaryName('');
    setNewGlossaryDescription('');
    setSelectedGlossary(result);
  };

  const handleDeleteGlossary = async (glossary: ProjectGlossary) => {
    await deleteGlossary.mutateAsync({ id: glossary.id, projectId });
    if (selectedGlossary?.id === glossary.id) {
      setSelectedGlossary(null);
    }
  };

  const handleToggleActive = async (glossary: ProjectGlossary) => {
    await updateGlossary.mutateAsync({
      id: glossary.id,
      updates: { isActive: !glossary.isActive },
    });
  };

  const handleToggleAutoInject = async (glossary: ProjectGlossary) => {
    await updateGlossary.mutateAsync({
      id: glossary.id,
      updates: { autoInject: !glossary.autoInject },
    });
  };

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-3">
        <Skeleton className="h-64" />
        <Skeleton className="h-64 md:col-span-2" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Book className="h-5 w-5" />
            Project Glossary
          </h3>
          <p className="text-sm text-muted-foreground">
            Define domain-specific terms for accurate AI understanding
          </p>
        </div>
        <Dialog open={isCreateGlossaryOpen} onOpenChange={setIsCreateGlossaryOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Glossary
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Glossary</DialogTitle>
              <DialogDescription>
                Create a new vocabulary collection for your domain
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="glossaryName">Name</Label>
                <Input
                  id="glossaryName"
                  value={newGlossaryName}
                  onChange={(e) => setNewGlossaryName(e.target.value)}
                  placeholder="e.g., Legal Terms"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="glossaryDescription">Description</Label>
                <Textarea
                  id="glossaryDescription"
                  value={newGlossaryDescription}
                  onChange={(e) => setNewGlossaryDescription(e.target.value)}
                  placeholder="Brief description..."
                  rows={2}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateGlossaryOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCreateGlossary}
                disabled={!newGlossaryName || createGlossary.isPending}
              >
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {/* Glossary List */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Glossaries</CardTitle>
          </CardHeader>
          <CardContent>
            {(!glossaries || glossaries.length === 0) ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No glossaries yet
              </p>
            ) : (
              <div className="space-y-2">
                {glossaries.map(glossary => (
                  <div
                    key={glossary.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedGlossary?.id === glossary.id
                        ? 'border-primary bg-primary/5'
                        : 'hover:border-primary/50'
                    }`}
                    onClick={() => setSelectedGlossary(glossary)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-medium text-sm">{glossary.name}</div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      {glossary.isActive ? (
                        <Badge variant="default" className="text-xs">Active</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">Inactive</Badge>
                      )}
                      {glossary.autoInject && (
                        <Badge variant="outline" className="text-xs">Auto-inject</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Terms Panel */}
        <Card className="md:col-span-2">
          {selectedGlossary ? (
            <GlossaryTermsPanel
              glossary={selectedGlossary}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onToggleActive={() => handleToggleActive(selectedGlossary)}
              onToggleAutoInject={() => handleToggleAutoInject(selectedGlossary)}
              onDelete={() => handleDeleteGlossary(selectedGlossary)}
            />
          ) : (
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Book className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                Select a glossary to view and manage terms
              </p>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}

// Terms Panel Component
function GlossaryTermsPanel({
  glossary,
  searchQuery,
  onSearchChange,
  onToggleActive,
  onToggleAutoInject,
  onDelete,
}: {
  glossary: ProjectGlossary;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onToggleActive: () => void;
  onToggleAutoInject: () => void;
  onDelete: () => void;
}) {
  const { data: terms, isLoading } = useGlossaryTerms(glossary.id);
  const createTerm = useCreateGlossaryTerm();
  const updateTerm = useUpdateGlossaryTerm();
  const deleteTerm = useDeleteGlossaryTerm();

  const [isAddTermOpen, setIsAddTermOpen] = useState(false);
  const [editingTerm, setEditingTerm] = useState<GlossaryTerm | null>(null);
  const [termForm, setTermForm] = useState({
    term: '',
    definition: '',
    aliases: '',
    category: '',
    doNotTranslate: false,
  });

  const resetTermForm = () => {
    setTermForm({
      term: '',
      definition: '',
      aliases: '',
      category: '',
      doNotTranslate: false,
    });
  };

  const handleAddTerm = async () => {
    await createTerm.mutateAsync({
      glossaryId: glossary.id,
      term: termForm.term,
      definition: termForm.definition,
      aliases: termForm.aliases.split(',').map(a => a.trim()).filter(Boolean),
      category: termForm.category || undefined,
      doNotTranslate: termForm.doNotTranslate,
    });
    setIsAddTermOpen(false);
    resetTermForm();
  };

  const handleUpdateTerm = async () => {
    if (!editingTerm) return;
    await updateTerm.mutateAsync({
      id: editingTerm.id,
      glossaryId: glossary.id,
      updates: {
        term: termForm.term,
        definition: termForm.definition,
        aliases: termForm.aliases.split(',').map(a => a.trim()).filter(Boolean),
        category: termForm.category || undefined,
        doNotTranslate: termForm.doNotTranslate,
      },
    });
    setEditingTerm(null);
    resetTermForm();
  };

  const handleDeleteTerm = async (term: GlossaryTerm) => {
    await deleteTerm.mutateAsync({ id: term.id, glossaryId: glossary.id });
  };

  const openEditTerm = (term: GlossaryTerm) => {
    setEditingTerm(term);
    setTermForm({
      term: term.term,
      definition: term.definition,
      aliases: term.aliases.join(', '),
      category: term.category || '',
      doNotTranslate: term.doNotTranslate,
    });
  };

  const filteredTerms = terms?.filter(term =>
    term.term.toLowerCase().includes(searchQuery.toLowerCase()) ||
    term.definition.toLowerCase().includes(searchQuery.toLowerCase()) ||
    term.aliases.some(a => a.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const TermForm = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="term">Term</Label>
        <Input
          id="term"
          value={termForm.term}
          onChange={(e) => setTermForm(prev => ({ ...prev, term: e.target.value }))}
          placeholder="e.g., ROI"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="definition">Definition</Label>
        <Textarea
          id="definition"
          value={termForm.definition}
          onChange={(e) => setTermForm(prev => ({ ...prev, definition: e.target.value }))}
          placeholder="What does this term mean in your domain?"
          rows={3}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="aliases">Aliases (comma-separated)</Label>
        <Input
          id="aliases"
          value={termForm.aliases}
          onChange={(e) => setTermForm(prev => ({ ...prev, aliases: e.target.value }))}
          placeholder="e.g., Return on Investment, RoI"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="category">Category</Label>
        <Input
          id="category"
          value={termForm.category}
          onChange={(e) => setTermForm(prev => ({ ...prev, category: e.target.value }))}
          placeholder="e.g., Financial Metrics"
        />
      </div>
      <div className="flex items-center gap-2">
        <Switch
          id="doNotTranslate"
          checked={termForm.doNotTranslate}
          onCheckedChange={(checked) => setTermForm(prev => ({ ...prev, doNotTranslate: checked }))}
        />
        <Label htmlFor="doNotTranslate" className="flex items-center gap-1">
          <Languages className="h-4 w-4" />
          Keep term as-is (don't translate)
        </Label>
      </div>
    </div>
  );

  return (
    <>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">{glossary.name}</CardTitle>
            {glossary.description && (
              <CardDescription>{glossary.description}</CardDescription>
            )}
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Switch
                checked={glossary.isActive}
                onCheckedChange={onToggleActive}
              />
              <span className="text-sm">Active</span>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={glossary.autoInject}
                onCheckedChange={onToggleAutoInject}
              />
              <span className="text-sm">Auto-inject</span>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Glossary?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will delete all terms in this glossary.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={onDelete}>Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search terms..."
              className="pl-9"
            />
          </div>
          <Dialog open={isAddTermOpen} onOpenChange={setIsAddTermOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetTermForm}>
                <Plus className="h-4 w-4 mr-2" />
                Add Term
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Term</DialogTitle>
                <DialogDescription>
                  Add a new term to your glossary
                </DialogDescription>
              </DialogHeader>
              <TermForm />
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddTermOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleAddTerm}
                  disabled={!termForm.term || !termForm.definition || createTerm.isPending}
                >
                  Add Term
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : (!filteredTerms || filteredTerms.length === 0) ? (
          <div className="text-center py-8 text-muted-foreground">
            {searchQuery ? 'No terms match your search' : 'No terms yet. Add your first term!'}
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="space-y-2">
              {filteredTerms.map(term => (
                <div
                  key={term.id}
                  className="p-3 border rounded-lg hover:border-primary/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{term.term}</span>
                        {term.doNotTranslate && (
                          <Badge variant="outline" className="text-xs">
                            <Languages className="h-3 w-3 mr-1" />
                            Keep
                          </Badge>
                        )}
                        {term.category && (
                          <Badge variant="secondary" className="text-xs">
                            <Tag className="h-3 w-3 mr-1" />
                            {term.category}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {term.definition}
                      </p>
                      {term.aliases.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {term.aliases.map((alias, i) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              {alias}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 ml-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditTerm(term)}
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
                            <AlertDialogTitle>Delete Term?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteTerm(term)}>
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>

      {/* Edit Term Dialog */}
      <Dialog open={!!editingTerm} onOpenChange={(open) => !open && setEditingTerm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Term</DialogTitle>
            <DialogDescription>
              Update the term definition
            </DialogDescription>
          </DialogHeader>
          <TermForm />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingTerm(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleUpdateTerm}
              disabled={!termForm.term || !termForm.definition || updateTerm.isPending}
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
