import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Presentation,
  Linkedin,
  Twitter,
  FileText,
  Mail,
  FileSignature,
  ClipboardList,
  Newspaper,
  MessageSquare,
  Sparkles,
  Check,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { TargetFormat } from '@/services/studioService';

interface FormatSelectorProps {
  value: TargetFormat;
  onChange: (format: TargetFormat) => void;
}

const formats: Array<{
  id: TargetFormat;
  label: string;
  description: string;
  icon: React.ElementType;
}> = [
  {
    id: 'presentation_outline',
    label: 'Presentation Outline',
    description: 'Slide-by-slide outline with visuals',
    icon: Presentation,
  },
  {
    id: 'linkedin_post',
    label: 'LinkedIn Post',
    description: 'Professional social media content',
    icon: Linkedin,
  },
  {
    id: 'twitter_thread',
    label: 'Twitter/X Thread',
    description: 'Engaging thread with numbered tweets',
    icon: Twitter,
  },
  {
    id: 'executive_memo',
    label: 'Executive Memo',
    description: 'Formal business memorandum',
    icon: FileText,
  },
  {
    id: 'email_draft',
    label: 'Email Draft',
    description: 'Professional email template',
    icon: Mail,
  },
  {
    id: 'contract_draft',
    label: 'Contract Draft',
    description: 'Legal document template',
    icon: FileSignature,
  },
  {
    id: 'report_summary',
    label: 'Report Summary',
    description: 'Executive report with insights',
    icon: ClipboardList,
  },
  {
    id: 'blog_post',
    label: 'Blog Post',
    description: 'SEO-friendly article content',
    icon: Newspaper,
  },
  {
    id: 'meeting_notes',
    label: 'Meeting Notes',
    description: 'Structured meeting summary',
    icon: MessageSquare,
  },
  {
    id: 'press_release',
    label: 'Press Release',
    description: 'Media announcement format',
    icon: Newspaper,
  },
  {
    id: 'custom',
    label: 'Custom Format',
    description: 'Define your own output format',
    icon: Sparkles,
  },
];

export function FormatSelector({ value, onChange }: FormatSelectorProps) {
  const { t } = useTranslation();

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
      {formats.map((format) => {
        const Icon = format.icon;
        const isSelected = value === format.id;

        return (
          <Card
            key={format.id}
            className={cn(
              'cursor-pointer transition-all hover:border-primary/50',
              isSelected && 'border-primary ring-2 ring-primary/20'
            )}
            onClick={() => onChange(format.id)}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <Icon className={cn(
                  'h-5 w-5',
                  isSelected ? 'text-primary' : 'text-muted-foreground'
                )} />
                {isSelected && (
                  <Check className="h-4 w-4 text-primary" />
                )}
              </div>
              <h4 className="font-medium text-sm mt-2">{format.label}</h4>
              <p className="text-xs text-muted-foreground mt-1">
                {format.description}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
