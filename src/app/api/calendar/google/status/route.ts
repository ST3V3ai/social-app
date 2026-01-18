import { withAuth, AuthenticatedRequest, successResponse, errorResponse } from '@/lib/api';
import { prisma } from '@/lib/db';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

// GET /api/calendar/google/status - Check if user has connected Google Calendar
async function getHandler(req: AuthenticatedRequest) {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    return successResponse({
      enabled: false,
      connected: false,
      message: 'Google Calendar integration is not configured',
    });
  }

  const calendarToken = await prisma.calendarToken.findUnique({
    where: {
      userId_provider: {
        userId: req.user.id,
        provider: 'GOOGLE',
      },
    },
    select: {
      expiresAt: true,
      scope: true,
      createdAt: true,
    },
  });

  if (!calendarToken) {
    return successResponse({
      enabled: true,
      connected: false,
    });
  }

  return successResponse({
    enabled: true,
    connected: true,
    expiresAt: calendarToken.expiresAt.toISOString(),
    connectedAt: calendarToken.createdAt.toISOString(),
  });
}

// DELETE /api/calendar/google/status - Disconnect Google Calendar
async function deleteHandler(req: AuthenticatedRequest) {
  await prisma.calendarToken.deleteMany({
    where: {
      userId: req.user.id,
      provider: 'GOOGLE',
    },
  });

  return successResponse({
    message: 'Google Calendar disconnected',
  });
}

export const GET = withAuth(getHandler);
export const DELETE = withAuth(deleteHandler);
