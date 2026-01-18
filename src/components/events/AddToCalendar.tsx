'use client';

import { useState } from 'react';
import { Button } from '@/components/ui';
import { Calendar, ChevronDown, Download, ExternalLink } from 'lucide-react';

interface Event {
  id: string;
  slug: string;
  title: string;
  description?: string;
  startTime: string;
  endTime?: string;
  timezone: string;
  isOnline: boolean;
  locationName?: string;
  locationAddress?: string;
  onlineUrl?: string;
}

interface AddToCalendarProps {
  event: Event;
  className?: string;
}

// Check if Google OAuth is configured
const GOOGLE_CALENDAR_ENABLED = !!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

export function AddToCalendar({ event, className = '' }: AddToCalendarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isAddingToGoogle, setIsAddingToGoogle] = useState(false);

  const location = event.isOnline
    ? event.onlineUrl || 'Online Event'
    : event.locationAddress || event.locationName || '';

  // Format dates for Google Calendar URL
  const formatGoogleDate = (dateStr: string) => {
    return new Date(dateStr).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  };

  // Generate Google Calendar URL (no OAuth required)
  const getGoogleCalendarUrl = () => {
    const startDate = formatGoogleDate(event.startTime);
    const endDate = event.endTime
      ? formatGoogleDate(event.endTime)
      : formatGoogleDate(new Date(new Date(event.startTime).getTime() + 60 * 60 * 1000).toISOString());

    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: event.title,
      dates: `${startDate}/${endDate}`,
      details: event.description || '',
      location: location,
      ctz: event.timezone,
    });

    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  };

  // Download ICS file
  const handleDownloadIcs = () => {
    window.location.href = `/api/events/${event.slug}/ics`;
    setIsOpen(false);
  };

  // Open Google Calendar in new tab
  const handleGoogleCalendar = () => {
    window.open(getGoogleCalendarUrl(), '_blank', 'noopener,noreferrer');
    setIsOpen(false);
  };

  // Add to Google Calendar via OAuth (if configured)
  const handleGoogleOAuth = async () => {
    if (!GOOGLE_CALENDAR_ENABLED) return;

    setIsAddingToGoogle(true);
    try {
      // Check if already authorized
      const checkRes = await fetch('/api/calendar/google/status', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });

      if (checkRes.ok) {
        const { data } = await checkRes.json();
        if (data.connected) {
          // Already connected, add event directly
          const addRes = await fetch('/api/calendar/google/add', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
            },
            body: JSON.stringify({ eventId: event.id }),
          });

          if (addRes.ok) {
            alert('Event added to your Google Calendar!');
            setIsOpen(false);
            return;
          }
        }
      }

      // Need to authorize - redirect to OAuth
      window.location.href = `/api/calendar/google/auth?eventId=${event.id}`;
    } catch (error) {
      console.error('Failed to add to Google Calendar:', error);
      // Fall back to URL method
      handleGoogleCalendar();
    } finally {
      setIsAddingToGoogle(false);
    }
  };

  return (
    <div className={`relative inline-block ${className}`}>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2"
      >
        <Calendar className="h-4 w-4" />
        Add to Calendar
        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </Button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown */}
          <div className="absolute right-0 mt-2 w-56 rounded-lg bg-white shadow-lg ring-1 ring-black ring-opacity-5 z-50">
            <div className="py-1">
              {GOOGLE_CALENDAR_ENABLED ? (
                <button
                  onClick={handleGoogleOAuth}
                  disabled={isAddingToGoogle}
                  className="flex w-full items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  {isAddingToGoogle ? 'Adding...' : 'Sync to Google Calendar'}
                </button>
              ) : (
                <button
                  onClick={handleGoogleCalendar}
                  className="flex w-full items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  <ExternalLink className="h-3 w-3 opacity-50" />
                  Google Calendar
                </button>
              )}

              <button
                onClick={handleDownloadIcs}
                className="flex w-full items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                <Download className="h-4 w-4 text-gray-500" />
                Download .ics file
              </button>

              <div className="border-t border-gray-100 mx-2 my-1" />

              <p className="px-4 py-2 text-xs text-gray-500">
                .ics works with Apple Calendar, Outlook, and other apps
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
