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
  title: 'AOG Outreach - Grow Your Book on Autopilot',
  description: 'AI-powered LinkedIn outreach that finds business owners, executives, and high-net-worth prospects—then sends personalized messages and follows up automatically. You focus on closing.',
};

export default function HomePage() {
  return (
    <div className="landing-dark min-h-screen bg-[#1a1d29] text-white">
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
