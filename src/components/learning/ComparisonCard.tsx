import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, ArrowRight } from 'lucide-react';

interface ComparisonItem {
  label: string;
  pretraining: string;
  finetuning: string;
}

export function ComparisonCard() {
  const { t } = useTranslation();

  const comparisons: ComparisonItem[] = [
    {
      label: t('learn.dataAmount', 'Data Amount'),
      pretraining: t('learn.hugeAmount', 'Huge (TBs)'),
      finetuning: t('learn.smallAmount', 'Small (MBs)'),
    },
    {
      label: t('learn.dataQuality', 'Data Quality'),
      pretraining: t('learn.mixed', 'Mixed'),
      finetuning: t('learn.highQuality', 'High Quality'),
    },
    {
      label: t('learn.purpose', 'Purpose'),
      pretraining: t('learn.generalKnowledge', 'General Knowledge'),
      finetuning: t('learn.specificBehavior', 'Specific Behavior'),
    },
    {
      label: t('learn.timeCost', 'Time & Cost'),
      pretraining: t('learn.monthsMillions', 'Months + $Millions'),
      finetuning: t('learn.hoursThousands', 'Hours + $Thousands'),
    },
    {
      label: t('learn.frequency', 'Frequency'),
      pretraining: t('learn.once', 'Once'),
      finetuning: t('learn.continuous', 'Continuous'),
    },
  ];

  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* Pre-training Card */}
      <Card className="border-2 border-muted">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">
              {t('learn.pretraining', 'Pre-training')}
            </CardTitle>
            <Badge variant="secondary">
              {t('learn.foundationPhase', 'Foundation')}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {t('learn.pretrainingDesc', 'Teaching the model language patterns from vast internet data.')}
          </p>
          
          <div className="space-y-3">
            {comparisons.map((item, index) => (
              <div key={index} className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">{item.label}</span>
                <span className="font-medium">{item.pretraining}</span>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t">
            <div className="flex items-center gap-2 text-sm">
              <XCircle className="h-4 w-4 text-destructive" />
              <span>{t('learn.notForYou', 'Not something you do')}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Fine-tuning Card */}
      <Card className="border-2 border-primary">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">
              {t('learn.finetuning', 'Fine-tuning')}
            </CardTitle>
            <Badge>
              {t('learn.yourRole', 'Your Role')}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {t('learn.finetuningDesc', 'Specializing the model for your specific use case.')}
          </p>
          
          <div className="space-y-3">
            {comparisons.map((item, index) => (
              <div key={index} className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">{item.label}</span>
                <span className="font-medium text-primary">{item.finetuning}</span>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t">
            <div className="flex items-center gap-2 text-sm text-primary">
              <CheckCircle className="h-4 w-4" />
              <span>{t('learn.whatFineflowDoes', 'What FineFlow helps you do!')}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
