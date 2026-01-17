"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/providers';
import { Button, Input, Card, PasswordStrengthIndicator } from '@/components/ui';
import { isPasswordValid } from '@/lib/password-validation';

export default function RegisterPage() {
  const { registerWithPassword } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const passwordValid = isPasswordValid(password);
  const passwordsMatch = password === confirm;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors(null);

    if (!passwordsMatch) {
      setErrors('Passwords do not match');
      return;
    }

    if (!passwordValid) {
      setErrors('Password does not meet all requirements');
      return;
    }

    setIsLoading(true);
    const res = await registerWithPassword(email, password, displayName || undefined);
    setIsLoading(false);

    if (res.success) {
      router.push('/');
    } else {
      setErrors(res.error || 'Registration failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="max-w-md w-full" padding="lg">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Create an account</h1>
          <p className="text-gray-600">Use an email and a secure password to register</p>
        </div>

        {errors && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700" role="alert">
            {errors}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Email address" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <Input label="Display name (optional)" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          
          <div>
            <Input label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            <PasswordStrengthIndicator password={password} showRequirements />
          </div>

          <div>
            <Input label="Confirm password" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
            {confirm && !passwordsMatch && (
              <p className="mt-1 text-sm text-red-600">Passwords do not match</p>
            )}
            {confirm && passwordsMatch && (
              <p className="mt-1 text-sm text-green-600">Passwords match</p>
            )}
          </div>

          <Button type="submit" className="w-full" size="lg" isLoading={isLoading} disabled={!email || !password || !confirm || !passwordValid || !passwordsMatch}>
            Create account
          </Button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-500">
          Already have an account?{' '}
          <Link href="/login" className="text-indigo-600 hover:text-indigo-700">Sign in</Link>
        </div>
      </Card>
    </div>
  );
}
