import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest, successResponse, errorResponse, internalError } from '@/lib/api';
import { prisma } from '@/lib/db';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI = process.env.NEXT_PUBLIC_APP_URL + '/api/calendar/google/callback';

// GET /api/calendar/google/auth - Start OAuth flow
async function getHandler(req: AuthenticatedRequest) {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    return errorResponse(
      'GOOGLE_NOT_CONFIGURED',
      'Google Calendar integration is not configured',
      503
    );
  }

  // Get optional eventId to redirect back after auth
  const url = new URL(req.url);
  const eventId = url.searchParams.get('eventId');

  // Build OAuth URL
  const state = JSON.stringify({
    userId: req.user.id,
    eventId: eventId || null,
    timestamp: Date.now(),
  });

  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.set('client_id', GOOGLE_CLIENT_ID);
  authUrl.searchParams.set('redirect_uri', GOOGLE_REDIRECT_URI);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', 'https://www.googleapis.com/auth/calendar.events');
  authUrl.searchParams.set('access_type', 'offline');
  authUrl.searchParams.set('prompt', 'consent');
  authUrl.searchParams.set('state', Buffer.from(state).toString('base64'));

  return NextResponse.redirect(authUrl.toString());
}

export const GET = withAuth(getHandler);
