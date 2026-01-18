import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest, successResponse, errorResponse, internalError } from '@/lib/api';
import { prisma } from '@/lib/db';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

interface GoogleTokenResponse {
  access_token: string;
  expires_in: number;
}

// Refresh access token if expired
async function refreshAccessToken(calendarToken: {
  id: string;
  refreshToken: string | null;
  expiresAt: Date;
  accessToken: string;
}): Promise<string | null> {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) return null;

  // Check if token is still valid (with 5 min buffer)
  if (calendarToken.expiresAt > new Date(Date.now() + 5 * 60 * 1000)) {
    return calendarToken.accessToken;
  }

  if (!calendarToken.refreshToken) {
    return null;
  }

  try {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        refresh_token: calendarToken.refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!res.ok) {
      console.error('[Google Calendar] Token refresh failed');
      return null;
    }

    const tokens: GoogleTokenResponse = await res.json();

    // Update stored token
    await prisma.calendarToken.update({
      where: { id: calendarToken.id },
      data: {
        accessToken: tokens.access_token,
        expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
      },
    });

    return tokens.access_token;
  } catch (error) {
    console.error('[Google Calendar] Token refresh error:', error);
    return null;
  }
}

// POST /api/calendar/google/add - Add event to Google Calendar
async function postHandler(req: AuthenticatedRequest) {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    return errorResponse(
      'GOOGLE_NOT_CONFIGURED',
      'Google Calendar integration is not configured',
      503
    );
  }

  try {
    const body = await req.json();
    const { eventId } = body;

    if (!eventId) {
      return errorResponse('MISSING_EVENT_ID', 'Event ID is required', 400);
    }

    // Get user's Google Calendar token
    const calendarToken = await prisma.calendarToken.findUnique({
      where: {
        userId_provider: {
          userId: req.user.id,
          provider: 'GOOGLE',
        },
      },
    });

    if (!calendarToken) {
      return errorResponse(
        'NOT_CONNECTED',
        'Google Calendar not connected. Please authorize first.',
        401
      );
    }

    // Refresh token if needed
    const accessToken = await refreshAccessToken(calendarToken);
    if (!accessToken) {
      return errorResponse(
        'TOKEN_EXPIRED',
        'Google Calendar authorization expired. Please reconnect.',
        401
      );
    }

    // Get event details
    const event = await prisma.event.findFirst({
      where: {
        OR: [{ id: eventId }, { slug: eventId }],
        deletedAt: null,
      },
    });

    if (!event) {
      return errorResponse('EVENT_NOT_FOUND', 'Event not found', 404);
    }

    // Build Google Calendar event
    const location = event.isOnline
      ? event.onlineUrl || 'Online Event'
      : [event.locationName, event.locationAddress].filter(Boolean).join(', ');

    const calendarEvent = {
      summary: event.title,
      description: event.description || '',
      location,
      start: {
        dateTime: event.startTime.toISOString(),
        timeZone: event.timezone,
      },
      end: {
        dateTime: (event.endTime || new Date(event.startTime.getTime() + 60 * 60 * 1000)).toISOString(),
        timeZone: event.timezone,
      },
      source: {
        title: 'Gather',
        url: `${process.env.NEXT_PUBLIC_APP_URL}/e/${event.slug}`,
      },
    };

    // Add to Google Calendar
    const gcalRes = await fetch(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(calendarEvent),
      }
    );

    if (!gcalRes.ok) {
      const errorData = await gcalRes.text();
      console.error('[Google Calendar] Add event failed:', errorData);
      return errorResponse('GOOGLE_API_ERROR', 'Failed to add event to Google Calendar', 500);
    }

    const gcalEvent = await gcalRes.json();

    return successResponse({
      message: 'Event added to Google Calendar',
      googleEventId: gcalEvent.id,
      googleEventUrl: gcalEvent.htmlLink,
    });
  } catch (error) {
    console.error('[Google Calendar] Add event error:', error);
    return internalError();
  }
}

// GET handler for auto-redirect after OAuth
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const eventId = url.searchParams.get('eventId');
  const autoRedirect = url.searchParams.get('autoRedirect');

  if (!autoRedirect || !eventId) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/`);
  }

  // Get event slug for redirect
  const event = await prisma.event.findFirst({
    where: {
      OR: [{ id: eventId }, { slug: eventId }],
      deletedAt: null,
    },
    select: { slug: true },
  });

  if (!event) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/?error=event_not_found`);
  }

  // For auto-redirect, we'll redirect to the event page with a success message
  // The actual calendar add will need to be done client-side after auth
  return NextResponse.redirect(
    `${process.env.NEXT_PUBLIC_APP_URL}/e/${event.slug}?calendarAdded=true`
  );
}

export const POST = withAuth(postHandler);
