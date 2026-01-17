'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/providers';
import { Button, Input, Card, PasswordStrengthIndicator } from '@/components/ui';
import { isPasswordValid } from '@/lib/password-validation';

type AuthMode = 'magic' | 'signin' | 'register';

function LoginForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { login, signInPassword, registerWithPassword } = useAuth();

  // Support deep-linking via ?mode= query param
  const initialMode = (searchParams.get('mode') as AuthMode) || 'signin';
  const [mode, setMode] = useState<AuthMode>(
    ['magic', 'signin', 'register'].includes(initialMode) ? initialMode : 'signin'
  );

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  const redirect = searchParams.get('redirect') || '/';

  // Update URL when mode changes (without navigation)
  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set('mode', mode);
    window.history.replaceState({}, '', url.toString());
  }, [mode]);

  const handleModeChange = (newMode: AuthMode) => {
    setMode(newMode);
    setError('');
    setPassword('');
    setConfirmPassword('');
  };

  const passwordValid = isPasswordValid(password);
  const passwordsMatch = password === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    if (mode === 'magic') {
      const result = await login(email);
      setIsLoading(false);
      if (result.success) {
        setMagicLinkSent(true);
      } else {
        setError(result.error || 'Something went wrong');
      }
    } else if (mode === 'signin') {
      const res = await signInPassword(email, password);
      setIsLoading(false);
      if (res.success) {
        router.push(redirect);
      } else {
        setError(res.error || 'Invalid credentials');
      }
    } else if (mode === 'register') {
      if (!passwordsMatch) {
        setError('Passwords do not match');
        setIsLoading(false);
        return;
      }
      if (!passwordValid) {
        setError('Password does not meet all requirements');
        setIsLoading(false);
        return;
      }
      const res = await registerWithPassword(email, password, displayName || undefined);
      setIsLoading(false);
      if (res.success) {
        router.push(redirect);
      } else {
        setError(res.error || 'Registration failed');
      }
    }
  };

  if (magicLinkSent) {
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
            onClick={() => setMagicLinkSent(false)}
            className="text-indigo-600 font-medium hover:text-indigo-700"
          >
            Try again
          </button>
        </p>
      </Card>
    );
  }

  const tabs: { id: AuthMode; label: string }[] = [
    { id: 'magic', label: 'Magic Link' },
    { id: 'signin', label: 'Sign In' },
    { id: 'register', label: 'Create Account' },
  ];

  return (
    <Card className="max-w-md w-full" padding="lg">
      <div className="text-center mb-6">
        <Link href="/" className="inline-flex items-center gap-2 mb-4">
          <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-xl">G</span>
          </div>
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Welcome to Gather</h1>
        <p className="text-gray-600 text-sm">
          {mode === 'magic' && 'Sign in with a magic link sent to your email'}
          {mode === 'signin' && 'Sign in with your email and password'}
          {mode === 'register' && 'Create a new account'}
        </p>
      </div>

      {/* Three-tab navigation */}
      <div className="flex border-b border-gray-200 mb-6" role="tablist">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={mode === tab.id}
            onClick={() => handleModeChange(tab.id)}
            className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
              mode === tab.id
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm" role="alert">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Email address"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          required
          autoFocus
        />

        {mode === 'register' && (
          <Input
            label="Display name (optional)"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Your name"
          />
        )}

        {(mode === 'signin' || mode === 'register') && (
          <div>
            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            {mode === 'register' && <PasswordStrengthIndicator password={password} />}
          </div>
        )}

        {mode === 'register' && (
          <div>
            <Input
              label="Confirm password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
            {confirmPassword && !passwordsMatch && (
              <p className="mt-1 text-sm text-red-600">Passwords do not match</p>
            )}
            {confirmPassword && passwordsMatch && (
              <p className="mt-1 text-sm text-green-600">Passwords match</p>
            )}
          </div>
        )}

        {mode === 'signin' && (
          <div className="text-right">
            <Link href="/forgot-password" className="text-sm text-indigo-600 hover:text-indigo-700">
              Forgot password?
            </Link>
          </div>
        )}

        <Button
          type="submit"
          className="w-full"
          size="lg"
          isLoading={isLoading}
          disabled={
            !email ||
            (mode === 'signin' && !password) ||
            (mode === 'register' && (!password || !confirmPassword || !passwordValid || !passwordsMatch))
          }
        >
          {mode === 'magic' && 'Send Magic Link'}
          {mode === 'signin' && 'Sign In'}
          {mode === 'register' && 'Create Account'}
        </Button>
      </form>

      <div className="mt-6 text-center text-xs text-gray-500">
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
        <div className="flex gap-2">
          <div className="h-10 bg-gray-200 rounded flex-1" />
          <div className="h-10 bg-gray-200 rounded flex-1" />
          <div className="h-10 bg-gray-200 rounded flex-1" />
        </div>
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
