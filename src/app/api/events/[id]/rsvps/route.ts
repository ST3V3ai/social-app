import { prisma } from '@/lib/db';
import {
  withAuth,
  withOptionalAuth,
  successResponse,
  notFoundError,
  forbiddenError,
  internalError,
  AuthenticatedRequest,
} from '@/lib/api';
import { NextRequest } from 'next/server';

// Check if a string looks like a UUID
function isUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

// GET /api/events/[id]/rsvps - List all RSVPs for an event
async function getHandler(req: NextRequest, context?: { params: Promise<Record<string, string>> }) {
  try {
    const { id: idOrSlug } = await context!.params;
    const authUser = (req as AuthenticatedRequest).user;

    const event = await prisma.event.findFirst({
      where: isUUID(idOrSlug) ? { id: idOrSlug } : { slug: idOrSlug },
      include: { cohosts: true },
    });

    if (!event || event.deletedAt) {
      return notFoundError('Event not found');
    }

    const eventId = event.id;

    // Check if user can view guest list
    const isOrganizer = authUser?.id === event.organizerId;
    const isCohost = event.cohosts.some((c: { userId: string }) => c.userId === authUser?.id);
    const canManage = isOrganizer || isCohost;

    // Check if guest list is visible
    if (!event.guestListVisible && !canManage) {
      return forbiddenError('Guest list is not visible');
    }

    // Get RSVPs
    const rsvps = await prisma.rsvp.findMany({
      where: { eventId },
      include: {
        user: {
          include: {
            profile: {
              select: {
                displayName: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    interface FormattedRsvp {
      id: string;
      status: string;
      plusOnes: number;
      approved: boolean;
      checkedIn?: boolean;
      createdAt: string;
      user: {
        id: string;
        displayName: string;
        avatarUrl: string | null | undefined;
      };
    }

    const formattedRsvps: FormattedRsvp[] = rsvps.map((rsvp: typeof rsvps[0]) => ({
      id: rsvp.id,
      status: rsvp.status,
      plusOnes: rsvp.plusOnes,
      approved: rsvp.approved,
      checkedIn: canManage ? rsvp.checkedIn : undefined,
      createdAt: rsvp.createdAt.toISOString(),
      user: {
        id: rsvp.user.id,
        displayName: rsvp.user.profile?.displayName || 'Anonymous',
        avatarUrl: rsvp.user.profile?.avatarUrl,
      },
    }));

    // Group by status
    const grouped = {
      going: formattedRsvps.filter((r: FormattedRsvp) => r.status === 'GOING'),
      maybe: formattedRsvps.filter((r: FormattedRsvp) => r.status === 'MAYBE'),
      notGoing: formattedRsvps.filter((r: FormattedRsvp) => r.status === 'NOT_GOING'),
      waitlist: formattedRsvps.filter((r: FormattedRsvp) => r.status === 'WAITLIST'),
    };

    return successResponse({
      rsvps: grouped,
      counts: {
        going: grouped.going.length,
        maybe: grouped.maybe.length,
        notGoing: grouped.notGoing.length,
        waitlist: grouped.waitlist.length,
      },
    });
  } catch (error) {
    console.error('[RSVPs] List error:', error);
    return internalError();
  }
}

export const GET = withOptionalAuth(getHandler);
