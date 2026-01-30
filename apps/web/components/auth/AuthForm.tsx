"use client"

import * as React from "react"
import Link from "next/link"
import { useSignIn, useSignUp } from "@clerk/nextjs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"

interface AuthFormProps {
  variant: "sign-in" | "sign-up"
  onSubmit?: (email: string, password?: string) => void | Promise<void>
  redirectUrl?: string
}

function isValidRedirectUrl(url: string): boolean {
  // Only allow relative paths starting with /
  if (url.startsWith('/') && !url.startsWith('//')) {
    return true;
  }
  // Or same-origin URLs
  try {
    const parsed = new URL(url, window.location.origin);
    return parsed.origin === window.location.origin;
  } catch {
    return false;
  }
}

export function AuthForm({ variant, onSubmit, redirectUrl = "/dashboard" }: AuthFormProps) {
  const { signIn, isLoaded: isSignInLoaded } = useSignIn()
  const { signUp, isLoaded: isSignUpLoaded } = useSignUp()

  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const isSignIn = variant === "sign-in"
  const isLoaded = isSignIn ? isSignInLoaded : isSignUpLoaded

  const handleOAuthSignIn = React.useCallback(async (strategy: "oauth_google" | "oauth_github" | "oauth_apple") => {
    if (!isLoaded) return

    setIsLoading(true)
    setError(null)

    try {
      const safeRedirectUrl = isValidRedirectUrl(redirectUrl) ? redirectUrl : "/dashboard";
      // For OAuth, we always use signIn - Clerk will handle sign-up automatically if needed
      if (signIn) {
        await signIn.authenticateWithRedirect({
          strategy,
          redirectUrl: "/sso-callback",
          redirectUrlComplete: safeRedirectUrl,
        })
      }
    } catch (err: unknown) {
      console.error("OAuth error:", err)
      const clerkError = err as { errors?: Array<{ message: string; longMessage?: string; code?: string }> }
      if (clerkError.errors?.[0]) {
        const errorInfo = clerkError.errors[0]
        // Check for specific error codes
        if (errorInfo.code === "form_identifier_not_found") {
          setError("No account found. Please sign up first.")
        } else if (errorInfo.code === "external_account_not_found") {
          setError("Google account not linked. Please sign up with Google first.")
        } else if (errorInfo.code?.includes("oauth")) {
          setError("Google sign-in is not enabled. Please contact support.")
        } else {
          setError(errorInfo.longMessage || errorInfo.message || "Failed to connect. Please try again.")
        }
      } else {
        setError("Failed to connect with Google. Please try again.")
      }
      setIsLoading(false)
    }
  }, [isLoaded, signIn, redirectUrl])

  const handleFormSubmit = React.useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      if (!isLoaded) return

      setIsLoading(true)
      setError(null)

      try {
        const safeRedirectUrl = isValidRedirectUrl(redirectUrl) ? redirectUrl : "/dashboard";

        if (onSubmit) {
          await onSubmit(email, isSignIn ? password : undefined)
        } else if (isSignIn && signIn) {
          // Sign in with email/password
          const result = await signIn.create({
            identifier: email,
            password,
          })

          if (result.status === "complete") {
            window.location.href = safeRedirectUrl
          }
        } else if (signUp) {
          // Sign up with email - starts email verification
          await signUp.create({
            emailAddress: email,
          })

          // Send email verification
          await signUp.prepareEmailAddressVerification({
            strategy: "email_code",
          })

          // For now, redirect to a verification page or show message
          setError("Check your email for a verification code.")
        }
      } catch (err: unknown) {
        console.error("Auth error:", err)
        const clerkError = err as { errors?: Array<{ message: string }> }
        if (clerkError.errors?.[0]?.message) {
          setError(clerkError.errors[0].message)
        } else {
          setError("An error occurred. Please try again.")
        }
      } finally {
        setIsLoading(false)
      }
    },
    [email, password, isSignIn, isLoaded, onSubmit, signIn, signUp, redirectUrl]
  )

  return (
    <div className="w-full max-w-md mx-auto space-y-8">
      {/* Header */}
      <div className="space-y-3 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-white">
          {isSignIn ? "Welcome back" : "Welcome to AOG Outreach"}
        </h1>
        <p className="text-base text-gray-400">
          {isSignIn
            ? "Sign in to continue growing your book"
            : "Create your account and start growing your book on autopilot"}
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-3 text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-md">
          {error}
        </div>
      )}

      {/* Google Button */}
      <Button
        type="button"
        onClick={() => handleOAuthSignIn("oauth_google")}
        disabled={isLoading || !isLoaded}
        className="bg-white text-black border-white/20 border hover:bg-gray-100 w-full h-11 font-medium"
      >
        <svg
          className="mr-2 h-5 w-5"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            fill="#4285F4"
          />
          <path
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            fill="#34A853"
          />
          <path
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            fill="#FBBC05"
          />
          <path
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            fill="#EA4335"
          />
        </svg>
        Continue with Google
      </Button>

      {/* Divider */}
      <div className="relative flex items-center py-2">
        <Separator className="flex-1 bg-white/20" />
        <span className="px-4 text-sm text-gray-400 font-medium">or</span>
        <Separator className="flex-1 bg-white/20" />
      </div>

      {/* Email/Password Form */}
      <form onSubmit={handleFormSubmit} className="space-y-6">
        {/* Email Field */}
        <div className="space-y-2">
          <Label
            htmlFor="email"
            className="text-sm font-semibold text-white"
          >
            Email
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={isLoading}
            className="h-11"
            aria-describedby={email ? undefined : "email-description"}
          />
        </div>

        {/* Password Field (Sign-In Only) */}
        {isSignIn && (
          <div className="space-y-2">
            <Label
              htmlFor="password"
              className="text-sm font-semibold text-white"
            >
              Password
            </Label>
            <Input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading}
              className="h-11"
              aria-describedby={password ? undefined : "password-description"}
            />
          </div>
        )}

        {/* CAPTCHA container for Clerk bot protection */}
        {!isSignIn && <div id="clerk-captcha" />}

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={isLoading}
          className="bg-[#d4a84b] text-[#1a1d29] border-[#d4a84b] hover:bg-[#e5b95c] w-full h-11 font-semibold"
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <svg
                className="animate-spin h-4 w-4"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Processing...
            </span>
          ) : isSignIn ? (
            "Sign in"
          ) : (
            "Create account"
          )}
        </Button>
      </form>

      {/* Footer Link */}
      <div className="text-center">
        <p className="text-sm text-gray-400">
          {isSignIn ? "Don't have an account? " : "Already have an account? "}
          <Link
            href={isSignIn ? "/sign-up" : "/sign-in"}
            className="font-semibold text-[#d4a84b] underline underline-offset-4 hover:text-[#e5b95c] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d4a84b] focus-visible:ring-offset-2 rounded"
          >
            {isSignIn ? "Sign up" : "Sign in"}
          </Link>
        </p>
      </div>
    </div>
  )
}
