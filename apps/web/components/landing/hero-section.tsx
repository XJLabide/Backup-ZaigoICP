'use client';

import Link from 'next/link';
import { ArrowRight, Play } from 'lucide-react';
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
            className="text-3xl md:text-5xl lg:text-6xl font-bold text-neutral-800 max-w-4xl leading-tight"
          >
            Outreach on{" "}
            <Highlight className="text-neutral-900">
              Autopilot
            </Highlight>
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-6 text-lg text-neutral-600 max-w-xl"
          >
            AI-powered LinkedIn automation that sends personalized messages,
            follows up intelligently, and grows your network while you sleep.
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
              className="h-12 px-6 bg-neutral-900 hover:bg-neutral-800 text-white font-medium rounded-full"
            >
              <Link href="/sign-up">
                Get Started
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>

            <Button
              asChild
              variant="outline"
              size="lg"
              className="h-12 px-6 border-neutral-300 text-neutral-700 hover:bg-neutral-100 font-medium rounded-full"
            >
              <Link href="#demo">
                <Play className="mr-2 h-4 w-4" />
                Watch Demo
              </Link>
            </Button>
          </motion.div>
        </div>
      </HeroHighlight>
    </section>
  );
}
