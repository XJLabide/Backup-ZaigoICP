import Link from 'next/link';
import { SignedIn, SignedOut, UserButton } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';

export function LandingHeader() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex justify-center pt-4 px-4">
      <nav className="flex items-center justify-between gap-12 px-8 py-3 bg-[#242836] border border-white/10 rounded-full shadow-lg shadow-black/20 min-w-[600px]">
        {/* Logo/Brand */}
        <Link href="/" className="flex items-center gap-2 pl-2">
          <img
            src="https://associateownersgroup.com/wp-content/uploads/Logo-Horizontal.svg"
            alt="AOG Outreach"
            className="h-8 w-auto"
          />
        </Link>

        {/* Nav Links */}
        <div className="hidden md:flex items-center gap-8">
          <Link href="#features" className="text-base text-[#9ca3af] hover:text-white transition-colors">
            Features
          </Link>
          <Link href="#pricing" className="text-base text-[#9ca3af] hover:text-white transition-colors">
            Pricing
          </Link>
        </div>

        {/* Auth Buttons */}
        <div className="flex items-center gap-4">
          <SignedOut>
            <Button
              asChild
              variant="ghost"
              className="text-base text-[#9ca3af] hover:text-white hover:bg-white/10 px-4 py-2"
            >
              <Link href="/sign-in">Sign In</Link>
            </Button>
            <Button
              asChild
              className="bg-[#d4a84b] text-[#1a1d29] border border-[#d4a84b] hover:bg-[#e5b95c] rounded-full px-6 py-2 text-base font-semibold shadow-[0_0_20px_rgba(212,168,75,0.2)] hover:shadow-[0_0_25px_rgba(212,168,75,0.3)] transition-all"
            >
              <Link href="/sign-up">Get Started</Link>
            </Button>
          </SignedOut>
          <SignedIn>
            <Button
              asChild
              variant="ghost"
              className="text-base text-[#9ca3af] hover:text-white hover:bg-white/10 px-4 py-2"
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
