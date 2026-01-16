import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Sparkles, Trash2, Loader2, Database, FileText, Brain, Rocket, RefreshCw } from 'lucide-react';

interface DemoDataSettingsProps {
  userId: string;
}

export function DemoDataSettings({ userId }: DemoDataSettingsProps) {
  const { t } = useTranslation();
  const [seeding, setSeeding] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');

  const handleSeedData = async () => {
    setSeeding(true);
    setProgress(0);
    setStatus(t('demo.initializing', 'Initializing...'));

    try {
      const progressInterval = setInterval(() => {
        setProgress((prev) => Math.min(prev + Math.random() * 15, 90));
      }, 500);

      setStatus(t('demo.creatingProjects', 'Creating sample projects...'));
      
      const { data, error } = await supabase.functions.invoke('seed-demo-data', {
        body: { action: 'seed' },
      });

      clearInterval(progressInterval);

      if (error) throw error;

      setProgress(100);
      setStatus(t('demo.complete', 'Complete!'));

      await new Promise((r) => setTimeout(r, 500));

      toast({
        title: t('demo.successTitle', '🎉 Demo data created!'),
        description: t('demo.successDesc', `Created ${data.created.projects} projects with ${data.created.trainingPairs} training pairs.`),
      });

    } catch (error: any) {
      console.error('Error seeding demo data:', error);
      toast({
        variant: 'destructive',
        title: t('demo.errorTitle', 'Error creating demo data'),
        description: error.message,
      });
    } finally {
      setSeeding(false);
      setProgress(0);
      setStatus('');
    }
  };

  const handleCleanup = async () => {
    setCleaning(true);

    try {
      const { error } = await supabase.functions.invoke('seed-demo-data', {
        body: { action: 'cleanup' },
      });

      if (error) throw error;

      toast({
        title: t('demo.cleanedTitle', 'Demo data removed'),
        description: t('demo.cleanedDesc', 'All demo projects and related data have been deleted.'),
      });

    } catch (error: any) {
      console.error('Error cleaning demo data:', error);
      toast({
        variant: 'destructive',
        title: t('demo.errorTitle', 'Error removing demo data'),
        description: error.message,
      });
    } finally {
      setCleaning(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          {t('demo.settingsTitle', 'Demo Data')}
        </CardTitle>
        <CardDescription>
          {t('demo.settingsDesc', 'Create or remove sample training data for testing and exploration.')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* What gets created */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
            <Database className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <p className="font-medium text-sm">{t('demo.projects', '3 Projects')}</p>
              <p className="text-xs text-muted-foreground">{t('demo.projectTypes', 'Customer Support, Medical, Legal')}</p>
            </div>
          </div>
          
          <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
            <FileText className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <p className="font-medium text-sm">{t('demo.datasets', '4 Datasets')}</p>
              <p className="text-xs text-muted-foreground">{t('demo.datasetsDesc', 'Ready for training')}</p>
            </div>
          </div>
          
          <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
            <Brain className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <p className="font-medium text-sm">{t('demo.jobs', '5 Training Jobs')}</p>
              <p className="text-xs text-muted-foreground">{t('demo.jobsDesc', 'Various statuses')}</p>
            </div>
          </div>
          
          <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
            <Rocket className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <p className="font-medium text-sm">{t('demo.models', '2 Fine-tuned Models')}</p>
              <p className="text-xs text-muted-foreground">{t('demo.modelsDesc', 'Ready to test')}</p>
            </div>
          </div>
        </div>

        {/* Progress indicator */}
        {seeding && (
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">{status}</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button 
            onClick={handleSeedData} 
            disabled={seeding || cleaning}
            className="flex-1 gap-2"
          >
            {seeding ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t('demo.creating', 'Creating...')}
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4" />
                {t('demo.createDemoData', 'Create Demo Data')}
              </>
            )}
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button 
                variant="outline" 
                disabled={seeding || cleaning}
                className="flex-1 gap-2"
              >
                {cleaning ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t('demo.cleaning', 'Removing...')}
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    {t('demo.removeDemoData', 'Remove Demo Data')}
                  </>
                )}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t('demo.confirmRemoveTitle', 'Remove Demo Data?')}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t('demo.confirmRemoveDesc', 'This will delete all projects with "(Demo)" in their name and all associated datasets, training jobs, and metrics. This action cannot be undone.')}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t('common.cancel', 'Cancel')}</AlertDialogCancel>
                <AlertDialogAction onClick={handleCleanup} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  {t('demo.confirmRemove', 'Remove Demo Data')}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        <p className="text-xs text-muted-foreground">
          {t('demo.note', 'Note: Creating demo data will add new projects. Running it multiple times will create duplicate data. Use "Remove Demo Data" to clean up before creating fresh data.')}
        </p>
      </CardContent>
    </Card>
  );
}
