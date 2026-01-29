"use client"

import { AuthenticateWithRedirectCallback } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { useAuth } from "@clerk/nextjs"

export default function SSOCallbackPage() {
  const router = useRouter()
  const { isSignedIn, isLoaded } = useAuth()

  // Fallback redirect if already signed in
  useEffect(() => {
    if (isLoaded && isSignedIn) {
      // Small delay to let Clerk finish processing
      const timeout = setTimeout(() => {
        router.push("/dashboard")
      }, 1000)
      return () => clearTimeout(timeout)
    }
  }, [isLoaded, isSignedIn, router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="text-center space-y-4">
        <div className="animate-spin h-8 w-8 border-4 border-black border-t-transparent rounded-full mx-auto" />
        <p className="text-neutral-600">Completing sign in...</p>
      </div>
      <AuthenticateWithRedirectCallback
        signInForceRedirectUrl="/dashboard"
        signUpForceRedirectUrl="/dashboard"
      />
    </div>
  )
}
