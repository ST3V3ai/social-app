import { prisma } from '@/lib/db';
import { createRsvpSchema } from '@/lib/validations';
import { sendRsvpConfirmationEmail } from '@/lib/email';
import { formatDateTime } from '@/lib/utils';
import {
  withAuth,
  successResponse,
  validationError,
  notFoundError,
  forbiddenError,
  internalError,
  parseBody,
  AuthenticatedRequest,
} from '@/lib/api';

// POST /api/events/[id]/rsvp - Create or update RSVP
async function postHandler(req: AuthenticatedRequest, context?: { params: Promise<Record<string, string>> }) {
  try {
    const { id: eventId } = await context!.params;

    // Get event
    const event = await prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event || event.deletedAt) {
      return notFoundError('Event not found');
    }

    // Check if event has ended
    if (event.startTime < new Date() && event.status !== 'PUBLISHED') {
      return forbiddenError('Cannot RSVP to a past event');
    }

    // Check if user is blocked by organizer
    const isBlocked = await prisma.block.findFirst({
      where: {
        blockerId: event.organizerId,
        blockedId: req.user.id,
      },
    });

    if (isBlocked) {
      return forbiddenError('Cannot RSVP to this event');
    }

    const body = await parseBody(req);
    if (!body) {
      return validationError([{ field: 'body', message: 'Invalid request body' }]);
    }

    const result = createRsvpSchema.safeParse(body);
    if (!result.success) {
      return validationError(
        result.error.issues.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        }))
      );
    }

    const { status, plusOnes, occurrenceId } = result.data;

    // Validate plus ones
    if (plusOnes > 0 && !event.allowPlusOnes) {
      return validationError([{ field: 'plusOnes', message: 'Plus ones not allowed for this event' }]);
    }

    if (plusOnes > event.maxPlusOnes) {
      return validationError([{ field: 'plusOnes', message: `Maximum ${event.maxPlusOnes} plus ones allowed` }]);
    }

    // Check existing RSVP
    const existingRsvp = await prisma.rsvp.findFirst({
      where: {
        eventId,
        userId: req.user.id,
        occurrenceId: occurrenceId || null,
      },
    });

    // Handle capacity and waitlist
    let finalStatus: 'GOING' | 'MAYBE' | 'NOT_GOING' | 'WAITLIST' = status;
    let waitlistPosition: number | null = null;

    if (status === 'GOING' && event.capacity) {
      const currentCount = await prisma.rsvp.aggregate({
        where: {
          eventId,
          status: 'GOING',
          occurrenceId: occurrenceId || null,
        },
        _sum: { plusOnes: true },
        _count: true,
      });

      const totalAttendees = (currentCount._count || 0) + (currentCount._sum.plusOnes || 0);
      const newTotal = totalAttendees + 1 + plusOnes;

      // Subtract existing RSVP if updating
      const existingCount = existingRsvp?.status === 'GOING' ? 1 + (existingRsvp.plusOnes || 0) : 0;
      const netNewTotal = newTotal - existingCount;

      if (netNewTotal > event.capacity) {
        if (event.enableWaitlist) {
          finalStatus = 'WAITLIST';
          const waitlistCount = await prisma.rsvp.count({
            where: {
              eventId,
              status: 'WAITLIST',
              occurrenceId: occurrenceId || null,
            },
          });
          waitlistPosition = waitlistCount + 1;
        } else {
          return forbiddenError('Event is at capacity');
        }
      }
    }

    // Determine approval status
    const needsApproval = event.requireApproval && finalStatus === 'GOING';
    const approved = !needsApproval;

    let rsvp;
    if (existingRsvp) {
      // Update existing RSVP
      rsvp = await prisma.rsvp.update({
        where: { id: existingRsvp.id },
        data: {
          status: finalStatus,
          plusOnes,
          approved: needsApproval ? false : existingRsvp.approved,
        },
      });
    } else {
      // Create new RSVP
      rsvp = await prisma.rsvp.create({
        data: {
          eventId,
          userId: req.user.id,
          occurrenceId,
          status: finalStatus,
          plusOnes,
          approved,
        },
      });
    }

    // Send confirmation email for Going/Maybe
    if (finalStatus === 'GOING' || finalStatus === 'MAYBE') {
      const user = await prisma.user.findUnique({ where: { id: req.user.id } });
      if (user) {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        await sendRsvpConfirmationEmail(
          user.email,
          event.title,
          formatDateTime(event.startTime),
          `${appUrl}/e/${event.slug}`,
          finalStatus
        );
      }
    }

    return successResponse({
      id: rsvp.id,
      status: rsvp.status,
      plusOnes: rsvp.plusOnes,
      approved: rsvp.approved,
      waitlistPosition,
    });
  } catch (error) {
    console.error('[RSVP] Create error:', error);
    return internalError();
  }
}

// GET /api/events/[id]/rsvp - Get user's RSVP
async function getHandler(req: AuthenticatedRequest, context?: { params: Promise<Record<string, string>> }) {
  try {
    const { id: eventId } = await context!.params;

    const rsvp = await prisma.rsvp.findFirst({
      where: {
        eventId,
        userId: req.user.id,
      },
    });

    if (!rsvp) {
      return successResponse({ rsvp: null });
    }

    // Get waitlist position if on waitlist
    let waitlistPosition = null;
    if (rsvp.status === 'WAITLIST') {
      const position = await prisma.rsvp.count({
        where: {
          eventId,
          status: 'WAITLIST',
          createdAt: { lt: rsvp.createdAt },
        },
      });
      waitlistPosition = position + 1;
    }

    return successResponse({
      rsvp: {
        id: rsvp.id,
        status: rsvp.status,
        plusOnes: rsvp.plusOnes,
        approved: rsvp.approved,
        waitlistPosition,
        checkedIn: rsvp.checkedIn,
        createdAt: rsvp.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('[RSVP] Get error:', error);
    return internalError();
  }
}

// DELETE /api/events/[id]/rsvp - Cancel RSVP
async function deleteHandler(req: AuthenticatedRequest, context?: { params: Promise<Record<string, string>> }) {
  try {
    const { id: eventId } = await context!.params;

    const rsvp = await prisma.rsvp.findFirst({
      where: {
        eventId,
        userId: req.user.id,
      },
    });

    if (!rsvp) {
      return notFoundError('RSVP not found');
    }

    const wasGoing = rsvp.status === 'GOING';

    await prisma.rsvp.delete({
      where: { id: rsvp.id },
    });

    // If was going, promote from waitlist
    if (wasGoing) {
      const event = await prisma.event.findUnique({ where: { id: eventId } });
      if (event?.enableWaitlist) {
        const nextInLine = await prisma.rsvp.findFirst({
          where: {
            eventId,
            status: 'WAITLIST',
          },
          orderBy: { createdAt: 'asc' },
        });

        if (nextInLine) {
          await prisma.rsvp.update({
            where: { id: nextInLine.id },
            data: { status: 'GOING' },
          });

          // TODO: Send notification to promoted user
        }
      }
    }

    return successResponse({ message: 'RSVP cancelled' });
  } catch (error) {
    console.error('[RSVP] Delete error:', error);
    return internalError();
  }
}

export const POST = withAuth(postHandler);
export const GET = withAuth(getHandler);
export const DELETE = withAuth(deleteHandler);
