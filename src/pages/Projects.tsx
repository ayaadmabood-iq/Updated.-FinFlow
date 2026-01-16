// Projects list page
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useProjects, useCreateProject, useDeleteProject, useUpdateProject } from '@/hooks/useProjects';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, MoreHorizontal, Archive, Trash2, FolderOpen, FileText } from 'lucide-react';
import type { Project } from '@/types';

export default function Projects() {
  const { data, isLoading } = useProjects();
  const createProject = useCreateProject();
  const deleteProject = useDeleteProject();
  const updateProject = useUpdateProject();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newProject, setNewProject] = useState({ name: '', description: '' });
  const { t } = useTranslation();

  const handleCreate = async () => {
    if (!newProject.name.trim()) return;
    await createProject.mutateAsync(newProject);
    setNewProject({ name: '', description: '' });
    setIsCreateOpen(false);
  };

  const handleArchive = (e: React.MouseEvent, project: Project) => {
    e.preventDefault();
    e.stopPropagation();
    updateProject.mutate({ id: project.id, input: { status: project.status === 'archived' ? 'active' : 'archived' } });
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirm(t('projects.deleteConfirm'))) {
      deleteProject.mutate(id);
    }
  };

  const statusColors: Record<Project['status'], string> = {
    active: 'bg-success/10 text-success border-success/20',
    draft: 'bg-warning/10 text-warning border-warning/20',
    archived: 'bg-muted text-muted-foreground border-border',
  };

  return (
    <DashboardLayout
      title={t('projects.title')}
      description={t('projects.description')}
      actions={
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 me-2" />{t('projects.create')}</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{t('projects.create')}</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>{t('projects.name')}</Label>
                <Input value={newProject.name} onChange={(e) => setNewProject(p => ({ ...p, name: e.target.value }))} placeholder={t('projects.name')} />
              </div>
              <div className="space-y-2">
                <Label>{t('projects.projectDescription')}</Label>
                <Textarea value={newProject.description} onChange={(e) => setNewProject(p => ({ ...p, description: e.target.value }))} placeholder={t('projects.projectDescription')} />
              </div>
              <Button onClick={handleCreate} disabled={!newProject.name.trim() || createProject.isPending} className="w-full">
                {createProject.isPending ? t('common.loading') : t('projects.create')}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      }
    >
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-40" />)}
        </div>
      ) : data?.data.length ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {data.data.map((project) => (
            <Link key={project.id} to={`/projects/${project.id}`}>
              <Card className="group hover:border-primary/50 transition-colors cursor-pointer h-full">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <FolderOpen className="h-5 w-5 text-primary" />
                      <CardTitle className="text-base">{project.name}</CardTitle>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 opacity-0 group-hover:opacity-100"
                          onClick={(e) => e.preventDefault()}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => handleArchive(e as unknown as React.MouseEvent, project)}>
                          <Archive className="h-4 w-4 me-2" />{project.status === 'archived' ? t('projects.active') : t('projects.archived')}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => handleDelete(e as unknown as React.MouseEvent, project.id)} className="text-destructive">
                          <Trash2 className="h-4 w-4 me-2" />{t('common.delete')}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <Badge variant="outline" className={statusColors[project.status]}>{t(`projects.${project.status}`)}</Badge>
                </CardHeader>
                <CardContent>
                  <CardDescription className="line-clamp-2 mb-3">{project.description}</CardDescription>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <FileText className="h-3 w-3" />{project.documentCount} {t('projects.documents').toLowerCase()}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card className="flex flex-col items-center justify-center py-12">
          <FolderOpen className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground mb-4">{t('projects.empty')}</p>
          <Button onClick={() => setIsCreateOpen(true)}><Plus className="h-4 w-4 me-2" />{t('projects.create')}</Button>
        </Card>
      )}
    </DashboardLayout>
  );
}
