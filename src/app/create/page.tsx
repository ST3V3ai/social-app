'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers';
import { EventForm } from '@/components/events';
import { Card } from '@/components/ui';
import Link from 'next/link';

export default function CreateEventPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (formData: {
    title: string;
    description: string;
    startDate: string;
    startTime: string;
    endDate: string;
    endTime: string;
    timezone: string;
    isOnline: boolean;
    locationString: string;
    onlineUrl: string;
    privacy: 'PUBLIC' | 'UNLISTED' | 'PRIVATE';
    category: string;
    capacity: number | null;
    enableWaitlist: boolean;
    allowPlusOnes: boolean;
    maxPlusOnes: number;
    coverImageUrl: string;
  }) => {
    setIsSubmitting(true);
    setError('');

    try {
      const token = localStorage.getItem('accessToken');
      
      // Combine date and time
      const startTime = new Date(`${formData.startDate}T${formData.startTime}`).toISOString();
      let endTime: string | undefined;
      if (formData.endDate && formData.endTime) {
        endTime = new Date(`${formData.endDate}T${formData.endTime}`).toISOString();
      }

      const response = await fetch('/api/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description || undefined,
          startTime,
          endTime,
          timezone: formData.timezone,
          isOnline: formData.isOnline,
          location: formData.isOnline ? undefined : (formData.locationString ? { name: formData.locationString, address: formData.locationString } : undefined),
          onlineUrl: formData.isOnline ? formData.onlineUrl : undefined,
          privacy: formData.privacy,
          category: formData.category || undefined,
          capacity: formData.capacity,
          enableWaitlist: formData.enableWaitlist,
          allowPlusOnes: formData.allowPlusOnes,
          maxPlusOnes: formData.maxPlusOnes,
          coverImageUrl: formData.coverImageUrl || undefined,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        router.push(`/e/${data.data.slug}`);
      } else {
        const data = await response.json();
        setError(data.error?.message || 'Failed to create event');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <Card className="max-w-md w-full text-center" padding="lg">
          <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Sign in required</h1>
          <p className="text-gray-600 mb-6">
            You need to be signed in to create an event
          </p>
          <Link
            href="/login?redirect=/create"
            className="inline-block bg-indigo-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
          >
            Sign in
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Create Event</h1>
          <p className="mt-2 text-gray-600">
            Fill in the details below to create your event
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        <Card padding="lg">
          <EventForm
            onSubmit={handleSubmit}
            submitLabel="Create Event"
            isLoading={isSubmitting}
          />
        </Card>
      </div>
    </div>
  );
}
