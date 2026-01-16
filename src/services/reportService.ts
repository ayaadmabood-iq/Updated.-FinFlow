import { supabase } from '@/integrations/supabase/client';

export type ReportCategory = 
  | 'technical-audit'
  | 'financial-summary'
  | 'legal-comparison'
  | 'research-synthesis'
  | 'contract-analysis'
  | 'compliance-review'
  | 'custom';

export interface TemplateSection {
  id: string;
  title: string;
  title_ar: string;
  prompt: string;
  order: number;
}

export interface ReportTemplate {
  id: string;
  name: string;
  name_ar: string | null;
  description: string | null;
  description_ar: string | null;
  category: ReportCategory;
  icon: string;
  is_system: boolean;
  is_public: boolean;
  owner_id: string | null;
  sections: TemplateSection[];
  settings: {
    tone?: 'formal' | 'casual';
    includeCharts?: boolean;
    language?: 'auto' | 'en' | 'ar';
  };
  created_at: string;
  updated_at: string;
}

export interface GeneratedReport {
  id: string;
  project_id: string;
  template_id: string | null;
  user_id: string;
  name: string;
  status: 'pending' | 'generating' | 'ready' | 'failed';
  source_document_ids: string[];
  language: string;
  content_markdown: string | null;
  sections_data: SectionData[];
  total_tokens_used: number;
  generation_cost_usd: number;
  generation_time_ms: number | null;
  error_message: string | null;
  exported_formats: string[];
  last_exported_at: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface SectionData {
  section_id: string;
  title: string;
  content: string;
  sources: { document_id: string; chunk_ids: string[] }[];
}

export interface ExtractionField {
  name: string;
  type: 'string' | 'number' | 'date' | 'currency';
  description: string;
}

export interface DataExtraction {
  id: string;
  project_id: string;
  user_id: string;
  name: string;
  status: 'pending' | 'generating' | 'ready' | 'failed';
  source_document_ids: string[];
  fields: ExtractionField[];
  extracted_data: ExtractedRow[];
  total_tokens_used: number;
  extraction_cost_usd: number;
  error_message: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface ExtractedRow {
  document_id: string;
  document_name: string;
  values: Record<string, any>;
}

class ReportService {
  async getTemplates(): Promise<ReportTemplate[]> {
    const { data, error } = await supabase
      .from('report_templates')
      .select('*')
      .order('is_system', { ascending: false })
      .order('name');

    if (error) {
      console.error('Error fetching templates:', error);
      throw new Error(error.message);
    }

    return (data || []).map((t: any) => ({
      ...t,
      sections: t.sections as TemplateSection[],
      settings: t.settings as ReportTemplate['settings'],
    } as ReportTemplate));
  }

  async getTemplate(templateId: string): Promise<ReportTemplate | null> {
    const { data, error } = await supabase
      .from('report_templates')
      .select('*')
      .eq('id', templateId)
      .single();

    if (error) {
      console.error('Error fetching template:', error);
      return null;
    }

    return {
      ...data,
      sections: data.sections as unknown as TemplateSection[],
      settings: data.settings as unknown as ReportTemplate['settings'],
    } as ReportTemplate;
  }

  async generateReport(
    projectId: string,
    templateId: string,
    documentIds: string[],
    reportName: string,
    language: 'auto' | 'en' | 'ar' = 'auto'
  ): Promise<{ reportId: string; contentMarkdown: string }> {
    const { data, error } = await supabase.functions.invoke('generate-report', {
      body: {
        projectId,
        templateId,
        documentIds,
        reportName,
        language,
      },
    });

    if (error) {
      console.error('Report generation error:', error);
      throw new Error(error.message || 'Failed to generate report');
    }

    if (data.error) {
      throw new Error(data.error);
    }

    return {
      reportId: data.reportId,
      contentMarkdown: data.contentMarkdown,
    };
  }

  async getReports(projectId: string): Promise<GeneratedReport[]> {
    const { data, error } = await supabase
      .from('generated_reports')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching reports:', error);
      throw new Error(error.message);
    }

    return (data || []).map((r: any) => ({
      ...r,
      sections_data: r.sections_data as unknown as SectionData[],
    } as GeneratedReport));
  }

  async getReport(reportId: string): Promise<GeneratedReport | null> {
    const { data, error } = await supabase
      .from('generated_reports')
      .select('*')
      .eq('id', reportId)
      .single();

    if (error) {
      console.error('Error fetching report:', error);
      return null;
    }

    return {
      ...data,
      sections_data: data.sections_data as unknown as SectionData[],
    } as GeneratedReport;
  }

  async deleteReport(reportId: string): Promise<void> {
    const { error } = await supabase
      .from('generated_reports')
      .delete()
      .eq('id', reportId);

    if (error) {
      console.error('Error deleting report:', error);
      throw new Error(error.message);
    }
  }

  async extractData(
    projectId: string,
    documentIds: string[],
    extractionName: string,
    fields: ExtractionField[]
  ): Promise<{ extractionId: string; extractedData: ExtractedRow[]; csvContent: string }> {
    const { data, error } = await supabase.functions.invoke('extract-data', {
      body: {
        projectId,
        documentIds,
        extractionName,
        fields,
      },
    });

    if (error) {
      console.error('Data extraction error:', error);
      throw new Error(error.message || 'Failed to extract data');
    }

    if (data.error) {
      throw new Error(data.error);
    }

    return {
      extractionId: data.extractionId,
      extractedData: data.extractedData,
      csvContent: data.csvContent,
    };
  }

  async getExtractions(projectId: string): Promise<DataExtraction[]> {
    const { data, error } = await supabase
      .from('data_extractions')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching extractions:', error);
      throw new Error(error.message);
    }

    return (data || []).map((e: any) => ({
      ...e,
      fields: e.fields as unknown as ExtractionField[],
      extracted_data: e.extracted_data as unknown as ExtractedRow[],
    } as DataExtraction));
  }

  downloadCSV(csvContent: string, filename: string): void {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  downloadMarkdown(markdown: string, filename: string): void {
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

export const reportService = new ReportService();
