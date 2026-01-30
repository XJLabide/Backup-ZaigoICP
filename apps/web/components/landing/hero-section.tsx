'use client';

import Link from 'next/link';
import { ArrowRight, Eye } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { HeroHighlight, Highlight } from '@/components/ui/hero-highlight';

export function HeroSection() {
  return (
    <section className="relative">
      <HeroHighlight containerClassName="min-h-screen">
        <div className="flex flex-col items-center text-center px-4">
          {/* Animated headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: [20, -5, 0] }}
            transition={{ duration: 0.5, ease: [0.4, 0.0, 0.2, 1] }}
            className="text-3xl md:text-5xl lg:text-6xl font-bold text-white max-w-4xl leading-tight"
          >
            Grow Your Book on{" "}
            <Highlight className="text-white">
              Autopilot
            </Highlight>
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-6 text-lg text-[#9ca3af] max-w-xl"
          >
            AI-powered LinkedIn outreach that finds business owners, executives, and high-net-worth prospects in your area—then sends personalized messages and follows up automatically. You focus on closing.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-8 flex flex-wrap items-center justify-center gap-4"
          >
            <Button
              asChild
              size="lg"
              className="h-12 px-6 bg-[#d4a84b] hover:bg-[#e5b95c] text-[#1a1d29] font-semibold rounded-full shadow-[0_0_20px_rgba(212,168,75,0.3)]"
            >
              <Link href="/sign-up">
                Start Growing
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>

            <Button
              asChild
              variant="outline"
              size="lg"
              className="h-12 px-6 border-white/20 text-white hover:bg-white/10 hover:border-[#d4a84b] font-medium rounded-full"
            >
              <Link href="#features">
                <Eye className="mr-2 h-4 w-4" />
                See How It Works
              </Link>
            </Button>
          </motion.div>
        </div>
      </HeroHighlight>
    </section>
  );
}
