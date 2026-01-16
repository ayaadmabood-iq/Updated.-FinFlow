import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Upload, 
  Search, 
  FileText, 
  Sparkles, 
  ArrowRight, 
  CheckCircle2,
  Loader2,
  Cloud,
  Play
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { OnboardingStep } from '@/hooks/useOnboarding';

interface OnboardingWizardProps {
  userId: string;
  currentStep: OnboardingStep;
  onStepChange: (step: OnboardingStep) => void;
  onComplete: () => void;
  onSkip: () => void;
}

const TOTAL_STEPS = 3;

export function OnboardingWizard({
  userId,
  currentStep,
  onStepChange,
  onComplete,
  onSkip,
}: OnboardingWizardProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isCreatingDemo, setIsCreatingDemo] = useState(false);
  const [demoProgress, setDemoProgress] = useState(0);

  const stepNumber = currentStep === 'welcome' ? 1 : currentStep === 'demo_project' ? 2 : 3;
  const progressPercent = (stepNumber / TOTAL_STEPS) * 100;

  const handleCreateDemoProject = async () => {
    setIsCreatingDemo(true);
    setDemoProgress(0);

    try {
      const interval = setInterval(() => {
        setDemoProgress(prev => Math.min(prev + 15, 90));
      }, 300);

      const { data, error } = await supabase.functions.invoke('seed-demo-data', {
        body: { action: 'seed' },
      });

      clearInterval(interval);

      if (error) throw error;

      setDemoProgress(100);
      
      toast({
        title: '🎉 Sample data created!',
        description: `Ready to explore with ${data?.created?.projects || 3} projects.`,
      });

      setTimeout(() => {
        onStepChange('upload_cta');
      }, 500);

    } catch (error: any) {
      console.error('Error creating demo data:', error);
      toast({
        variant: 'destructive',
        title: 'Failed to create sample data',
        description: error.message,
      });
    } finally {
      setIsCreatingDemo(false);
    }
  };

  const handleStartFromScratch = () => {
    onStepChange('upload_cta');
  };

  const handleGoToProjects = () => {
    onComplete();
    navigate('/projects');
  };

  const isOpen = currentStep !== 'complete';

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-xl p-0 overflow-hidden" onPointerDownOutside={(e) => e.preventDefault()}>
        {/* Progress Bar */}
        <div className="bg-muted/50 px-6 py-3 border-b">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground font-medium">
              Step {stepNumber} of {TOTAL_STEPS}
            </span>
            <Button variant="ghost" size="sm" className="text-xs h-6" onClick={onSkip}>
              Skip tour
            </Button>
          </div>
          <Progress value={progressPercent} className="h-1.5" />
        </div>

        <div className="p-6">
          {/* Step 1: Welcome */}
          {currentStep === 'welcome' && (
            <div className="space-y-6">
              <div className="text-center space-y-3">
                <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Cloud className="h-8 w-8 text-primary" />
                </div>
                <h2 className="text-2xl font-bold text-foreground">
                  Welcome to FineFlow!
                </h2>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Turn your documents into searchable, AI-ready knowledge in three simple steps.
                </p>
              </div>

              {/* Value Proposition - Simple Flow */}
              <div className="bg-muted/30 rounded-xl p-5 space-y-4">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 flex-1">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Upload className="h-5 w-5 text-primary" />
                    </div>
                    <span className="text-sm font-medium">Upload</span>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex items-center gap-2 flex-1">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <span className="text-sm font-medium">Process</span>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex items-center gap-2 flex-1">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Search className="h-5 w-5 text-primary" />
                    </div>
                    <span className="text-sm font-medium">Search</span>
                  </div>
                </div>
              </div>

              <Button 
                className="w-full gap-2" 
                size="lg"
                onClick={() => onStepChange('demo_project')}
              >
                Get Started
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Step 2: Demo Project */}
          {currentStep === 'demo_project' && (
            <div className="space-y-6">
              <div className="text-center space-y-3">
                <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Sparkles className="h-8 w-8 text-primary" />
                </div>
                <h2 className="text-2xl font-bold text-foreground">
                  Try with Sample Data
                </h2>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Explore FineFlow instantly with pre-loaded projects and documents.
                </p>
              </div>

              {isCreatingDemo ? (
                <div className="space-y-4 py-4">
                  <div className="flex items-center gap-3">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    <span className="text-sm text-muted-foreground">
                      Creating sample projects and documents...
                    </span>
                  </div>
                  <Progress value={demoProgress} className="h-2" />
                </div>
              ) : (
                <>
                  {/* What you'll get */}
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: '3 Sample Projects', desc: 'Customer Support, Medical, Legal' },
                      { label: 'Pre-processed Docs', desc: 'Ready to search' },
                      { label: 'Training Data', desc: 'Q&A pairs included' },
                      { label: 'Search Ready', desc: 'Explore AI search' },
                    ].map((item, i) => (
                      <div key={i} className="flex items-start gap-2 p-3 rounded-lg bg-muted/50">
                        <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-sm font-medium">{item.label}</p>
                          <p className="text-xs text-muted-foreground">{item.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-col gap-2">
                    <Button 
                      className="w-full gap-2" 
                      size="lg"
                      onClick={handleCreateDemoProject}
                    >
                      <Play className="h-4 w-4" />
                      Create Sample Data
                    </Button>
                    <Button 
                      variant="ghost" 
                      className="w-full"
                      onClick={handleStartFromScratch}
                    >
                      Start from scratch instead
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Step 3: Upload CTA */}
          {currentStep === 'upload_cta' && (
            <div className="space-y-6">
              <div className="text-center space-y-3">
                <div className="mx-auto w-16 h-16 rounded-2xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <CheckCircle2 className="h-8 w-8 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-foreground">
                  You're All Set!
                </h2>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Start by uploading your first document, or explore the sample projects.
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <Button 
                  className="w-full gap-2" 
                  size="lg"
                  onClick={handleGoToProjects}
                >
                  <Upload className="h-4 w-4" />
                  Go to Projects
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
