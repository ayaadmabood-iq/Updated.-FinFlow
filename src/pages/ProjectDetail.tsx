import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, FolderOpen, FileText, Loader2, Layers, Database, GitBranch, Save, Settings, DollarSign, LayoutTemplate } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useProject, useUpdateChunkingSettings } from '@/hooks/useProjects';
import { useDocuments } from '@/hooks/useDocuments';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileUploadZone } from '@/components/documents/FileUploadZone';
import { FileList } from '@/components/documents/FileList';
import { ChunkViewer } from '@/components/documents/ChunkViewer';
import { DocumentSummary } from '@/components/documents/DocumentSummary';
import { VersionHistory } from '@/components/versions/VersionHistory';
import { CreateVersionDialog } from '@/components/versions/CreateVersionDialog';
import { RestoreVersionDialog } from '@/components/versions/RestoreVersionDialog';
import { VersionCompareDialog } from '@/components/versions/VersionCompareDialog';
import { VersionBadge } from '@/components/versions/VersionBadge';
import { ChunkingSettingsCard } from '@/components/project/ChunkingSettingsCard';
import { BudgetSettingsCard } from '@/components/budget/BudgetSettingsCard';
import { ReportBuilder } from '@/components/reports/ReportBuilder';
import { DatasetVersion } from '@/hooks/useVersions';
import { supabase } from '@/integrations/supabase/client';
import type { Project, ChunkingSettings } from '@/types';

const statusColors: Record<Project['status'], string> = {
  active: 'bg-success/10 text-success border-success/20',
  draft: 'bg-warning/10 text-warning border-warning/20',
  archived: 'bg-muted text-muted-foreground border-border',
};

export default function ProjectDetail() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: project, isLoading } = useProject(id || '');
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  
  const { data: docsData } = useDocuments(id || '', 1, 100);
  const updateChunkingSettings = useUpdateChunkingSettings(id || '');
  
  // Fetch actual training datasets for version control
  const { data: datasets } = useQuery({
    queryKey: ['datasets', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('training_datasets')
        .select('id, name, status, total_pairs, created_at')
        .eq('project_id', id!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!id
  });

  // Version control state
  const [selectedDatasetId, setSelectedDatasetId] = useState<string | null>(null);
  const [versionToRestore, setVersionToRestore] = useState<DatasetVersion | null>(null);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [compareVersion, setCompareVersion] = useState<DatasetVersion | null>(null);
  const [compareDialogOpen, setCompareDialogOpen] = useState(false);

  // Auto-select first dataset when available
  useEffect(() => {
    if (datasets?.length && !selectedDatasetId) {
      setSelectedDatasetId(datasets[0].id);
    }
  }, [datasets, selectedDatasetId]);

  if (isLoading) {
    return (
      <DashboardLayout title={t('common.loading')} description="">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 text-primary animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  if (!project) {
    return (
      <DashboardLayout title={t('common.noResults')} description="">
        <Card className="flex flex-col items-center justify-center py-12">
          <FolderOpen className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground mb-4">{t('common.noResults')}</p>
          <Button asChild>
            <Link to="/projects">
              <ArrowLeft className="h-4 w-4 me-2" />
              {t('common.back')}
            </Link>
          </Button>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title={project.name}
      description={project.description}
      actions={
        <Button variant="outline" onClick={() => navigate('/projects')}>
          <ArrowLeft className="h-4 w-4 me-2" />
          {t('common.back')}
        </Button>
      }
    >
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">{t('projectDetail.overview')}</TabsTrigger>
          <TabsTrigger value="files">{t('projectDetail.files')}</TabsTrigger>
          <TabsTrigger value="chunks" className="flex items-center gap-1">
            <Layers className="h-4 w-4" />
            {t('projectDetail.chunks')}
          </TabsTrigger>
          <TabsTrigger value="versions" className="flex items-center gap-1">
            <GitBranch className="h-4 w-4" />
            {t('versions.tab', 'Versions')}
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-1">
            <Settings className="h-4 w-4" />
            {t('common.settings', 'Settings')}
          </TabsTrigger>
          <TabsTrigger value="budget" className="flex items-center gap-1">
            <DollarSign className="h-4 w-4" />
            {t('budget.tab', 'Budget')}
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-1">
            <LayoutTemplate className="h-4 w-4" />
            {t('reports.tab', 'Reports')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>{t('documents.status')}</CardDescription>
              </CardHeader>
              <CardContent>
                <Badge variant="outline" className={statusColors[project.status]}>
                  {t(`projects.${project.status}`)}
                </Badge>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>{t('projects.documents')}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  <span className="text-2xl font-semibold">{project.documentCount}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>{t('projects.created')}</CardDescription>
              </CardHeader>
              <CardContent>
                <span className="text-sm text-muted-foreground">
                  {new Date(project.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </span>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('projects.projectDescription')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                {project.description || t('projects.emptyDescription')}
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="files" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('documents.upload')}</CardTitle>
              <CardDescription>
                {t('documents.uploadDescription')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FileUploadZone projectId={project.id} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('documents.title')}</CardTitle>
              <CardDescription>
                {t('projectDetail.allFilesDescription')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FileList projectId={project.id} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="chunks" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('chunks.title')}</CardTitle>
              <CardDescription>
                {t('chunks.description')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Select
                  value={selectedDocId || ''}
                  onValueChange={(value) => setSelectedDocId(value || null)}
                >
                  <SelectTrigger className="w-full md:w-[300px]">
                    <SelectValue placeholder={t('chunks.selectDocument')} />
                  </SelectTrigger>
                  <SelectContent>
                    {docsData?.data.map((doc) => (
                      <SelectItem key={doc.id} value={doc.id}>
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          <span className="truncate">{doc.name}</span>
                          {doc.status === 'ready' && (
                            <Badge variant="outline" className="ms-2 text-xs">
                              {t('documents.ready').toLowerCase()}
                            </Badge>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {selectedDocId ? (
                  <div className="space-y-6">
                    <DocumentSummary 
                      documentId={selectedDocId} 
                      documentName={docsData?.data.find(d => d.id === selectedDocId)?.name}
                    />
                    <ChunkViewer 
                      documentId={selectedDocId} 
                      documentName={docsData?.data.find(d => d.id === selectedDocId)?.name}
                      projectId={project.id}
                    />
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Layers className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">{t('chunks.selectDocument')}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="versions" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    {t('versions.title', 'Version History')}
                    {selectedDatasetId && <VersionBadge datasetId={selectedDatasetId} />}
                  </CardTitle>
                  <CardDescription>
                    {t('versions.description', 'Track and restore previous versions of your datasets')}
                  </CardDescription>
                </div>
                {selectedDatasetId && (
                  <CreateVersionDialog 
                    datasetId={selectedDatasetId}
                    trigger={
                      <Button variant="outline" size="sm">
                        <Save className="h-4 w-4 me-2" />
                        {t('versions.saveVersion', 'Save Version')}
                      </Button>
                    }
                  />
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Dataset selector for version history */}
                <Select
                  value={selectedDatasetId || ''}
                  onValueChange={(value) => setSelectedDatasetId(value || null)}
                >
                  <SelectTrigger className="w-full md:w-[300px]">
                    <SelectValue placeholder={t('versions.selectDataset', 'Select a dataset')} />
                  </SelectTrigger>
                  <SelectContent>
                    {datasets && datasets.length > 0 ? (
                      datasets.map((dataset) => (
                        <SelectItem key={dataset.id} value={dataset.id}>
                          <div className="flex items-center gap-2">
                            <Database className="h-4 w-4" />
                            <span className="truncate">{dataset.name}</span>
                            <Badge variant="outline" className="ms-2 text-xs">
                              {dataset.total_pairs || 0} {t('versions.pairs', 'pairs')}
                            </Badge>
                            {dataset.status && (
                              <Badge variant="secondary" className="text-xs">
                                {dataset.status}
                              </Badge>
                            )}
                          </div>
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="no-datasets" disabled>
                        <div className="flex items-center gap-2">
                          <Database className="h-4 w-4" />
                          <span>{t('versions.noDatasets', 'No datasets available')}</span>
                        </div>
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>

                {selectedDatasetId ? (
                  <VersionHistory
                    datasetId={selectedDatasetId}
                    onRestore={(version) => {
                      setVersionToRestore(version);
                      setRestoreDialogOpen(true);
                    }}
                    onCompare={(version) => {
                      setCompareVersion(version);
                      setCompareDialogOpen(true);
                    }}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <GitBranch className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">{t('versions.selectDataset', 'Select a dataset to view version history')}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <ChunkingSettingsCard
            projectId={project.id}
            initialSettings={{
              chunkSize: project.chunkSize,
              chunkOverlap: project.chunkOverlap,
              chunkStrategy: project.chunkStrategy,
            }}
            onSave={async (settings: ChunkingSettings) => {
              await updateChunkingSettings.mutateAsync(settings);
            }}
            isLoading={updateChunkingSettings.isPending}
          />
        </TabsContent>

        <TabsContent value="budget" className="space-y-6">
          <BudgetSettingsCard projectId={project.id} />
        </TabsContent>

        <TabsContent value="reports" className="space-y-6">
          <ReportBuilder projectId={project.id} />
        </TabsContent>
      </Tabs>

      {/* Version dialogs */}
      <RestoreVersionDialog
        version={versionToRestore}
        datasetId={selectedDatasetId || ''}
        open={restoreDialogOpen}
        onOpenChange={setRestoreDialogOpen}
      />
      
      <VersionCompareDialog
        version={compareVersion}
        datasetId={selectedDatasetId || ''}
        open={compareDialogOpen}
        onOpenChange={setCompareDialogOpen}
      />
    </DashboardLayout>
  );
}