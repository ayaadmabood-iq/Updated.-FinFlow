import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TemplateCard } from './TemplateCard';
import { TemplatePreview } from './TemplatePreview';
import { UseTemplateDialog } from './UseTemplateDialog';
import { Template, TemplateCategory, templates, categoryInfo, searchTemplates } from '@/data/templates';
import { Search, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

export function TemplateGallery() {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';
  
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<TemplateCategory | 'all'>('all');
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);
  const [useTemplate, setUseTemplate] = useState<Template | null>(null);
  
  const filteredTemplates = useMemo(() => {
    let result = templates;
    
    if (activeCategory !== 'all') {
      result = result.filter(t => t.category === activeCategory);
    }
    
    if (searchQuery) {
      const searched = searchTemplates(searchQuery);
      result = result.filter(t => searched.includes(t));
    }
    
    return result;
  }, [searchQuery, activeCategory]);
  
  const categories = Object.keys(categoryInfo) as TemplateCategory[];

  return (
    <div className="space-y-6">
      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className={cn(
            "absolute top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground",
            isRtl ? "right-3" : "left-3"
          )} />
          <Input
            placeholder={t('templates.searchPlaceholder', 'Search templates...')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={cn(isRtl ? "pr-10" : "pl-10")}
          />
        </div>
      </div>
      
      {/* Category Tabs */}
      <Tabs value={activeCategory} onValueChange={(v) => setActiveCategory(v as TemplateCategory | 'all')}>
        <TabsList className="h-auto flex-wrap justify-start gap-1 bg-transparent p-0">
          <TabsTrigger 
            value="all" 
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-full px-4"
          >
            <Sparkles className="h-4 w-4 me-1.5" />
            {t('templates.all', 'All Templates')}
          </TabsTrigger>
          {categories.map((cat) => (
            <TabsTrigger 
              key={cat} 
              value={cat}
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-full px-4"
            >
              {isRtl ? categoryInfo[cat].labelAr : categoryInfo[cat].label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      
      {/* Template Grid */}
      {filteredTemplates.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTemplates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onPreview={setPreviewTemplate}
              onUse={setUseTemplate}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            {t('templates.noResults', 'No templates found matching your criteria.')}
          </p>
          <Button 
            variant="link" 
            onClick={() => { setSearchQuery(''); setActiveCategory('all'); }}
          >
            {t('templates.clearFilters', 'Clear filters')}
          </Button>
        </div>
      )}
      
      {/* Preview Dialog */}
      <TemplatePreview
        template={previewTemplate}
        open={!!previewTemplate}
        onOpenChange={(open) => !open && setPreviewTemplate(null)}
        onUse={() => {
          setUseTemplate(previewTemplate);
          setPreviewTemplate(null);
        }}
      />
      
      {/* Use Template Dialog */}
      <UseTemplateDialog
        template={useTemplate}
        open={!!useTemplate}
        onOpenChange={(open) => !open && setUseTemplate(null)}
      />
    </div>
  );
}
