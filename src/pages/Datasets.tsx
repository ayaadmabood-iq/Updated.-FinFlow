import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { DatasetBuilderDashboard } from '@/components/training/DatasetBuilderDashboard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { Database, FolderOpen, Loader2, ArrowRight } from 'lucide-react';

export default function Datasets() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedProjectId = searchParams.get('project');

  // Fetch user's projects
  const { data: projects, isLoading: projectsLoading } = useQuery({
    queryKey: ['projects-for-datasets'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('projects')
        .select('id, name, document_count, status')
        .eq('owner_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Get selected project details
  const selectedProject = projects?.find(p => p.id === selectedProjectId);

  const handleProjectChange = (projectId: string) => {
    setSearchParams({ project: projectId });
  };

  if (projectsLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Database className="h-6 w-6" />
              {t('training.datasets', 'Training Datasets')}
            </h1>
            <p className="text-muted-foreground mt-1">
              {t('training.datasetsDescription', 'Manage fine-tuning datasets across your projects')}
            </p>
          </div>
        </div>

        {/* Project Selector */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FolderOpen className="h-4 w-4" />
              {t('training.selectProject', 'Select Project')}
            </CardTitle>
            <CardDescription>
              {t('training.selectProjectDesc', 'Choose a project to view and manage its training datasets')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!projects?.length ? (
              <div className="text-center py-8">
                <FolderOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-medium mb-2">{t('projects.noProjects', 'No Projects Yet')}</h3>
                <p className="text-muted-foreground text-sm mb-4">
                  {t('training.createProjectFirst', 'Create a project and upload documents to start building datasets')}
                </p>
                <Button asChild>
                  <Link to="/projects">
                    {t('projects.goToProjects', 'Go to Projects')}
                    <ArrowRight className="h-4 w-4 ms-2" />
                  </Link>
                </Button>
              </div>
            ) : (
              <Select value={selectedProjectId || ''} onValueChange={handleProjectChange}>
                <SelectTrigger className="w-full md:w-[400px]">
                  <SelectValue placeholder={t('training.chooseProject', 'Choose a project...')} />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      <div className="flex items-center gap-2">
                        <FolderOpen className="h-4 w-4" />
                        <span>{project.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {project.document_count} docs
                        </Badge>
                        <Badge 
                          variant={project.status === 'active' ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {project.status}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </CardContent>
        </Card>

        {/* Dataset Builder Dashboard */}
        {selectedProjectId && selectedProject && (
          <DatasetBuilderDashboard
            projectId={selectedProjectId}
            documentCount={selectedProject.document_count}
          />
        )}

        {/* Empty State when no project selected */}
        {!selectedProjectId && projects?.length > 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Database className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">
                {t('training.selectProjectPrompt', 'Select a Project')}
              </h3>
              <p className="text-muted-foreground text-center max-w-md">
                {t('training.selectProjectPromptDesc', 'Choose a project above to view and manage its training datasets')}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
