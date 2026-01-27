import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

export default async function HomePage() {
  const { userId } = await auth();

  if (userId) {
    redirect('/dashboard');
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center">
      <h1 className="text-4xl font-bold">LinkedIn Automation</h1>
      <p className="mt-4 text-gray-600">
        <a href="/sign-in" className="text-blue-600 hover:underline">Sign in</a>
        {' '}or{' '}
        <a href="/sign-up" className="text-blue-600 hover:underline">Sign up</a>
        {' '}to get started.
      </p>
    </main>
  );
}
