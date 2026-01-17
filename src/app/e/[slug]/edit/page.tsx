'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/components/providers';
import { EventForm } from '@/components/events';
import { Card } from '@/components/ui';
import Link from 'next/link';

async function fetchEvent(slug: string) {
  const res = await fetch(`/api/events/${slug}`);
  if (!res.ok) throw new Error('Failed to fetch event');
  return res.json();
}

async function updateEvent(id: string, data: Record<string, unknown>) {
  const res = await fetch(`/api/events/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error?.message || 'Failed to update event');
  }
  return res.json();
}

interface EventEditPageProps {
  params: Promise<{ slug: string }>;
}

export default function EventEditPage({ params }: EventEditPageProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, isLoading: authLoading } = useAuth();
  const [slug, setSlug] = useState<string | null>(null);

  useEffect(() => {
    params.then((p) => setSlug(p.slug));
  }, [params]);

  const { data, isLoading, error } = useQuery({
    queryKey: ['event', slug],
    queryFn: () => fetchEvent(slug!),
    enabled: !!slug,
  });

  const updateMutation = useMutation({
    mutationFn: (formData: Record<string, unknown>) => updateEvent(data?.data?.id, formData),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['event', slug] });
      router.push(`/e/${response.data.slug}`);
    },
  });

  if (authLoading || isLoading || !slug) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-2xl mx-auto px-4">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/2 mb-8" />
            <Card className="p-6 space-y-4">
              <div className="h-10 bg-gray-200 rounded" />
              <div className="h-32 bg-gray-200 rounded" />
              <div className="h-10 bg-gray-200 rounded" />
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    router.push(`/login?redirect=/e/${slug}/edit`);
    return null;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Event not found</h1>
          <Link href="/" className="text-indigo-600 hover:text-indigo-700">
            Go back home
          </Link>
        </div>
      </div>
    );
  }

  const event = data?.data;

  // Check if user is the organizer
  if (event.organizerId !== user.id) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Not authorized</h1>
          <p className="text-gray-600 mb-4">You can only edit events you created.</p>
          <Link href={`/e/${slug}`} className="text-indigo-600 hover:text-indigo-700">
            Back to event
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Edit Event</h1>
          <Link
            href={`/e/${slug}`}
            className="text-gray-600 hover:text-gray-900"
          >
            Cancel
          </Link>
        </div>

        <Card className="p-6">
          <EventForm
            initialData={{
              title: event.title,
              description: event.description || '',
              startDate: event.startTime?.split('T')[0] || '',
              startTime: event.startTime?.split('T')[1]?.substring(0, 5) || '',
              endDate: event.endTime?.split('T')[0] || '',
              endTime: event.endTime?.split('T')[1]?.substring(0, 5) || '',
              timezone: event.timezone,
              privacy: event.privacy,
              locationString: event.locationName || '',
              isOnline: event.isOnline,
              onlineUrl: event.onlineUrl || '',
              capacity: event.capacity,
              allowPlusOnes: event.allowPlusOnes,
              maxPlusOnes: event.maxPlusOnes,
              enableWaitlist: event.enableWaitlist,
            }}
            onSubmit={async (data) => { updateMutation.mutate(data as unknown as Record<string, unknown>); }}
            isLoading={updateMutation.isPending}
            submitLabel="Save Changes"
          />
        </Card>
      </div>
    </div>
  );
}
