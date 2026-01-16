import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FileText, Sparkles, Loader2, ChevronRight, ChevronLeft, Check, LayoutTemplate, Table, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useReportTemplates, useGenerateReport, useReports } from '@/hooks/useReports';
import { ReportTemplate, GeneratedReport } from '@/services/reportService';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ReportTemplateCard, TemplatePreview } from './ReportTemplateCard';
import { ReportDocumentSelector } from './ReportDocumentSelector';
import { ReportEditor } from './ReportEditor';
import { DataExtractor } from './DataExtractor';

interface ReportBuilderProps {
  projectId: string;
}

type BuilderStep = 'template' | 'documents' | 'configure' | 'generating' | 'preview';

export function ReportBuilder({ projectId }: ReportBuilderProps) {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';
  
  const [activeTab, setActiveTab] = useState<'report' | 'extract'>('report');
  const [step, setStep] = useState<BuilderStep>('template');
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplate | null>(null);
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [reportName, setReportName] = useState('');
  const [language, setLanguage] = useState<'auto' | 'en' | 'ar'>('auto');
  const [generatedReport, setGeneratedReport] = useState<GeneratedReport | null>(null);

  const { data: templates, isLoading: templatesLoading } = useReportTemplates();
  const { data: existingReports } = useReports(projectId);
  const generateMutation = useGenerateReport();

  const steps = ['template', 'documents', 'configure', 'preview'];
  const currentStepIndex = steps.indexOf(step);
  const progressPercent = ((currentStepIndex + 1) / steps.length) * 100;

  const canProceed = () => {
    switch (step) {
      case 'template':
        return selectedTemplate !== null;
      case 'documents':
        return selectedDocIds.length > 0;
      case 'configure':
        return reportName.trim() !== '';
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (step === 'template') setStep('documents');
    else if (step === 'documents') setStep('configure');
    else if (step === 'configure') handleGenerate();
  };

  const handleBack = () => {
    if (step === 'documents') setStep('template');
    else if (step === 'configure') setStep('documents');
    else if (step === 'preview') setStep('configure');
  };

  const handleGenerate = async () => {
    if (!selectedTemplate) return;
    
    setStep('generating');
    
    try {
      const result = await generateMutation.mutateAsync({
        projectId,
        templateId: selectedTemplate.id,
        documentIds: selectedDocIds,
        reportName,
        language,
      });

      // Fetch the generated report
      setGeneratedReport({
        id: result.reportId,
        project_id: projectId,
        template_id: selectedTemplate.id,
        user_id: '',
        name: reportName,
        status: 'ready',
        source_document_ids: selectedDocIds,
        language,
        content_markdown: result.contentMarkdown,
        sections_data: [],
        total_tokens_used: 0,
        generation_cost_usd: 0,
        generation_time_ms: null,
        error_message: null,
        exported_formats: [],
        last_exported_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
      });
      setStep('preview');
    } catch (error) {
      console.error('Generation error:', error);
      setStep('configure');
    }
  };

  const handleReset = () => {
    setStep('template');
    setSelectedTemplate(null);
    setSelectedDocIds([]);
    setReportName('');
    setGeneratedReport(null);
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'report' | 'extract')}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="report" className="flex items-center gap-2">
            <LayoutTemplate className="h-4 w-4" />
            {t('reports.generateReport', 'Generate Report')}
          </TabsTrigger>
          <TabsTrigger value="extract" className="flex items-center gap-2">
            <Table className="h-4 w-4" />
            {t('reports.extractToTable', 'Extract to Table')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="report" className="mt-6">
          {step !== 'generating' && step !== 'preview' && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {steps.slice(0, -1).map((s, i) => (
                    <div key={s} className="flex items-center">
                      <div className={cn(
                        "h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium",
                        currentStepIndex >= i 
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      )}>
                        {currentStepIndex > i ? <Check className="h-4 w-4" /> : i + 1}
                      </div>
                      {i < steps.length - 2 && (
                        <div className={cn(
                          "h-0.5 w-8 mx-1",
                          currentStepIndex > i ? "bg-primary" : "bg-muted"
                        )} />
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <Progress value={progressPercent} className="h-1" />
            </div>
          )}

          {step === 'template' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-1">
                  {t('reports.chooseTemplate', 'Choose a Template')}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {t('reports.chooseTemplateDescription', 'Select a report template that fits your needs')}
                </p>
              </div>

              {templatesLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {templates?.map((template) => (
                    <ReportTemplateCard
                      key={template.id}
                      template={template}
                      isSelected={selectedTemplate?.id === template.id}
                      onSelect={() => setSelectedTemplate(template)}
                      isRtl={isRtl}
                    />
                  ))}
                </div>
              )}

              {selectedTemplate && (
                <Card className="mt-4">
                  <CardContent className="p-4">
                    <TemplatePreview template={selectedTemplate} isRtl={isRtl} />
                  </CardContent>
                </Card>
              )}

              <div className="flex justify-end">
                <Button onClick={handleNext} disabled={!canProceed()}>
                  {t('common.next', 'Next')}
                  <ArrowRight className={cn("h-4 w-4", isRtl ? "me-2 rotate-180" : "ms-2")} />
                </Button>
              </div>
            </div>
          )}

          {step === 'documents' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-1">
                  {t('reports.selectSources', 'Select Source Documents')}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {t('reports.selectSourcesDescription', 'Choose the documents to include in your report')}
                </p>
              </div>

              <ReportDocumentSelector
                projectId={projectId}
                selectedIds={selectedDocIds}
                onSelectionChange={setSelectedDocIds}
              />

              <div className="flex justify-between">
                <Button variant="outline" onClick={handleBack}>
                  <ChevronLeft className={cn("h-4 w-4", isRtl ? "ms-2 rotate-180" : "me-2")} />
                  {t('common.back', 'Back')}
                </Button>
                <Button onClick={handleNext} disabled={!canProceed()}>
                  {t('common.next', 'Next')}
                  <ArrowRight className={cn("h-4 w-4", isRtl ? "me-2 rotate-180" : "ms-2")} />
                </Button>
              </div>
            </div>
          )}

          {step === 'configure' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-1">
                  {t('reports.configureReport', 'Configure Report')}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {t('reports.configureDescription', 'Set up your report options')}
                </p>
              </div>

              <Card>
                <CardContent className="p-6 space-y-4">
                  <div>
                    <Label>{t('reports.reportName', 'Report Name')}</Label>
                    <Input
                      value={reportName}
                      onChange={(e) => setReportName(e.target.value)}
                      placeholder={t('reports.reportNamePlaceholder', 'e.g., Q4 Technical Audit Report')}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label>{t('reports.language', 'Output Language')}</Label>
                    <Select value={language} onValueChange={(v) => setLanguage(v as 'auto' | 'en' | 'ar')}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="auto">{t('reports.autoDetect', 'Auto-detect')}</SelectItem>
                        <SelectItem value="en">{t('reports.english', 'English')}</SelectItem>
                        <SelectItem value="ar">{t('reports.arabic', 'العربية')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="pt-2">
                    <Label className="text-muted-foreground">{t('reports.summary', 'Summary')}</Label>
                    <div className="mt-2 space-y-1 text-sm">
                      <p>
                        <span className="text-muted-foreground">{t('reports.template', 'Template')}:</span>{' '}
                        {isRtl ? (selectedTemplate?.name_ar || selectedTemplate?.name) : selectedTemplate?.name}
                      </p>
                      <p>
                        <span className="text-muted-foreground">{t('reports.documents', 'Documents')}:</span>{' '}
                        {selectedDocIds.length} {t('reports.selected', 'selected')}
                      </p>
                      <p>
                        <span className="text-muted-foreground">{t('reports.sections', 'Sections')}:</span>{' '}
                        {selectedTemplate?.sections.length}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-between">
                <Button variant="outline" onClick={handleBack}>
                  <ChevronLeft className={cn("h-4 w-4", isRtl ? "ms-2 rotate-180" : "me-2")} />
                  {t('common.back', 'Back')}
                </Button>
                <Button onClick={handleNext} disabled={!canProceed() || generateMutation.isPending}>
                  <Sparkles className="h-4 w-4 me-2" />
                  {t('reports.generate', 'Generate Report')}
                </Button>
              </div>
            </div>
          )}

          {step === 'generating' && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {t('reports.generating', 'Generating your report...')}
              </h3>
              <p className="text-sm text-muted-foreground max-w-md">
                {t('reports.generatingDescription', 'We\'re analyzing your documents and synthesizing the information. This may take 30-60 seconds.')}
              </p>
            </div>
          )}

          {step === 'preview' && generatedReport && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold mb-1">
                    {t('reports.reportReady', 'Your Report is Ready')}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {t('reports.reportReadyDescription', 'Review and edit your report before exporting')}
                  </p>
                </div>
                <Button variant="outline" onClick={handleReset}>
                  {t('reports.createAnother', 'Create Another')}
                </Button>
              </div>

              <ReportEditor report={generatedReport} isRtl={isRtl} />
            </div>
          )}
        </TabsContent>

        <TabsContent value="extract" className="mt-6">
          <DataExtractor projectId={projectId} />
        </TabsContent>
      </Tabs>

      {existingReports && existingReports.length > 0 && step === 'template' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('reports.recentReports', 'Recent Reports')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {existingReports.slice(0, 5).map((report) => (
                <div
                  key={report.id}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 cursor-pointer"
                  onClick={() => {
                    setGeneratedReport(report);
                    setStep('preview');
                  }}
                >
                  <div className="flex items-center gap-3">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-sm">{report.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(report.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <Badge variant={report.status === 'ready' ? 'default' : 'secondary'}>
                    {report.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
