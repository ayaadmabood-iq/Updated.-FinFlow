import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type OnboardingStep = 'welcome' | 'demo_project' | 'upload_cta' | 'complete';

interface OnboardingState {
  currentStep: OnboardingStep;
  isComplete: boolean;
  hasProjects: boolean;
  hasDocuments: boolean;
  isLoading: boolean;
}

const ONBOARDING_KEY = 'fineflow_onboarding_state';

export function useOnboarding(userId: string | undefined) {
  const [state, setState] = useState<OnboardingState>({
    currentStep: 'welcome',
    isComplete: false,
    hasProjects: false,
    hasDocuments: false,
    isLoading: true,
  });

  // Check if onboarding was previously completed
  useEffect(() => {
    if (!userId) return;

    const checkOnboardingState = async () => {
      try {
        // Check localStorage first for quick state restoration
        const savedState = localStorage.getItem(`${ONBOARDING_KEY}_${userId}`);
        if (savedState) {
          const parsed = JSON.parse(savedState);
          if (parsed.isComplete) {
            setState(prev => ({ ...prev, isComplete: true, isLoading: false }));
            return;
          }
        }

        // Check if user has projects
        const { data: projects, error: projectsError } = await supabase
          .from('projects')
          .select('id')
          .eq('owner_id', userId)
          .limit(1);

        if (projectsError) throw projectsError;

        const hasProjects = projects && projects.length > 0;

        // Check if user has documents (indicates real engagement)
        let hasDocuments = false;
        if (hasProjects) {
          const { data: documents, error: docsError } = await supabase
            .from('documents')
            .select('id')
            .limit(1);
          
          if (!docsError && documents && documents.length > 0) {
            hasDocuments = true;
          }
        }

        // Determine onboarding state
        const isComplete = hasProjects && hasDocuments;
        
        setState({
          currentStep: isComplete ? 'complete' : hasProjects ? 'upload_cta' : 'welcome',
          isComplete,
          hasProjects,
          hasDocuments,
          isLoading: false,
        });

        // Save state
        if (isComplete) {
          localStorage.setItem(`${ONBOARDING_KEY}_${userId}`, JSON.stringify({ isComplete: true }));
        }
      } catch (error) {
        console.error('Error checking onboarding state:', error);
        setState(prev => ({ ...prev, isLoading: false }));
      }
    };

    checkOnboardingState();
  }, [userId]);

  const setStep = useCallback((step: OnboardingStep) => {
    setState(prev => ({ ...prev, currentStep: step }));
  }, []);

  const completeOnboarding = useCallback(() => {
    if (!userId) return;
    
    setState(prev => ({ ...prev, isComplete: true, currentStep: 'complete' }));
    localStorage.setItem(`${ONBOARDING_KEY}_${userId}`, JSON.stringify({ isComplete: true }));
  }, [userId]);

  const skipOnboarding = useCallback(() => {
    if (!userId) return;
    
    setState(prev => ({ ...prev, isComplete: true, currentStep: 'complete' }));
    localStorage.setItem(`${ONBOARDING_KEY}_${userId}`, JSON.stringify({ isComplete: true, skipped: true }));
  }, [userId]);

  const refreshState = useCallback(async () => {
    if (!userId) return;
    
    try {
      const { data: projects } = await supabase
        .from('projects')
        .select('id')
        .eq('owner_id', userId)
        .limit(1);

      const hasProjects = projects && projects.length > 0;
      
      if (hasProjects) {
        setState(prev => ({ 
          ...prev, 
          hasProjects: true,
          currentStep: prev.currentStep === 'demo_project' ? 'upload_cta' : prev.currentStep
        }));
      }
    } catch (error) {
      console.error('Error refreshing onboarding state:', error);
    }
  }, [userId]);

  return {
    ...state,
    setStep,
    completeOnboarding,
    skipOnboarding,
    refreshState,
  };
}

// Feature flags for advanced sections
export function useFeatureFlags() {
  const [showAdvanced, setShowAdvanced] = useState(() => {
    const saved = localStorage.getItem('fineflow_show_advanced');
    return saved === 'true';
  });

  const toggleAdvanced = useCallback(() => {
    setShowAdvanced(prev => {
      const next = !prev;
      localStorage.setItem('fineflow_show_advanced', String(next));
      return next;
    });
  }, []);

  return { showAdvanced, toggleAdvanced };
}
