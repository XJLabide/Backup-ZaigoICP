"use client";

import { ReactNode } from "react";

interface AuthShellProps {
  children: ReactNode;
}

export function AuthShell({ children }: AuthShellProps) {
  return (
    <div className="min-h-screen bg-[#1a1d29] flex flex-col">
      {/* Brand - top left */}
      <header className="absolute top-8 left-8">
        <img
          src="https://associateownersgroup.com/wp-content/uploads/Logo-Horizontal.svg"
          alt="AOG Outreach"
          className="h-8 w-auto"
        />
      </header>

      {/* Centered content */}
      <main className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          {children}
        </div>
      </main>

      {/* Legal footer */}
      <footer className="py-8 px-4 text-center">
        <p className="text-sm text-gray-400">
          By continuing, you agree to our{" "}
          <a href="/terms" className="text-[#d4a84b] underline hover:no-underline">
            Terms of Use
          </a>{" "}
          and{" "}
          <a href="/privacy" className="text-[#d4a84b] underline hover:no-underline">
            Privacy Policy
          </a>
          .
        </p>
      </footer>
    </div>
  );
}
