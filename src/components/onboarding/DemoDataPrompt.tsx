import React, { useState, useEffect } from 'react';
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
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Sparkles, Rocket, Database, Brain, FileText, Loader2 } from 'lucide-react';

interface DemoDataPromptProps {
  userId: string;
  onComplete?: () => void;
}

export function DemoDataPrompt({ userId, onComplete }: DemoDataPromptProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');
  const [hasChecked, setHasChecked] = useState(false);

  useEffect(() => {
    const checkProjects = async () => {
      if (hasChecked) return;
      
      try {
        const { data: projects, error } = await supabase
          .from('projects')
          .select('id')
          .eq('owner_id', userId)
          .limit(1);

        if (error) throw error;

        // Show prompt if user has no projects
        if (!projects || projects.length === 0) {
          setOpen(true);
        }
        
        setHasChecked(true);
      } catch (error) {
        console.error('Error checking projects:', error);
        setHasChecked(true);
      }
    };

    if (userId) {
      checkProjects();
    }
  }, [userId, hasChecked]);

  const handleCreateDemoData = async () => {
    setLoading(true);
    setProgress(0);
    setStatus(t('demo.initializing', 'Initializing...'));

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) return prev;
          return prev + Math.random() * 15;
        });
      }, 500);

      setStatus(t('demo.creatingProjects', 'Creating sample projects...'));
      await new Promise((r) => setTimeout(r, 500));
      setProgress(20);

      setStatus(t('demo.creatingDatasets', 'Generating training datasets...'));
      
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

      setOpen(false);
      onComplete?.();

    } catch (error: any) {
      console.error('Error creating demo data:', error);
      toast({
        variant: 'destructive',
        title: t('demo.errorTitle', 'Error creating demo data'),
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    setOpen(false);
    toast({
      title: t('demo.skippedTitle', 'No problem!'),
      description: t('demo.skippedDesc', 'You can always create demo data from Settings later.'),
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Sparkles className="h-6 w-6 text-primary" />
            {t('demo.welcomeTitle', 'Welcome to FineFlow!')}
          </DialogTitle>
          <DialogDescription className="text-base">
            {t('demo.welcomeDesc', "It looks like you're new here. Would you like to explore FineFlow with sample training data?")}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-6 space-y-4">
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">{status}</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        ) : (
          <div className="py-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                <Database className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="font-medium text-sm">3 Projects</p>
                  <p className="text-xs text-muted-foreground">Customer Support, Medical, Legal</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                <FileText className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="font-medium text-sm">4 Datasets</p>
                  <p className="text-xs text-muted-foreground">Ready for training</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                <Brain className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="font-medium text-sm">5 Training Jobs</p>
                  <p className="text-xs text-muted-foreground">Various statuses</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                <Rocket className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="font-medium text-sm">2 Fine-tuned Models</p>
                  <p className="text-xs text-muted-foreground">Ready to test</p>
                </div>
              </div>
            </div>

            <p className="text-sm text-muted-foreground">
              {t('demo.dataInfo', 'This will create realistic sample data to help you explore all features of FineFlow without needing to upload your own documents first.')}
            </p>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" onClick={handleSkip} disabled={loading}>
            {t('demo.skip', "I'll start from scratch")}
          </Button>
          <Button onClick={handleCreateDemoData} disabled={loading} className="gap-2">
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t('demo.creating', 'Creating...')}
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                {t('demo.tryWithData', 'Try with sample data')}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
