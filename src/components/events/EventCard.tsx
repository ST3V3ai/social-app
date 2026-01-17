import Link from 'next/link';
import { formatDate, formatTime } from '@/lib/utils';
import { Avatar, Badge } from '@/components/ui';
import { cn } from '@/lib/utils';

export interface EventCardProps {
  id: string;
  slug: string;
  title: string;
  description?: string;
  coverImageUrl?: string | null;
  startTime: string;
  endTime?: string | null;
  timezone?: string;
  privacy: string;
  location?: {
    name?: string;
    city?: string;
  } | null;
  host: {
    id: string;
    displayName: string;
    avatarUrl?: string | null;
  };
  goingCount?: number;
  isOnline?: boolean;
  className?: string;
  variant?: 'default' | 'compact';
}

export function EventCard({
  slug,
  title,
  description,
  coverImageUrl,
  startTime,
  endTime,
  privacy,
  location,
  host,
  goingCount = 0,
  isOnline,
  className,
  variant = 'default',
}: EventCardProps) {
  const startDate = new Date(startTime);
  const isCompact = variant === 'compact';

  return (
    <Link
      href={`/e/${slug}`}
      className={cn(
        'group block bg-white rounded-xl border border-gray-200 overflow-hidden transition-shadow hover:shadow-md',
        className
      )}
    >
      {/* Cover Image */}
      {!isCompact && (
        <div className="relative aspect-[16/9] bg-gradient-to-br from-indigo-100 to-purple-100">
          {coverImageUrl ? (
            <img
              src={coverImageUrl}
              alt={title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <svg
                className="w-16 h-16 text-indigo-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
          )}
          {/* Privacy Badge */}
          {privacy !== 'PUBLIC' && (
            <div className="absolute top-3 left-3">
              <Badge variant={privacy === 'PRIVATE' ? 'warning' : 'default'} size="sm">
                {privacy === 'PRIVATE' ? 'Private' : 'Unlisted'}
              </Badge>
            </div>
          )}
        </div>
      )}

      <div className={cn('p-4', isCompact && 'flex gap-4')}>
        {/* Date Badge (Compact) */}
        {isCompact && (
          <div className="flex-shrink-0 w-14 h-14 bg-indigo-50 rounded-lg flex flex-col items-center justify-center">
            <span className="text-xs font-medium text-indigo-600 uppercase">
              {startDate.toLocaleDateString('en-US', { month: 'short' })}
            </span>
            <span className="text-xl font-bold text-gray-900">
              {startDate.getDate()}
            </span>
          </div>
        )}

        <div className="flex-1 min-w-0">
          {/* Date & Time */}
          <div className="flex items-center gap-2 text-sm text-indigo-600 font-medium mb-1">
            <span>
              {formatDate(startDate)}
            </span>
            <span className="text-gray-400">•</span>
            <span>{formatTime(startDate)}</span>
          </div>

          {/* Title */}
          <h3 className="font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors line-clamp-2 mb-2">
            {title}
          </h3>

          {/* Description (default variant only) */}
          {!isCompact && description && (
            <p className="text-sm text-gray-500 line-clamp-2 mb-3">
              {description}
            </p>
          )}

          {/* Location */}
          <div className="flex items-center gap-1.5 text-sm text-gray-500 mb-2">
            {isOnline ? (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <span>Online Event</span>
              </>
            ) : location?.name ? (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="truncate">
                  {location.name}
                  {location.city && `, ${location.city}`}
                </span>
              </>
            ) : null}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
            <div className="flex items-center gap-2">
              <Avatar
                src={host.avatarUrl}
                name={host.displayName}
                size="xs"
              />
              <span className="text-sm text-gray-600 truncate">
                {host.displayName}
              </span>
            </div>
            {goingCount > 0 && (
              <span className="text-sm text-gray-500">
                {goingCount} going
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
