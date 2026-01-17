import { Avatar } from '@/components/ui';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface Guest {
  id: string;
  displayName: string;
  avatarUrl?: string | null;
  status: 'GOING' | 'MAYBE' | 'NOT_GOING' | 'WAITLIST';
  plusOnes?: number;
}

interface GuestListProps {
  guests: Guest[];
  totalCount?: number;
  showAll?: boolean;
  maxDisplay?: number;
  className?: string;
}

export function GuestList({
  guests,
  totalCount,
  showAll = false,
  maxDisplay = 8,
  className,
}: GuestListProps) {
  const displayGuests = showAll ? guests : guests.slice(0, maxDisplay);
  const remainingCount = (totalCount || guests.length) - displayGuests.length;

  const statusGroups = {
    GOING: { label: 'Going', color: 'text-green-600' },
    MAYBE: { label: 'Maybe', color: 'text-yellow-600' },
    WAITLIST: { label: 'Waitlisted', color: 'text-orange-600' },
    NOT_GOING: { label: 'Not Going', color: 'text-gray-500' },
  };

  return (
    <div className={cn('', className)}>
      <div className="flex flex-wrap gap-2">
        {displayGuests.map((guest) => (
          <Link
            key={guest.id}
            href={`/u/${guest.id}`}
            className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Avatar
              src={guest.avatarUrl}
              name={guest.displayName}
              size="sm"
            />
            <div className="min-w-0">
              <div className="text-sm font-medium text-gray-900 truncate">
                {guest.displayName}
                {guest.plusOnes && guest.plusOnes > 0 && (
                  <span className="text-gray-500 font-normal"> +{guest.plusOnes}</span>
                )}
              </div>
              <div className={cn('text-xs', statusGroups[guest.status].color)}>
                {statusGroups[guest.status].label}
              </div>
            </div>
          </Link>
        ))}
      </div>

      {remainingCount > 0 && !showAll && (
        <p className="mt-3 text-sm text-gray-500">
          +{remainingCount} more {remainingCount === 1 ? 'guest' : 'guests'}
        </p>
      )}
    </div>
  );
}

interface GuestAvatarsProps {
  guests: Guest[];
  max?: number;
  size?: 'xs' | 'sm' | 'md';
  className?: string;
}

export function GuestAvatars({ guests, max = 5, size = 'sm', className }: GuestAvatarsProps) {
  const displayGuests = guests.slice(0, max);
  const remaining = guests.length - max;

  const sizeClasses = {
    xs: 'w-6 h-6 text-xs -ml-1.5 first:ml-0',
    sm: 'w-8 h-8 text-sm -ml-2 first:ml-0',
    md: 'w-10 h-10 text-sm -ml-2.5 first:ml-0',
  };

  return (
    <div className={cn('flex items-center', className)}>
      {displayGuests.map((guest) => (
        <div
          key={guest.id}
          className={cn(
            'rounded-full border-2 border-white',
            sizeClasses[size]
          )}
        >
          <Avatar
            src={guest.avatarUrl}
            name={guest.displayName}
            size={size}
          />
        </div>
      ))}
      {remaining > 0 && (
        <div
          className={cn(
            'rounded-full border-2 border-white bg-gray-100 flex items-center justify-center text-gray-600 font-medium',
            sizeClasses[size]
          )}
        >
          +{remaining}
        </div>
      )}
    </div>
  );
}
