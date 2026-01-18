import { notFound } from 'next/navigation';
import Link from 'next/link';
import { formatDate, formatTime } from '@/lib/utils';
import { Avatar, Badge } from '@/components/ui';
import { RSVPButton, GuestAvatars, ShareButton, CancelEventButton } from '@/components/events';

interface EventPageProps {
  params: Promise<{ slug: string }>;
}

async function getEvent(slug: string) {
  try {
    // Use internal URL for server-side fetch
    const baseUrl = process.env.INTERNAL_API_URL || 'http://localhost:32300';
    const res = await fetch(`${baseUrl}/api/events/${slug}`, {
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.data;
  } catch {
    return null;
  }
}

export default async function EventPage({ params }: EventPageProps) {
  const { slug } = await params;
  const event = await getEvent(slug);

  if (!event) {
    notFound();
  }

  const startDate = new Date(event.startTime);
  const endDate = event.endTime ? new Date(event.endTime) : null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Cover Image */}
      <div className="relative h-64 sm:h-80 lg:h-96 bg-gradient-to-br from-indigo-500 to-purple-600">
        {event.coverImageUrl && (
          <img
            src={event.coverImageUrl}
            alt={event.title}
            className="w-full h-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 -mt-32 relative z-10 pb-16">
        {/* Event Card */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="p-6 sm:p-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
              <div className="flex-1">
                {event.privacy !== 'PUBLIC' && (
                  <Badge 
                    variant={event.privacy === 'PRIVATE' ? 'warning' : 'default'} 
                    className="mb-2"
                  >
                    {event.privacy === 'PRIVATE' ? 'Private Event' : 'Unlisted'}
                  </Badge>
                )}
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                  {event.title}
                </h1>
                <p className="text-gray-600">
                  Hosted by{' '}
                  <Link
                    href={`/u/${event.organizer.id}`}
                    className="font-medium text-gray-900 hover:text-indigo-600"
                  >
                    {event.organizer.displayName}
                  </Link>
                </p>
              </div>

              <div className="flex items-center gap-3">
                <RSVPButton eventId={event.id} currentStatus={event.userRsvp?.status} />
              </div>
            </div>

            {/* Date & Time */}
            <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg mb-6">
              <div className="w-12 h-12 bg-indigo-100 rounded-lg flex flex-col items-center justify-center flex-shrink-0">
                <span className="text-xs font-medium text-indigo-600 uppercase">
                  {startDate.toLocaleDateString('en-US', { month: 'short' })}
                </span>
                <span className="text-lg font-bold text-gray-900">
                  {startDate.getDate()}
                </span>
              </div>
              <div>
                <p className="font-semibold text-gray-900">
                  {formatDate(startDate)}
                </p>
                <p className="text-gray-600">
                  {formatTime(startDate)}
                  {endDate && ` - ${formatTime(endDate)}`}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  {event.timezone}
                </p>
              </div>
            </div>

            {/* Location */}
            <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg mb-6">
              <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                {event.isOnline ? (
                  <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                )}
              </div>
              <div>
                <p className="font-semibold text-gray-900">
                  {event.isOnline ? 'Online Event' : (event.venue?.name || event.locationString || 'Location TBD')}
                </p>
                {event.venue && (
                  <p className="text-gray-600">
                    {[event.venue.address, event.venue.city, event.venue.country]
                      .filter(Boolean)
                      .join(', ')}
                  </p>
                )}
                {event.isOnline && event.onlineUrl && (
                  <a
                    href={event.onlineUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-600 hover:text-indigo-700"
                  >
                    Join online →
                  </a>
                )}
              </div>
            </div>

            {/* Attendees */}
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Attendees</h2>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Badge variant="success">{event.rsvpCounts?.going || 0} Going</Badge>
                  {event.rsvpCounts?.maybe > 0 && (
                    <Badge variant="warning">{event.rsvpCounts.maybe} Maybe</Badge>
                  )}
                </div>
                {event.capacity && (
                  <span className="text-sm text-gray-500">
                    of {event.capacity} spots
                  </span>
                )}
              </div>
            </div>

            {/* Description */}
            {event.description && (
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-3">About</h2>
                <div className="prose prose-gray max-w-none">
                  <p className="text-gray-600 whitespace-pre-wrap">{event.description}</p>
                </div>
              </div>
            )}

            {/* Host & Co-hosts */}
            <div className="border-t border-gray-200 pt-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Hosted by</h2>
              <div className="flex flex-wrap gap-4">
                <Link
                  href={`/u/${event.organizer.id}`}
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <Avatar
                    src={event.organizer.avatarUrl}
                    name={event.organizer.displayName}
                    size="md"
                  />
                  <div>
                    <p className="font-medium text-gray-900">{event.organizer.displayName}</p>
                    <p className="text-sm text-gray-500">Organizer</p>
                  </div>
                </Link>
                {event.cohosts?.map((cohost: { id: string; displayName: string; avatarUrl?: string }) => (
                  <Link
                    key={cohost.id}
                    href={`/u/${cohost.id}`}
                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <Avatar
                      src={cohost.avatarUrl}
                      name={cohost.displayName}
                      size="md"
                    />
                    <div>
                      <p className="font-medium text-gray-900">{cohost.displayName}</p>
                      <p className="text-sm text-gray-500">Co-host</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="border-t border-gray-200 pt-6 mt-6 flex flex-wrap gap-3">
              <a
                href={`/api/events/${event.id}/ics`}
                className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Add to Calendar
              </a>
              <ShareButton title={event.title} />
              {event.canManage && (
                <Link
                  href={`/e/${event.slug}/edit`}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit Event
                </Link>
              )}
              {event.canManage && event.status !== 'CANCELLED' && (
                <CancelEventButton 
                  eventId={event.id} 
                  eventSlug={event.slug}
                  isAlreadyCancelled={event.status === 'CANCELLED'}
                />
              )}
              {event.status === 'CANCELLED' && (
                <span className="inline-flex items-center gap-2 px-4 py-2 bg-red-100 text-red-800 rounded-lg">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Event Cancelled
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
