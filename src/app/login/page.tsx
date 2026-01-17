'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/providers';
import { Button, Input, Card } from '@/components/ui';

function LoginForm() {
  const searchParams = useSearchParams();
  const { login } = useAuth();
  
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const redirect = searchParams.get('redirect') || '/';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const result = await login(email);
    setIsLoading(false);

    if (result.success) {
      setSuccess(true);
    } else {
      setError(result.error || 'Something went wrong');
    }
  };

  if (success) {
    return (
      <Card className="max-w-md w-full text-center" padding="lg">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Check your email</h1>
        <p className="text-gray-600 mb-6">
          We&apos;ve sent a magic link to <strong>{email}</strong>. 
          Click the link in the email to sign in.
        </p>
        <p className="text-sm text-gray-500">
          Didn&apos;t receive it?{' '}
          <button
            onClick={() => setSuccess(false)}
            className="text-indigo-600 font-medium hover:text-indigo-700"
          >
            Try again
          </button>
        </p>
      </Card>
    );
  }

  return (
    <Card className="max-w-md w-full" padding="lg">
      <div className="text-center mb-8">
        <Link href="/" className="inline-flex items-center gap-2 mb-6">
          <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-xl">G</span>
          </div>
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Welcome to Gather</h1>
        <p className="text-gray-600">
          Sign in or create an account with your email
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Email address"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          required
          autoFocus
          error={error}
        />

        <Button
          type="submit"
          className="w-full"
          size="lg"
          isLoading={isLoading}
          disabled={!email}
        >
          Continue with Email
        </Button>
      </form>

      <div className="mt-6 text-center text-sm text-gray-500">
        <p>
          By continuing, you agree to our{' '}
          <Link href="/terms" className="text-indigo-600 hover:text-indigo-700">
            Terms of Service
          </Link>{' '}
          and{' '}
          <Link href="/privacy" className="text-indigo-600 hover:text-indigo-700">
            Privacy Policy
          </Link>
        </p>
      </div>
    </Card>
  );
}

function LoginFormLoading() {
  return (
    <Card className="max-w-md w-full" padding="lg">
      <div className="animate-pulse space-y-4">
        <div className="h-10 w-10 bg-gray-200 rounded-lg mx-auto" />
        <div className="h-6 bg-gray-200 rounded w-3/4 mx-auto" />
        <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto" />
        <div className="h-10 bg-gray-200 rounded" />
        <div className="h-12 bg-gray-200 rounded" />
      </div>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Suspense fallback={<LoginFormLoading />}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
