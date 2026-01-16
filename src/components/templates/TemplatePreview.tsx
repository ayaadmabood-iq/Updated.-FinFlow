import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Template, categoryInfo } from '@/data/templates';
import { Play, Bot, User, Cpu, Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { toast } from '@/hooks/use-toast';

interface TemplatePreviewProps {
  template: Template | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUse: () => void;
}

export function TemplatePreview({ template, open, onOpenChange, onUse }: TemplatePreviewProps) {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  
  if (!template) return null;
  
  const category = categoryInfo[template.category];
  
  const difficultyColors = {
    beginner: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    intermediate: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    advanced: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  };
  
  const handleCopyPrompt = async () => {
    await navigator.clipboard.writeText(template.systemPrompt);
    setCopiedPrompt(true);
    toast({
      title: t('common.copied', 'Copied'),
      description: t('templates.promptCopied', 'System prompt copied to clipboard'),
    });
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <Badge className={cn(category.color, "text-white")}>
              {isRtl ? category.labelAr : category.label}
            </Badge>
            <Badge variant="secondary" className={difficultyColors[template.difficulty]}>
              {template.difficulty}
            </Badge>
          </div>
          <DialogTitle className="text-xl">{template.name}</DialogTitle>
          <DialogDescription>{template.description}</DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-6 py-4">
            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <p className="text-2xl font-semibold">{template.estimatedTokens.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">{t('templates.estimatedTokens', 'Est. Tokens')}</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <p className="text-2xl font-semibold">{template.samplePairs.length}</p>
                <p className="text-xs text-muted-foreground">{t('templates.samplePairs', 'Sample Pairs')}</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <p className="text-sm font-medium truncate">{template.recommendedModel}</p>
                <p className="text-xs text-muted-foreground">{t('templates.recommendedModel', 'Recommended Model')}</p>
              </div>
            </div>
            
            {/* System Prompt */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium">{t('templates.systemPrompt', 'System Prompt')}</h4>
                <Button variant="ghost" size="sm" onClick={handleCopyPrompt}>
                  {copiedPrompt ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <div className="bg-muted/50 rounded-lg p-4 text-sm font-mono">
                {template.systemPrompt}
              </div>
            </div>
            
            <Separator />
            
            {/* Sample Conversations */}
            <div>
              <h4 className="font-medium mb-4">{t('templates.sampleConversations', 'Sample Training Data')}</h4>
              <div className="space-y-4">
                {template.samplePairs.map((pair, idx) => (
                  <div key={idx} className="border rounded-lg overflow-hidden">
                    {/* System */}
                    <div className="bg-purple-50 dark:bg-purple-950/30 p-3 flex items-start gap-3">
                      <Cpu className="h-4 w-4 mt-0.5 text-purple-600 shrink-0" />
                      <div>
                        <p className="text-xs font-medium text-purple-600 mb-1">System</p>
                        <p className="text-sm">{pair.system}</p>
                      </div>
                    </div>
                    
                    {/* User */}
                    <div className="bg-blue-50 dark:bg-blue-950/30 p-3 flex items-start gap-3">
                      <User className="h-4 w-4 mt-0.5 text-blue-600 shrink-0" />
                      <div>
                        <p className="text-xs font-medium text-blue-600 mb-1">User</p>
                        <p className="text-sm">{pair.user}</p>
                      </div>
                    </div>
                    
                    {/* Assistant */}
                    <div className="bg-green-50 dark:bg-green-950/30 p-3 flex items-start gap-3">
                      <Bot className="h-4 w-4 mt-0.5 text-green-600 shrink-0" />
                      <div>
                        <p className="text-xs font-medium text-green-600 mb-1">Assistant</p>
                        <p className="text-sm whitespace-pre-wrap">{pair.assistant}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Tags */}
            <div>
              <h4 className="font-medium mb-2">{t('templates.tags', 'Tags')}</h4>
              <div className="flex flex-wrap gap-2">
                {template.tags.map((tag) => (
                  <Badge key={tag} variant="secondary">{tag}</Badge>
                ))}
              </div>
            </div>
          </div>
        </ScrollArea>
        
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.close', 'Close')}
          </Button>
          <Button onClick={onUse}>
            <Play className="h-4 w-4 me-1.5" />
            {t('templates.useTemplate', 'Use Template')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
