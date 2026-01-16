import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Table, Plus, Trash2, Download, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ExtractionField, reportService } from '@/services/reportService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useExtractData } from '@/hooks/useReports';
import { ReportDocumentSelector } from './ReportDocumentSelector';
import { toast } from 'sonner';

interface DataExtractorProps {
  projectId: string;
  onComplete?: (extractionId: string) => void;
}

export function DataExtractor({ projectId, onComplete }: DataExtractorProps) {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';
  
  const [extractionName, setExtractionName] = useState('');
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [fields, setFields] = useState<ExtractionField[]>([
    { name: '', type: 'string', description: '' }
  ]);
  const [extractedData, setExtractedData] = useState<any[] | null>(null);
  const [csvContent, setCsvContent] = useState<string | null>(null);

  const extractDataMutation = useExtractData();

  const addField = () => {
    setFields([...fields, { name: '', type: 'string', description: '' }]);
  };

  const removeField = (index: number) => {
    setFields(fields.filter((_, i) => i !== index));
  };

  const updateField = (index: number, updates: Partial<ExtractionField>) => {
    const newFields = [...fields];
    newFields[index] = { ...newFields[index], ...updates };
    setFields(newFields);
  };

  const handleExtract = async () => {
    if (!extractionName.trim()) {
      toast.error(t('reports.nameRequired', 'Please enter a name'));
      return;
    }
    if (selectedDocIds.length === 0) {
      toast.error(t('reports.selectDocuments', 'Please select at least one document'));
      return;
    }
    const validFields = fields.filter(f => f.name.trim() && f.description.trim());
    if (validFields.length === 0) {
      toast.error(t('reports.fieldsRequired', 'Please add at least one field'));
      return;
    }

    try {
      const result = await extractDataMutation.mutateAsync({
        projectId,
        documentIds: selectedDocIds,
        extractionName,
        fields: validFields,
      });

      setExtractedData(result.extractedData);
      setCsvContent(result.csvContent);
      onComplete?.(result.extractionId);
    } catch (error) {
      console.error('Extraction error:', error);
    }
  };

  const handleDownloadCSV = () => {
    if (csvContent) {
      reportService.downloadCSV(csvContent, extractionName || 'extracted-data');
      toast.success(t('reports.downloaded', 'Data downloaded'));
    }
  };

  const isLoading = extractDataMutation.isPending;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Table className="h-5 w-5" />
            {t('reports.dataExtraction', 'Data Extraction')}
          </CardTitle>
          <CardDescription>
            {t('reports.dataExtractionDescription', 'Extract structured data from multiple documents into a table')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label>{t('reports.extractionName', 'Extraction Name')}</Label>
            <Input
              value={extractionName}
              onChange={(e) => setExtractionName(e.target.value)}
              placeholder={t('reports.extractionNamePlaceholder', 'e.g., Invoice Data')}
              className="mt-1"
            />
          </div>

          <div>
            <Label className="mb-2 block">{t('reports.fieldsToExtract', 'Fields to Extract')}</Label>
            <div className="space-y-3">
              {fields.map((field, index) => (
                <div key={index} className="flex items-start gap-2">
                  <div className="flex-1 grid grid-cols-3 gap-2">
                    <Input
                      placeholder={t('reports.fieldName', 'Field name')}
                      value={field.name}
                      onChange={(e) => updateField(index, { name: e.target.value })}
                    />
                    <Select
                      value={field.type}
                      onValueChange={(value) => updateField(index, { type: value as ExtractionField['type'] })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="string">{t('reports.typeString', 'Text')}</SelectItem>
                        <SelectItem value="number">{t('reports.typeNumber', 'Number')}</SelectItem>
                        <SelectItem value="date">{t('reports.typeDate', 'Date')}</SelectItem>
                        <SelectItem value="currency">{t('reports.typeCurrency', 'Currency')}</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      placeholder={t('reports.fieldDescription', 'Description')}
                      value={field.description}
                      onChange={(e) => updateField(index, { description: e.target.value })}
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeField(index)}
                    disabled={fields.length === 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addField}>
                <Plus className="h-4 w-4 me-1" />
                {t('reports.addField', 'Add Field')}
              </Button>
            </div>
          </div>

          <div>
            <Label className="mb-2 block">{t('reports.sourceDocuments', 'Source Documents')}</Label>
            <ReportDocumentSelector
              projectId={projectId}
              selectedIds={selectedDocIds}
              onSelectionChange={setSelectedDocIds}
            />
          </div>

          <Button
            onClick={handleExtract}
            disabled={isLoading || selectedDocIds.length === 0}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 me-2 animate-spin" />
                {t('reports.extracting', 'Extracting data...')}
              </>
            ) : (
              <>
                <Table className="h-4 w-4 me-2" />
                {t('reports.extractData', 'Extract Data')}
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {extractedData && extractedData.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>{t('reports.extractedData', 'Extracted Data')}</CardTitle>
              <CardDescription>
                {extractedData.length} {t('reports.rowsExtracted', 'rows extracted')}
              </CardDescription>
            </div>
            <Button variant="outline" onClick={handleDownloadCSV}>
              <Download className="h-4 w-4 me-2" />
              {t('reports.downloadCSV', 'Download CSV')}
            </Button>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="p-2 text-left font-medium">{t('documents.title', 'Document')}</th>
                    {fields.filter(f => f.name).map((field, i) => (
                      <th key={i} className="p-2 text-left font-medium">{field.name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {extractedData.map((row, rowIndex) => (
                    <tr key={rowIndex} className="border-b">
                      <td className="p-2">
                        <span className="font-medium truncate block max-w-[200px]">
                          {row.document_name}
                        </span>
                      </td>
                      {fields.filter(f => f.name).map((field, colIndex) => (
                        <td key={colIndex} className="p-2">
                          {row.values[field.name] ?? (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
