'use client';

import { useState } from 'react';
import { Button } from '@/components/ui';
import { useAuth } from '@/components/providers';
import { cn } from '@/lib/utils';

interface RSVPButtonProps {
  eventId: string;
  currentStatus?: 'GOING' | 'MAYBE' | 'NOT_GOING' | 'WAITLIST' | null;
  onUpdate?: (status: string) => void;
  disabled?: boolean;
  className?: string;
}

export function RSVPButton({
  eventId,
  currentStatus,
  onUpdate,
  disabled = false,
  className,
}: RSVPButtonProps) {
  const { isAuthenticated } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [status, setStatus] = useState(currentStatus);

  const handleRSVP = async (newStatus: 'GOING' | 'MAYBE' | 'NOT_GOING') => {
    if (!isAuthenticated) {
      window.location.href = `/login?redirect=/e/${eventId}`;
      return;
    }

    setIsLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`/api/events/${eventId}/rsvp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus, plusOnes: 0 }),
      });

      if (response.ok) {
        const data = await response.json();
        setStatus(data.data.status);
        onUpdate?.(data.data.status);
        setShowOptions(false);
      }
    } catch (error) {
      console.error('RSVP error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      await fetch(`/api/events/${eventId}/rsvp`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setStatus(null);
      onUpdate?.(null as unknown as string);
      setShowOptions(false);
    } catch (error) {
      console.error('Cancel RSVP error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const statusLabels: Record<string, string> = {
    GOING: '✓ Going',
    MAYBE: '? Maybe',
    NOT_GOING: '✕ Not Going',
    WAITLIST: '⏳ Waitlisted',
  };

  const statusColors: Record<string, string> = {
    GOING: 'bg-green-600 hover:bg-green-700',
    MAYBE: 'bg-yellow-600 hover:bg-yellow-700',
    NOT_GOING: 'bg-gray-600 hover:bg-gray-700',
    WAITLIST: 'bg-orange-600 hover:bg-orange-700',
  };

  if (status && status !== 'NOT_GOING') {
    return (
      <div className={cn('relative', className)}>
        <Button
          onClick={() => setShowOptions(!showOptions)}
          disabled={disabled || isLoading}
          className={cn('min-w-[120px]', statusColors[status] || '')}
          isLoading={isLoading}
        >
          {statusLabels[status] || status}
        </Button>

        {showOptions && (
          <div className="absolute top-full mt-2 right-0 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50 min-w-[160px]">
            {status !== 'GOING' && (
              <button
                onClick={() => handleRSVP('GOING')}
                className="block w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100"
              >
                ✓ Going
              </button>
            )}
            {status !== 'MAYBE' && (
              <button
                onClick={() => handleRSVP('MAYBE')}
                className="block w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100"
              >
                ? Maybe
              </button>
            )}
            <hr className="my-1" />
            <button
              onClick={handleCancel}
              className="block w-full text-left px-4 py-2 text-red-600 hover:bg-gray-100"
            >
              Cancel RSVP
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={cn('relative', className)}>
      <Button
        onClick={() => setShowOptions(!showOptions)}
        disabled={disabled || isLoading}
        isLoading={isLoading}
        className="min-w-[120px]"
      >
        RSVP
      </Button>

      {showOptions && (
        <div className="absolute top-full mt-2 right-0 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50 min-w-[160px]">
          <button
            onClick={() => handleRSVP('GOING')}
            className="block w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100"
          >
            ✓ Going
          </button>
          <button
            onClick={() => handleRSVP('MAYBE')}
            className="block w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100"
          >
            ? Maybe
          </button>
          <button
            onClick={() => handleRSVP('NOT_GOING')}
            className="block w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100"
          >
            ✕ Can&apos;t Go
          </button>
        </div>
      )}
    </div>
  );
}
