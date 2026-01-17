import { notFound } from 'next/navigation';
import { Avatar, Badge } from '@/components/ui';
import { EventCard } from '@/components/events';

interface ProfilePageProps {
  params: Promise<{ id: string }>;
}

async function getUser(id: string) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const res = await fetch(`${baseUrl}/api/users/${id}`, {
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.data;
  } catch {
    return null;
  }
}

async function getUserEvents(id: string) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const res = await fetch(`${baseUrl}/api/users/${id}/events?type=upcoming&limit=6`, {
      cache: 'no-store',
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.data?.events || [];
  } catch {
    return [];
  }
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { id } = await params;
  const [user, events] = await Promise.all([
    getUser(id),
    getUserEvents(id),
  ]);

  if (!user) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-indigo-500 to-purple-600 h-40" />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 -mt-16 pb-16">
        {/* Profile Card */}
        <div className="bg-white rounded-xl shadow-lg p-6 sm:p-8 mb-8">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            <Avatar
              src={user.avatarUrl}
              name={user.displayName}
              size="xl"
              className="w-24 h-24"
            />
            <div className="flex-1 text-center sm:text-left">
              <h1 className="text-2xl font-bold text-gray-900">{user.displayName}</h1>
              {user.username && (
                <p className="text-gray-500">@{user.username}</p>
              )}
              {user.bio && (
                <p className="mt-3 text-gray-600">{user.bio}</p>
              )}
              
              <div className="flex flex-wrap justify-center sm:justify-start gap-4 mt-4 text-sm text-gray-500">
                {user.location && (
                  <span className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {user.location}
                  </span>
                )}
                {user.website && (
                  <a
                    href={user.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-indigo-600 hover:text-indigo-700"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                    Website
                  </a>
                )}
                <span className="flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {user.eventCount} events hosted
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Events Section */}
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-6">Upcoming Events</h2>
          
          {events.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {events.map((event: {
                id: string;
                slug: string;
                title: string;
                description?: string;
                coverImageUrl?: string;
                startTime: string;
                endTime?: string;
                privacy: string;
                location?: { name?: string; city?: string };
                host: { id: string; displayName: string; avatarUrl?: string };
                goingCount?: number;
              }) => (
                <EventCard key={event.id} {...event} host={{ id: user.id, displayName: user.displayName, avatarUrl: user.avatarUrl }} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-white rounded-xl">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-gray-500">No upcoming events</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
