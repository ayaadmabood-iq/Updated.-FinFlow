import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, FolderOpen, Loader2, Folder, HardDrive } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useProjects } from '@/hooks/useProjects';
import { useDataSources } from '@/hooks/useDataSources';
import { useDocuments } from '@/hooks/useDocuments';
import { useTrainingDatasets } from '@/hooks/useTraining';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { TabNav } from '@/components/ui/TabNav';
import { DataFileUploadZone } from '@/components/data/DataFileUploadZone';
import { StorageCard } from '@/components/data/StorageCard';
import { DataSourceList } from '@/components/data/DataSourceList';
import { QuickTrainingPanel } from '@/components/training/QuickTrainingPanel';
import { UrlImportForm } from '@/components/data/UrlImportForm';
import { TextInputForm } from '@/components/data/TextInputForm';
import { BulkUrlImport } from '@/components/data/BulkUrlImport';
import { GenerateDatasetDialog } from '@/components/training/GenerateDatasetDialog';
import { DatasetList } from '@/components/training/DatasetList';
import { DatasetPreview } from '@/components/training/DatasetPreview';
import { ApiKeySetup } from '@/components/training/ApiKeySetup';
import { TrainingJobsList } from '@/components/training/TrainingJobsList';
import { DatasetExportPanel } from '@/components/export/DatasetExportPanel';
import { DatasetSharePanel } from '@/components/export/DatasetSharePanel';
import { DocumentExportPanel } from '@/components/export/DocumentExportPanel';
import { ExportFormatPreview } from '@/components/export/ExportFormatPreview';


// Google Drive icon SVG
const GoogleDriveIcon = () => (
  <svg viewBox="0 0 87.3 78" className="h-10 w-10">
    <path d="M6.6 66.85 3.85 72.65c-.65 1.15-.85 2.4-.7 3.6l.05.35.05.3c.05.25.1.5.2.75.05.15.1.35.15.5l.1.25c.5 1.15 1.4 2.1 2.6 2.65.65.3 1.35.45 2.05.5H81.9c1.25 0 2.4-.45 3.25-1.2.3-.25.55-.55.8-.85.2-.3.4-.6.55-.95l2.65-4.85-82.55.15z" fill="#0066DA"/>
    <path d="M56.15 0 28.3 0 0 49.15l13.65 23.7 42.5-49.15L56.15 0z" fill="#00AC47"/>
    <path d="M28.3 0l-13.5 23.7L0 49.15l28.3 0 13.65-23.7L28.3 0z" fill="#EA4335"/>
    <path d="M56.15 0l-13.5 23.7L28.3 49.15h42.5l13.65-23.7L70.8 0H56.15z" fill="#00832D"/>
    <path d="M56.15 0h14.65l13.65 25.5-13.65 23.65H56.15l13.65-23.7L56.15 0z" fill="#2684FC"/>
    <path d="M28.3 49.15h42.5l-13.65 23.7H14.65L0 49.15h28.3z" fill="#FFBA00"/>
  </svg>
);

// Dropbox icon SVG
const DropboxIcon = () => (
  <svg viewBox="0 0 43 40" className="h-10 w-10">
    <path fill="#0061FF" d="M12.6 0L0 8.5l8.6 6.9 12.6-8.2-8.6-7.2zM0 22.4l12.6 8.4 8.6-7.1-12.6-8.2-8.6 6.9zm21.2 1.3l8.6 7.1 12.6-8.4-8.6-6.9-12.6 8.2zm21.2-15.2L29.8 0l-8.6 7.2 12.6 8.2 8.6-6.9zM12.7 32.1l8.5 5.7 8.5-5.7V25l-8.5 5.8-8.5-5.8v7.1z"/>
  </svg>
);

// Local folder icon
const LocalFolderIcon = () => (
  <div className="h-10 w-10 flex items-center justify-center">
    <Folder className="h-10 w-10 text-warning" fill="currentColor" />
  </div>
);

export default function ProjectData() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: projectsData, isLoading: projectsLoading } = useProjects();
  const { data: sources } = useDataSources(id || '');
  const { data: documentsData } = useDocuments(id || '');
  const { data: datasets } = useTrainingDatasets(id || '');
  const [activeTab, setActiveTab] = useState('dataSources');
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [selectedDatasetId, setSelectedDatasetId] = useState<string | null>(null);

  const readyDocuments = documentsData?.data.filter(d => d.status === 'ready') || [];
  const readyDatasets = datasets?.filter(d => d.status === 'ready') || [];

  const project = projectsData?.data.find((p) => p.id === id);

  const stats = useMemo(() => {
    if (!sources) return { total: 0, ready: 0, byType: { file: 0, url: 0, text: 0 }, byStatus: { pending: 0, processing: 0, completed: 0, failed: 0 } };
    
    const byType = { file: 0, url: 0, text: 0 };
    const byStatus = { pending: 0, processing: 0, completed: 0, failed: 0 };
    
    sources.forEach(s => {
      byType[s.source_type]++;
      byStatus[s.status]++;
    });

    return { 
      total: sources.length, 
      ready: byStatus.completed,
      byType, 
      byStatus 
    };
  }, [sources]);

  const tabs = [
    { id: 'dataSources', label: t('dataSources.title', 'Data Sources') },
    { id: 'training', label: t('nav.training', 'Training') },
    { id: 'export', label: t('nav.export', 'Export') },
  ];

  if (projectsLoading) {
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
      title=""
      description=""
      actions={
        <Button variant="outline" onClick={() => navigate(`/projects/${id}`)}>
          <ArrowLeft className="h-4 w-4 me-2" />
          {t('common.back')}
        </Button>
      }
    >
      <div className="space-y-6">
        {/* Project Title */}
        <h1 className="text-2xl font-bold text-foreground">{project.name}</h1>

        {/* Tab Navigation */}
        <TabNav tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

        {/* Main Content */}
        {activeTab === 'dataSources' && (
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Left Column - Data Input */}
            <div className="flex-1 space-y-6">
              {/* Upload Section */}
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-4">
                  {t('dataSources.uploadYourData', 'Upload your data')}
                </h3>
                
                <DataFileUploadZone projectId={project.id} />

                {/* Storage Options */}
                <div className="flex gap-4 mt-6 flex-wrap">
                  <StorageCard
                    icon={<GoogleDriveIcon />}
                    title="Google Drive"
                    subtitle={t('dataSources.connectTo', 'Connect to Google Drive')}
                  />
                  <StorageCard
                    icon={<DropboxIcon />}
                    title="Dropbox"
                    subtitle={t('dataSources.connectTo', 'Connect to Dropbox')}
                  />
                  <StorageCard
                    icon={<LocalFolderIcon />}
                    title={t('dataSources.localDownload', 'Local Download')}
                    subtitle={t('dataSources.uploadFromComputer', 'Upload from Computer')}
                  />
                </div>
              </div>

              {/* File List */}
              <Card>
                <CardContent className="pt-6">
                  <DataSourceList projectId={project.id} />
                </CardContent>
              </Card>

              {/* URL Import Section */}
              <Card>
                <CardContent className="pt-6">
                  <h3 className="text-sm font-medium text-muted-foreground mb-4">
                    {t('dataSources.importUrl', 'Import from URL')}
                  </h3>
                  <UrlImportForm projectId={project.id} />
                </CardContent>
              </Card>

              {/* Text Input Section */}
              <Card>
                <CardContent className="pt-6">
                  <h3 className="text-sm font-medium text-muted-foreground mb-4">
                    {t('dataSources.addTextContent', 'Add Text Content')}
                  </h3>
                  <TextInputForm projectId={project.id} />
                </CardContent>
              </Card>

              {/* Bulk Import Section */}
              <Card>
                <CardContent className="pt-6">
                  <h3 className="text-sm font-medium text-muted-foreground mb-4">
                    {t('dataSources.bulkImport', 'Bulk URL Import')}
                  </h3>
                  <BulkUrlImport projectId={project.id} />
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Quick Training Panel */}
            <QuickTrainingPanel 
              projectId={project.id}
              readyCount={stats.ready} 
              totalCount={stats.total} 
            />
          </div>
        )}

        {activeTab === 'training' && id && (
          <div className="space-y-6">
            {/* API Key Setup */}
            <ApiKeySetup />


            {/* Training Jobs with Real-time Progress */}
            <TrainingJobsList projectId={id} />

            {selectedDatasetId ? (
              <div className="space-y-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedDatasetId(null)}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  {t('common.back', 'Back to Datasets')}
                </Button>
                <DatasetPreview
                  datasetId={selectedDatasetId}
                  projectId={id}
                  onClose={() => setSelectedDatasetId(null)}
                />
              </div>
            ) : (
              <DatasetList
                projectId={id}
                onSelect={setSelectedDatasetId}
                onGenerate={() => setShowGenerateDialog(true)}
              />
            )}
          </div>
        )}

        <GenerateDatasetDialog
          open={showGenerateDialog}
          onOpenChange={setShowGenerateDialog}
          projectId={id || ''}
          documentCount={readyDocuments.length}
        />

        {activeTab === 'export' && id && (
          <div className="space-y-6">
            {/* Export Format Preview */}
            <ExportFormatPreview />
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Training Dataset Export */}
              <DatasetExportPanel projectId={id} />
              
              {/* Document Export */}
              <DocumentExportPanel projectId={id} />
              
              {/* Dataset Sharing */}
              <div className="lg:col-span-2">
                <DatasetSharePanel projectId={id} />
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
