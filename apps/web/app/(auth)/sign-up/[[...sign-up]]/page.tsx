import { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/AuthShell";
import { AuthForm } from "@/components/auth/AuthForm";

export const metadata: Metadata = {
  title: "Sign Up | LinkReach",
  description: "Create your LinkReach account",
};

interface SignUpPageProps {
  searchParams: Promise<{ redirect_url?: string }>;
}

export default async function SignUpPage({ searchParams }: SignUpPageProps) {
  const { userId } = await auth();
  const params = await searchParams;
  const redirectUrl = params.redirect_url || "/dashboard";

  // Redirect to the intended destination if already signed in
  if (userId) {
    redirect(redirectUrl);
  }

  return (
    <AuthShell>
      <AuthForm variant="sign-up" redirectUrl={redirectUrl} />
    </AuthShell>
  );
}
