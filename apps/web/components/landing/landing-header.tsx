import Link from 'next/link';
import { SignedIn, SignedOut, UserButton } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';

export function LandingHeader() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex justify-center pt-4 px-4">
      <nav className="flex items-center justify-between gap-12 px-8 py-3 bg-white border border-neutral-200 rounded-full shadow-lg shadow-black/5 min-w-[600px]">
        {/* Logo/Brand */}
        <Link href="/" className="flex items-center gap-2 pl-2">
          <span className="text-xl font-bold text-neutral-900">Flowline</span>
        </Link>

        {/* Nav Links */}
        <div className="hidden md:flex items-center gap-8">
          <Link href="#features" className="text-base text-neutral-600 hover:text-neutral-900 transition-colors">
            Features
          </Link>
          <Link href="#pricing" className="text-base text-neutral-600 hover:text-neutral-900 transition-colors">
            Pricing
          </Link>
        </div>

        {/* Auth Buttons */}
        <div className="flex items-center gap-4">
          <SignedOut>
            <Button
              asChild
              variant="ghost"
              className="text-base text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 px-4 py-2"
            >
              <Link href="/sign-in">Sign In</Link>
            </Button>
            <Button
              asChild
              className="bg-white text-neutral-900 border border-neutral-900 hover:bg-neutral-50 rounded-full px-6 py-2 text-base shadow-[0_0_20px_rgba(0,0,0,0.1)] hover:shadow-[0_0_25px_rgba(0,0,0,0.15)] transition-all"
            >
              <Link href="/sign-up">Get Started</Link>
            </Button>
          </SignedOut>
          <SignedIn>
            <Button
              asChild
              variant="ghost"
              className="text-base text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 px-4 py-2"
            >
              <Link href="/dashboard">Dashboard</Link>
            </Button>
            <UserButton
              afterSignOutUrl="/"
              appearance={{
                elements: {
                  avatarBox: "w-9 h-9"
                }
              }}
            />
          </SignedIn>
        </div>
      </nav>
    </header>
  );
}
