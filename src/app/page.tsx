import Link from 'next/link';
import { EventCard } from '@/components/events';

async function getTrendingEvents() {
  try {
    // In production, this would use the actual API URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const res = await fetch(`${baseUrl}/api/discover/trending?limit=6`, {
      next: { revalidate: 60 }, // Revalidate every minute
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.data?.events || [];
  } catch {
    return [];
  }
}

async function getUpcomingEvents() {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const res = await fetch(`${baseUrl}/api/discover/upcoming?limit=6`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.data?.events || [];
  } catch {
    return [];
  }
}

export default async function Home() {
  const [trendingEvents, upcomingEvents] = await Promise.all([
    getTrendingEvents(),
    getUpcomingEvents(),
  ]);

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
          <div className="text-center">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6">
              Bring People Together
            </h1>
            <p className="text-xl sm:text-2xl text-white/90 mb-8 max-w-2xl mx-auto">
              Create and discover events that matter. Connect with your community,
              share experiences, and make memories.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/explore"
                className="bg-white text-indigo-600 px-8 py-3 rounded-lg font-semibold text-lg hover:bg-gray-100 transition-colors"
              >
                Explore Events
              </Link>
              <Link
                href="/create"
                className="bg-indigo-700/50 text-white px-8 py-3 rounded-lg font-semibold text-lg hover:bg-indigo-700/70 transition-colors border border-white/30"
              >
                Create Event
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Trending Events */}
      {trendingEvents.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold text-gray-900">🔥 Trending Events</h2>
            <Link
              href="/explore?sort=trending"
              className="text-indigo-600 font-medium hover:text-indigo-700"
            >
              View all →
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {trendingEvents.map((event: {
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
              <EventCard key={event.id} {...event} />
            ))}
          </div>
        </section>
      )}

      {/* Upcoming Events */}
      {upcomingEvents.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 bg-white">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold text-gray-900">📅 Upcoming Events</h2>
            <Link
              href="/explore"
              className="text-indigo-600 font-medium hover:text-indigo-700"
            >
              View all →
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {upcomingEvents.map((event: {
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
              <EventCard key={event.id} {...event} />
            ))}
          </div>
        </section>
      )}

      {/* Empty State */}
      {trendingEvents.length === 0 && upcomingEvents.length === 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          <div className="max-w-md mx-auto">
            <div className="w-24 h-24 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-12 h-12 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">No events yet</h2>
            <p className="text-gray-600 mb-6">
              Be the first to create an event and bring your community together!
            </p>
            <Link
              href="/create"
              className="inline-block bg-indigo-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
            >
              Create Your First Event
            </Link>
          </div>
        </section>
      )}

      {/* Features Section */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Why Choose Gather?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Privacy First</h3>
              <p className="text-gray-600">
                Control who sees your events. Public, unlisted, or private – you decide.
              </p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Community Focused</h3>
              <p className="text-gray-600">
                Build and grow your community with groups, recurring events, and discussions.
              </p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Mobile Ready</h3>
              <p className="text-gray-600">
                A seamless experience on any device. RSVP, share, and engage on the go.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
