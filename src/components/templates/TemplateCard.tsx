import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Template, categoryInfo } from '@/data/templates';
import { 
  MessageCircleQuestion, Tags, Heart, Stethoscope, Activity, FileText, 
  Shield, ShoppingCart, Package, GraduationCap, ClipboardCheck, PiggyBank, Receipt,
  Eye, Play
} from 'lucide-react';
import { cn } from '@/lib/utils';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  MessageCircleQuestion,
  Tags,
  Heart,
  Stethoscope,
  Activity,
  FileText,
  Shield,
  ShoppingCart,
  Package,
  GraduationCap,
  ClipboardCheck,
  PiggyBank,
  Receipt,
};

interface TemplateCardProps {
  template: Template;
  onPreview: (template: Template) => void;
  onUse: (template: Template) => void;
}

export function TemplateCard({ template, onPreview, onUse }: TemplateCardProps) {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';
  
  const IconComponent = iconMap[template.icon] || MessageCircleQuestion;
  const category = categoryInfo[template.category];
  
  const difficultyColors = {
    beginner: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    intermediate: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    advanced: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  };
  
  const difficultyLabels = {
    beginner: t('templates.difficulty.beginner', 'Beginner'),
    intermediate: t('templates.difficulty.intermediate', 'Intermediate'),
    advanced: t('templates.difficulty.advanced', 'Advanced'),
  };

  return (
    <Card className="group hover:shadow-lg transition-all duration-300 hover:border-primary/50 h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className={cn(
            "p-2.5 rounded-lg",
            category.color.replace('bg-', 'bg-opacity-15 bg-')
          )}>
            <IconComponent className={cn("h-5 w-5", category.color.replace('bg-', 'text-').replace('-500', '-600'))} />
          </div>
          <Badge variant="secondary" className={cn("text-xs", difficultyColors[template.difficulty])}>
            {difficultyLabels[template.difficulty]}
          </Badge>
        </div>
        <CardTitle className="text-lg mt-3 group-hover:text-primary transition-colors">
          {template.name}
        </CardTitle>
        <CardDescription className="line-clamp-2 text-sm">
          {template.description}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col justify-between gap-4">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="outline" className="font-normal">
              {isRtl ? category.labelAr : category.label}
            </Badge>
            <span>•</span>
            <span>~{template.estimatedTokens.toLocaleString()} {t('templates.tokens', 'tokens')}</span>
          </div>
          
          <div className="flex flex-wrap gap-1">
            {template.tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs font-normal bg-muted">
                {tag}
              </Badge>
            ))}
            {template.tags.length > 3 && (
              <Badge variant="secondary" className="text-xs font-normal bg-muted">
                +{template.tags.length - 3}
              </Badge>
            )}
          </div>
        </div>
        
        <div className="flex gap-2 pt-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1"
            onClick={() => onPreview(template)}
          >
            <Eye className="h-4 w-4 me-1.5" />
            {t('templates.preview', 'Preview')}
          </Button>
          <Button 
            size="sm" 
            className="flex-1"
            onClick={() => onUse(template)}
          >
            <Play className="h-4 w-4 me-1.5" />
            {t('templates.use', 'Use')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
