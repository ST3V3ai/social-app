'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/providers';
import { Card } from '@/components/ui';

function VerifyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { verifyMagicLink } = useAuth();
  
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [error, setError] = useState('');

  const token = searchParams.get('token');
  const redirect = searchParams.get('redirect') || '/';

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setError('Invalid verification link');
      return;
    }

    const verify = async () => {
      const result = await verifyMagicLink(token);
      
      if (result.success) {
        setStatus('success');
        setTimeout(() => {
          router.push(redirect);
        }, 1500);
      } else {
        setStatus('error');
        setError(result.error || 'Failed to verify');
      }
    };

    verify();
  }, [token, verifyMagicLink, router, redirect]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="max-w-md w-full text-center" padding="lg">
        {status === 'loading' && (
          <>
            <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Verifying...</h1>
            <p className="text-gray-600">Please wait while we sign you in</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">You&apos;re in!</h1>
            <p className="text-gray-600">Redirecting you now...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Verification failed</h1>
            <p className="text-gray-600 mb-6">{error}</p>
            <Link
              href="/login"
              className="inline-block bg-indigo-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
            >
              Try again
            </Link>
          </>
        )}
      </Card>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <Card className="max-w-md w-full text-center" padding="lg">
          <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Loading...</h1>
        </Card>
      </div>
    }>
      <VerifyContent />
    </Suspense>
  );
}
