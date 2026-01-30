'use client';

import { ReactNode } from 'react';
import dynamic from 'next/dynamic';
import { SidebarProvider, useSidebarState } from './sidebar-provider';
import { OnboardingProvider, useOnboarding } from '@/components/onboarding/onboarding-provider';
import { tourSteps } from '@/components/onboarding/tour-steps';
import { TourTooltip } from '@/components/onboarding/tour-tooltip';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';

// Dynamic import to avoid SSR issues
const Joyride = dynamic(() => import('react-joyride'), { ssr: false });

interface DashboardLayoutProps {
  children: ReactNode;
  hasCompletedOnboarding?: boolean;
}

function TourWrapper() {
  const { isRunning, stepIndex, setStepIndex, endTour } = useOnboarding();

  const handleJoyrideCallback = (data: any) => {
    const { status, index, type } = data;

    if (type === 'step:after') {
      setStepIndex(index + 1);
    }

    if (status === 'finished' || status === 'skipped') {
      endTour(status === 'finished');
    }
  };

  return (
    <Joyride
      steps={tourSteps}
      run={isRunning}
      stepIndex={stepIndex}
      continuous
      showSkipButton
      showProgress
      callback={handleJoyrideCallback}
      tooltipComponent={TourTooltip}
      styles={{
        options: {
          zIndex: 10000,
          arrowColor: '#242836',
        },
        spotlight: {
          backgroundColor: 'transparent',
        },
        overlay: {
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
        },
      }}
      floaterProps={{
        disableAnimation: true,
      }}
    />
  );
}

function DashboardContent({ children }: DashboardLayoutProps) {
  const { isCollapsed } = useSidebarState();

  return (
    <div className="min-h-screen bg-[#1a1d29]">
      <Sidebar />
      <div
        className={`min-h-screen flex flex-col transition-all duration-300 ease-in-out ${
          isCollapsed ? 'ml-[80px]' : 'ml-[260px]'
        }`}
      >
        <TopBar />
        <TourWrapper />
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

export function DashboardLayout({ children, hasCompletedOnboarding = false }: DashboardLayoutProps) {
  return (
    <SidebarProvider>
      <OnboardingProvider initialHasCompleted={hasCompletedOnboarding}>
        <DashboardContent>{children}</DashboardContent>
      </OnboardingProvider>
    </SidebarProvider>
  );
}
