import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Sparkles, FileText, Copy, Download, Loader2 } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { FormatSelector } from '@/components/studio/FormatSelector';
import { ToneTransformer } from '@/components/studio/ToneTransformer';
import { ContentVersionHistory } from '@/components/studio/ContentVersionHistory';
import { useGenerateContent, useTransformContent } from '@/hooks/useStudio';
import { useDocuments } from '@/hooks/useDocuments';
import { studioService, TargetFormat, TransformationType } from '@/services/studioService';

export default function ProjectStudio() {
  const { id: projectId } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const { toast } = useToast();

  const [selectedFormat, setSelectedFormat] = useState<TargetFormat>('presentation_outline');
  const [title, setTitle] = useState('');
  const [instructions, setInstructions] = useState('');
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [generatedContent, setGeneratedContent] = useState('');
  const [generatedContentId, setGeneratedContentId] = useState<string | null>(null);
  const [selectedText, setSelectedText] = useState('');

  const { data: documentsData } = useDocuments(projectId || '');
  const generateMutation = useGenerateContent();
  const transformMutation = useTransformContent();

  const handleGenerate = async () => {
    if (!projectId || !title) {
      toast({ title: 'Please enter a title', variant: 'destructive' });
      return;
    }

    try {
      const result = await generateMutation.mutateAsync({
        projectId,
        documentIds: selectedDocIds,
        targetFormat: selectedFormat,
        title,
        instructions,
      });
      setGeneratedContent(result.content);
      setGeneratedContentId(result.id);
    } catch (error) {
      console.error('Generation error:', error);
    }
  };

  const handleTransform = async (
    transformation: TransformationType,
    options?: { targetLanguage?: string; customInstructions?: string }
  ) => {
    if (!selectedText) return;

    try {
      const result = await transformMutation.mutateAsync({
        contentId: generatedContentId || undefined,
        text: selectedText,
        transformation,
        ...options,
      });
      
      // Replace selected text with transformed text
      setGeneratedContent((prev) =>
        prev.replace(selectedText, result.transformedText)
      );
      setSelectedText('');
    } catch (error) {
      console.error('Transform error:', error);
    }
  };

  const handleCopy = async () => {
    await studioService.copyToClipboard(generatedContent);
    toast({ title: 'Copied to clipboard' });
  };

  const handleDownload = () => {
    studioService.downloadContent(
      generatedContent,
      `${title || 'content'}.md`,
      'text/markdown'
    );
  };

  const handleTextSelect = () => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim()) {
      setSelectedText(selection.toString());
    }
  };

  const documents = documentsData?.data || [];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-primary" />
              {t('studio.title', 'Generative Studio')}
            </h1>
            <p className="text-muted-foreground mt-1">
              {t('studio.subtitle', 'Transform your documents into any format')}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Panel - Configuration */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {t('studio.selectFormat', 'Select Output Format')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <FormatSelector value={selectedFormat} onChange={setSelectedFormat} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {t('studio.configuration', 'Configuration')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>{t('studio.outputTitle', 'Output Title')}</Label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., Q4 Sales Presentation"
                  />
                </div>

                <div>
                  <Label>{t('studio.sourceDocuments', 'Source Documents')}</Label>
                  <ScrollArea className="h-32 border rounded-md p-2 mt-1">
                    {documents.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No documents</p>
                    ) : (
                      documents.map((doc) => (
                        <label key={doc.id} className="flex items-center gap-2 py-1">
                          <input
                            type="checkbox"
                            checked={selectedDocIds.includes(doc.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedDocIds([...selectedDocIds, doc.id]);
                              } else {
                                setSelectedDocIds(selectedDocIds.filter((id) => id !== doc.id));
                              }
                            }}
                          />
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm truncate">{doc.name}</span>
                        </label>
                      ))
                    )}
                  </ScrollArea>
                </div>

                <div>
                  <Label>{t('studio.additionalInstructions', 'Additional Instructions')}</Label>
                  <Textarea
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    placeholder="Any specific requirements..."
                    rows={3}
                  />
                </div>

                <Button
                  onClick={handleGenerate}
                  disabled={generateMutation.isPending || !title}
                  className="w-full"
                >
                  {generateMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4 mr-2" />
                  )}
                  {t('studio.generate', 'Generate Content')}
                </Button>
              </CardContent>
            </Card>

            {generatedContentId && (
              <ContentVersionHistory contentId={generatedContentId} />
            )}
          </div>

          {/* Right Panel - Output */}
          <div className="space-y-4">
            <Card className="h-full">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-base">
                  {t('studio.generatedOutput', 'Generated Output')}
                </CardTitle>
                {generatedContent && (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleCopy}>
                      <Copy className="h-4 w-4 mr-1" />
                      {t('studio.copy', 'Copy')}
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleDownload}>
                      <Download className="h-4 w-4 mr-1" />
                      {t('studio.download', 'Download')}
                    </Button>
                  </div>
                )}
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="output">
                  <TabsList className="mb-3">
                    <TabsTrigger value="output">{t('studio.output', 'Output')}</TabsTrigger>
                    <TabsTrigger value="transform">{t('studio.transform', 'Transform')}</TabsTrigger>
                  </TabsList>
                  <TabsContent value="output">
                    <ScrollArea className="h-[500px] border rounded-lg p-4">
                      {generatedContent ? (
                        <pre
                          className="whitespace-pre-wrap text-sm"
                          onMouseUp={handleTextSelect}
                        >
                          {generatedContent}
                        </pre>
                      ) : (
                        <div className="flex items-center justify-center h-full text-muted-foreground">
                          {t('studio.noContentYet', 'Generated content will appear here')}
                        </div>
                      )}
                    </ScrollArea>
                  </TabsContent>
                  <TabsContent value="transform">
                    <div className="border rounded-lg p-4">
                      <ToneTransformer
                        selectedText={selectedText}
                        onTransform={handleTransform}
                        isLoading={transformMutation.isPending}
                      />
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
