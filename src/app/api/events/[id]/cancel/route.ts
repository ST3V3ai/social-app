import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { withAuth, AuthenticatedRequest } from '@/lib/api';
import { successResponse, notFoundError, forbiddenError, internalError } from '@/lib/api';
import { sendEventCancelledEmail } from '@/lib/email';
import { formatDateTime } from '@/lib/utils';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// Check if a string looks like a UUID
function isUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

// POST /api/events/[id]/cancel - Cancel an event
async function postHandler(req: AuthenticatedRequest, context?: { params: Promise<Record<string, string>> }) {
  try {
    const { id: idOrSlug } = await context!.params;

    // Look up event by ID or slug
    const event = await prisma.event.findFirst({
      where: isUUID(idOrSlug) ? { id: idOrSlug } : { slug: idOrSlug },
      include: {
        organizer: {
          include: {
            profile: { select: { displayName: true } },
          },
        },
        cohosts: true,
      },
    });

    if (!event || event.deletedAt) {
      return notFoundError('Event not found');
    }

    // Check if user can manage this event
    const isOrganizer = event.organizerId === req.user.id;
    const isCohost = event.cohosts.some((c) => c.userId === req.user.id);
    const isAdmin = req.user.role === 'ADMIN';

    if (!isOrganizer && !isCohost && !isAdmin) {
      return forbiddenError('You do not have permission to cancel this event');
    }

    if (event.status === 'CANCELLED') {
      return NextResponse.json(
        { success: false, error: { message: 'Event is already cancelled' } },
        { status: 400 }
      );
    }

    // Get attendees before cancelling (for notification)
    const rsvps = await prisma.rsvp.findMany({
      where: {
        eventId: event.id,
        status: { in: ['GOING', 'MAYBE'] },
      },
      include: {
        user: { select: { email: true } },
      },
    });

    // Update event to cancelled
    const updated = await prisma.event.update({
      where: { id: event.id },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
      },
    });

    // Notify attendees of cancellation
    if (rsvps.length > 0) {
      const organizerName = event.organizer.profile?.displayName || 'The organizer';
      const eventDate = formatDateTime(event.startTime);

      // Create notifications for attendees
      await prisma.notification.createMany({
        data: rsvps.map((rsvp) => ({
          userId: rsvp.userId,
          type: 'EVENT_CANCELLED',
          title: 'Event Cancelled',
          body: `"${event.title}" has been cancelled`,
          entityType: 'Event',
          entityId: event.id,
          channel: 'IN_APP',
        })),
      });

      // Send emails in background
      for (const rsvp of rsvps) {
        sendEventCancelledEmail(rsvp.user.email, event.title, eventDate, organizerName).catch(err => {
          console.error(`Failed to send cancellation email to ${rsvp.user.email}:`, err);
        });
      }
    }

    return successResponse({
      id: updated.id,
      slug: updated.slug,
      title: updated.title,
      status: updated.status,
      cancelledAt: updated.cancelledAt?.toISOString(),
    });
  } catch (error) {
    console.error('[Events] Cancel error:', error);
    return internalError();
  }
}

export const POST = withAuth(postHandler);
