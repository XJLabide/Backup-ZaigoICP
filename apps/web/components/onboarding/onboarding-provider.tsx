'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

const ONBOARDING_STORAGE_KEY = 'zaig_onboarding_completed';

interface OnboardingContextValue {
  isRunning: boolean;
  stepIndex: number;
  hasCompletedOnboarding: boolean;
  startTour: () => void;
  endTour: (completed?: boolean) => void;
  setStepIndex: (index: number) => void;
}

const OnboardingContext = createContext<OnboardingContextValue | undefined>(undefined);

interface OnboardingProviderProps {
  children: React.ReactNode;
  initialHasCompleted?: boolean;
}

export function OnboardingProvider({
  children,
  initialHasCompleted = false
}: OnboardingProviderProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(initialHasCompleted);

  // Initialize completion status from localStorage if not provided
  // Also auto-start tour for new users
  useEffect(() => {
    if (!initialHasCompleted) {
      const stored = localStorage.getItem(ONBOARDING_STORAGE_KEY);
      if (stored === 'true') {
        setHasCompletedOnboarding(true);
      } else {
        // Auto-start tour for new users after a short delay
        // This gives the UI time to fully render before starting
        const timer = setTimeout(() => {
          setIsRunning(true);
        }, 1500);
        return () => clearTimeout(timer);
      }
    }
  }, [initialHasCompleted]);

  const startTour = useCallback(() => {
    setIsRunning(true);
    setStepIndex(0);
  }, []);

  const endTour = useCallback(async (completed = true) => {
    setIsRunning(false);
    setStepIndex(0);

    if (completed && !hasCompletedOnboarding) {
      // Update local state
      setHasCompletedOnboarding(true);

      // Save to localStorage as backup
      localStorage.setItem(ONBOARDING_STORAGE_KEY, 'true');

      // Save completion status to backend
      try {
        const response = await fetch('/api/me', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            hasCompletedOnboarding: true,
          }),
        });

        if (!response.ok) {
          console.error('Failed to save onboarding completion status:', response.statusText);
        }
      } catch (error) {
        console.error('Error saving onboarding completion:', error);
        // Continue even if API call fails - localStorage backup is in place
      }
    }
  }, [hasCompletedOnboarding]);

  const value: OnboardingContextValue = {
    isRunning,
    stepIndex,
    hasCompletedOnboarding,
    startTour,
    endTour,
    setStepIndex,
  };

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding(): OnboardingContextValue {
  const context = useContext(OnboardingContext);
  if (context === undefined) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
}

export { OnboardingContext };
