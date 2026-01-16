import { useTranslation } from 'react-i18next';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { TemplateGallery } from '@/components/templates/TemplateGallery';
import { Sparkles, BookOpen } from 'lucide-react';

export default function Templates() {
  const { t } = useTranslation();

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Hero Section */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-background border p-8">
          <div className="absolute top-0 end-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="relative">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-primary rounded-lg">
                <Sparkles className="h-6 w-6 text-primary-foreground" />
              </div>
              <h1 className="text-3xl font-bold">{t('templates.title', 'Industry Templates')}</h1>
            </div>
            <p className="text-lg text-muted-foreground max-w-2xl">
              {t('templates.subtitle', 'Jumpstart your AI fine-tuning with pre-built templates for common use cases. Each template includes a system prompt, sample training data, and recommended settings.')}
            </p>
            
            <div className="flex items-center gap-6 mt-6">
              <div className="flex items-center gap-2 text-sm">
                <BookOpen className="h-4 w-4 text-primary" />
                <span>{t('templates.templatesCount', '12 templates available')}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Sparkles className="h-4 w-4 text-primary" />
                <span>{t('templates.categories', '6 industry categories')}</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Template Gallery */}
        <TemplateGallery />
      </div>
    </DashboardLayout>
  );
}
