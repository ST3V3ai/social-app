'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/components/providers';
import { EventCard } from '@/components/events';
import { Button, Card, Badge } from '@/components/ui';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';

interface Event {
  id: string;
  slug: string;
  title: string;
  coverImageUrl: string | null;
  startTime: string;
  endTime: string | null;
  timezone: string;
  status: string;
  privacy: string;
  location: { name: string; city?: string } | null;
  goingCount: number;
  host?: {
    id: string;
    displayName: string;
    avatarUrl?: string | null;
  };
}

interface EventsResponse {
  data: {
    events: Event[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

interface Invite {
  id: string;
  token: string;
  status: string;
  message: string | null;
  type: string;
  createdAt: string;
  expiresAt: string | null;
  event: {
    id: string;
    slug: string;
    title: string;
    coverImageUrl: string | null;
    startTime: string;
    endTime: string | null;
    timezone: string;
    privacy: string;
    status: string;
    location: { name: string; address?: string | null } | null;
    host: {
      id: string;
      displayName: string;
      avatarUrl?: string | null;
    };
  };
  sender: {
    id: string;
    displayName: string;
    avatarUrl?: string | null;
  };
}

interface InvitesResponse {
  data: {
    invites: Invite[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

async function fetchMyEvents(type: string, page: number): Promise<EventsResponse> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

  const res = await fetch(`/api/users/me/events?type=${type}&page=${page}&limit=12`, { headers });
  if (!res.ok) {
    // If not found or unauthorized, try the current user's events endpoint
    const meRes = await fetch('/api/auth/me', { headers });
    if (!meRes.ok) throw new Error('Not authenticated');
    const userData = await meRes.json();
    const eventsRes = await fetch(`/api/users/${userData.data.id}/events?type=${type}&page=${page}&limit=12`, { headers });
    if (!eventsRes.ok) throw new Error('Failed to fetch events');
    return eventsRes.json();
  }
  return res.json();
}

async function fetchPendingInvites(): Promise<InvitesResponse> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

  const res = await fetch('/api/users/me/invites?status=PENDING&limit=10', { headers });
  if (!res.ok) {
    throw new Error('Failed to fetch invites');
  }
  return res.json();
}

function MyEventsContent() {
  const searchParams = useSearchParams();
  const { user, isLoading: authLoading } = useAuth();
  
  const [type, setType] = useState(searchParams.get('type') || 'upcoming');
  const [page, setPage] = useState(1);

  const { data, isLoading, error } = useQuery({
    queryKey: ['my-events', type, page, user?.id],
    queryFn: () => fetchMyEvents(type, page),
    enabled: !!user,
  });

  const { data: invitesData } = useQuery({
    queryKey: ['my-invites', user?.id],
    queryFn: () => fetchPendingInvites(),
    enabled: !!user,
  });

  const pendingInvites = invitesData?.data?.invites || [];

  if (authLoading) {
    return <EventsLoadingSkeleton />;
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Sign in to view your events</h2>
        <Link href="/login?redirect=/my-events">
          <Button>Sign In</Button>
        </Link>
      </div>
    );
  }

  const events = data?.data?.events || [];
  const pagination = data?.data?.pagination;

  return (
    <div>
      {/* Pending Invitations Section */}
      {pendingInvites.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <span>📬 Pending Invitations</span>
            <Badge variant="warning">{pendingInvites.length}</Badge>
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pendingInvites.map((invite) => (
              <Link key={invite.id} href={`/join/${invite.token}`}>
                <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer border-l-4 border-indigo-500">
                  <div className="flex items-start gap-3">
                    {invite.event.coverImageUrl ? (
                      <img
                        src={invite.event.coverImageUrl}
                        alt=""
                        className="w-16 h-16 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-2xl">
                        🎉
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 truncate">{invite.event.title}</h3>
                      <p className="text-sm text-gray-500">
                        Invited by {invite.sender.displayName}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {formatDistanceToNow(new Date(invite.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                  {invite.message && (
                    <p className="mt-2 text-sm text-gray-600 italic truncate">"{invite.message}"</p>
                  )}
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {['upcoming', 'past', 'all'].map((tab) => (
          <button
            key={tab}
            onClick={() => { setType(tab); setPage(1); }}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              type === tab
                ? 'bg-indigo-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Events Grid */}
      {isLoading ? (
        <EventsLoadingSkeleton />
      ) : error ? (
        <Card className="p-8 text-center">
          <p className="text-red-600">Failed to load events</p>
        </Card>
      ) : events.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-gray-500 mb-4">
            {type === 'upcoming'
              ? "You don't have any upcoming events"
              : type === 'past'
              ? "You haven't hosted any events yet"
              : 'No events found'}
          </p>
          <Link href="/create">
            <Button>Create Your First Event</Button>
          </Link>
        </Card>
      ) : (
        <>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event: Event) => (
              <EventCard
                key={event.id}
                id={event.id}
                slug={event.slug}
                title={event.title}
                coverImageUrl={event.coverImageUrl}
                startTime={event.startTime}
                endTime={event.endTime}
                privacy={event.privacy}
                location={event.location}
                host={event.host || { id: user!.id, displayName: 'You' }}
                goingCount={event.goingCount}
              />
            ))}
          </div>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-8">
              <Button
                variant="outline"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Previous
              </Button>
              <span className="px-4 py-2 text-gray-600">
                Page {page} of {pagination.totalPages}
              </span>
              <Button
                variant="outline"
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={page === pagination.totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function EventsLoadingSkeleton() {
  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <Card key={i} className="animate-pulse">
          <div className="aspect-video bg-gray-200" />
          <div className="p-4 space-y-3">
            <div className="h-4 bg-gray-200 rounded w-3/4" />
            <div className="h-3 bg-gray-200 rounded w-1/2" />
            <div className="h-3 bg-gray-200 rounded w-2/3" />
          </div>
        </Card>
      ))}
    </div>
  );
}

export default function MyEventsPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-gray-900">My Events</h1>
          <Link href="/create">
            <Button>Create Event</Button>
          </Link>
        </div>

        <Suspense fallback={<EventsLoadingSkeleton />}>
          <MyEventsContent />
        </Suspense>
      </div>
    </div>
  );
}
