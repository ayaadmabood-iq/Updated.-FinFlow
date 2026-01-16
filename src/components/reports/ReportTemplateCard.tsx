import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FileText, Sparkles, Download, Loader2, ChevronRight, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ReportTemplate, ReportCategory } from '@/services/reportService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import * as Icons from 'lucide-react';

const categoryLabels: Record<ReportCategory, { en: string; ar: string; color: string }> = {
  'technical-audit': { en: 'Technical Audit', ar: 'التدقيق الفني', color: 'bg-blue-500/10 text-blue-600' },
  'financial-summary': { en: 'Financial Summary', ar: 'الملخص المالي', color: 'bg-emerald-500/10 text-emerald-600' },
  'legal-comparison': { en: 'Legal Comparison', ar: 'المقارنة القانونية', color: 'bg-purple-500/10 text-purple-600' },
  'research-synthesis': { en: 'Research Synthesis', ar: 'تجميع البحث', color: 'bg-amber-500/10 text-amber-600' },
  'contract-analysis': { en: 'Contract Analysis', ar: 'تحليل العقد', color: 'bg-rose-500/10 text-rose-600' },
  'compliance-review': { en: 'Compliance Review', ar: 'مراجعة الامتثال', color: 'bg-teal-500/10 text-teal-600' },
  'custom': { en: 'Custom', ar: 'مخصص', color: 'bg-muted text-muted-foreground' },
};

interface ReportTemplateCardProps {
  template: ReportTemplate;
  isSelected: boolean;
  onSelect: () => void;
  isRtl: boolean;
}

export function ReportTemplateCard({ template, isSelected, onSelect, isRtl }: ReportTemplateCardProps) {
  const { t } = useTranslation();
  
  // Dynamically get the icon component
  const IconComponent = (Icons as any)[template.icon] || FileText;
  const categoryInfo = categoryLabels[template.category];

  return (
    <Card
      className={cn(
        "cursor-pointer transition-all duration-200 hover:border-primary/50 hover:shadow-md",
        isSelected && "border-primary ring-2 ring-primary/20"
      )}
      onClick={onSelect}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className={cn(
            "p-2 rounded-lg",
            categoryInfo.color
          )}>
            <IconComponent className="h-5 w-5" />
          </div>
          {isSelected && (
            <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center">
              <Check className="h-4 w-4 text-primary-foreground" />
            </div>
          )}
        </div>
        <CardTitle className="text-base mt-2">
          {isRtl ? (template.name_ar || template.name) : template.name}
        </CardTitle>
        <CardDescription className="text-sm line-clamp-2">
          {isRtl ? (template.description_ar || template.description) : template.description}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <Badge variant="secondary" className={cn("text-xs", categoryInfo.color)}>
            {isRtl ? categoryInfo.ar : categoryInfo.en}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {template.sections.length} {t('reports.sections', 'sections')}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

interface TemplatePreviewProps {
  template: ReportTemplate;
  isRtl: boolean;
}

export function TemplatePreview({ template, isRtl }: TemplatePreviewProps) {
  const { t } = useTranslation();
  const sortedSections = [...template.sections].sort((a, b) => a.order - b.order);
  
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Sparkles className="h-5 w-5 text-primary" />
        <h3 className="font-semibold">
          {t('reports.templatePreview', 'Template Preview')}
        </h3>
      </div>
      
      <div className="border rounded-lg p-4 space-y-3">
        {sortedSections.map((section, index) => (
          <div key={section.id} className="flex items-start gap-3">
            <div className="flex-shrink-0 h-6 w-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-medium">
              {index + 1}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">
                {isRtl ? (section.title_ar || section.title) : section.title}
              </p>
              <p className="text-xs text-muted-foreground line-clamp-1">
                {section.prompt}
              </p>
            </div>
          </div>
        ))}
      </div>
      
      {template.settings?.tone && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="outline" className="text-xs">
            {template.settings.tone === 'formal' ? t('reports.formal', 'Formal') : t('reports.casual', 'Casual')}
          </Badge>
          {template.settings.includeCharts && (
            <Badge variant="outline" className="text-xs">
              {t('reports.includesCharts', 'Includes Charts')}
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
