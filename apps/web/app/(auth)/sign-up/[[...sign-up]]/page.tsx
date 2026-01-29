import { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/AuthShell";
import { AuthForm } from "@/components/auth/AuthForm";

export const metadata: Metadata = {
  title: "Sign Up | LinkReach",
  description: "Create your LinkReach account",
};

export default async function SignUpPage() {
  const { userId } = await auth();

  // Redirect to dashboard if already signed in
  if (userId) {
    redirect("/dashboard");
  }

  return (
    <AuthShell>
      <AuthForm variant="sign-up" />
    </AuthShell>
  );
}
