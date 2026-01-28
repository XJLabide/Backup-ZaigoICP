import { Metadata } from 'next';
import {
  LandingHeader,
  HeroSection,
  CompanySection,
  AboutSection,
  WhyBetterSection,
  FooterSection,
} from '@/components/landing';

export const metadata: Metadata = {
  title: 'Flowline - Ship faster with intelligent automation',
  description: 'Automate your workflow, eliminate busywork, and focus on what matters. Purpose-built for teams who refuse to compromise.',
};

export default function HomePage() {
  return (
    <div className="landing-light min-h-screen bg-white text-neutral-900">
      {/* Header with auth */}
      <LandingHeader />

      {/* Subtle noise overlay */}
      <div className="fixed inset-0 pointer-events-none bg-noise opacity-20" />

      {/* Content - add pt-16 for header spacing */}
      <main className="relative z-10 pt-16">
        <HeroSection />
        <CompanySection />
        <AboutSection />
        <WhyBetterSection />
      </main>

      <FooterSection />
    </div>
  );
}
