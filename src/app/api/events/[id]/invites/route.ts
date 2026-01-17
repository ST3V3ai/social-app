import { prisma } from '@/lib/db';
import { sendInvitesSchema } from '@/lib/validations';
import { sendInviteEmail } from '@/lib/email';
import { generateRandomToken, hashToken } from '@/lib/auth';
import { formatDateTime } from '@/lib/utils';
import {
  withAuth,
  successResponse,
  validationError,
  notFoundError,
  forbiddenError,
  internalError,
  parseBody,
  checkRateLimit,
  rateLimitError,
  AuthenticatedRequest,
} from '@/lib/api';

// POST /api/events/[id]/invites - Send invites
async function postHandler(req: AuthenticatedRequest, context?: { params: Promise<Record<string, string>> }) {
  try {
    const { id: eventId } = await context!.params;

    // Get event and check permission
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: { cohosts: true },
    });

    if (!event || event.deletedAt) {
      return notFoundError('Event not found');
    }

    const isOrganizer = event.organizerId === req.user.id;
    const isCohost = event.cohosts.some((c: { userId: string }) => c.userId === req.user.id);

    if (!isOrganizer && !isCohost) {
      return forbiddenError('You do not have permission to send invites');
    }

    // Rate limit: 100 invites per hour
    const rateLimitResult = await checkRateLimit(`invites:${req.user.id}`, {
      requests: 100,
      window: 3600,
    });

    if (!rateLimitResult.allowed) {
      return rateLimitError(rateLimitResult.resetIn);
    }

    const body = await parseBody(req);
    if (!body) {
      return validationError([{ field: 'body', message: 'Invalid request body' }]);
    }

    const result = sendInvitesSchema.safeParse(body);
    if (!result.success) {
      return validationError(
        result.error.issues.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        }))
      );
    }

    const { recipients, message, type } = result.data;

    // Get organizer profile for invite email
    const organizer = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { profile: true },
    });
    const inviterName = organizer?.profile?.displayName || 'Someone';

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const eventDate = formatDateTime(event.startTime);

    const results = {
      sent: 0,
      failed: 0,
      skipped: 0,
      invites: [] as { email: string; status: string }[],
    };

    for (const recipient of recipients) {
      const email = recipient.email.toLowerCase();

      // Check if already invited
      const existingInvite = await prisma.invite.findFirst({
        where: {
          eventId,
          email,
          status: { in: ['PENDING', 'SENT'] },
        },
      });

      if (existingInvite) {
        results.skipped++;
        results.invites.push({ email, status: 'skipped' });
        continue;
      }

      // Check if already RSVP'd
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        const existingRsvp = await prisma.rsvp.findFirst({
          where: { eventId, userId: existingUser.id },
        });

        if (existingRsvp) {
          results.skipped++;
          results.invites.push({ email, status: 'already_rsvp' });
          continue;
        }
      }

      try {
        // Create invite
        const token = generateRandomToken();
        const invite = await prisma.invite.create({
          data: {
            eventId,
            invitedBy: req.user.id,
            token,
            type,
            email,
            userId: existingUser?.id,
            message,
            status: 'PENDING',
          },
        });

        // Send email
        const inviteUrl = `${appUrl}/invite/${token}`;
        const emailSent = await sendInviteEmail(
          email,
          inviterName,
          event.title,
          eventDate,
          inviteUrl,
          message || undefined
        );

        // Update invite status
        await prisma.invite.update({
          where: { id: invite.id },
          data: {
            status: emailSent ? 'SENT' : 'PENDING',
            sentAt: emailSent ? new Date() : null,
          },
        });

        if (emailSent) {
          results.sent++;
          results.invites.push({ email, status: 'sent' });
        } else {
          results.failed++;
          results.invites.push({ email, status: 'failed' });
        }
      } catch (error) {
        console.error(`[Invites] Failed to create invite for ${email}:`, error);
        results.failed++;
        results.invites.push({ email, status: 'error' });
      }
    }

    return successResponse(results);
  } catch (error) {
    console.error('[Invites] Send error:', error);
    return internalError();
  }
}

// GET /api/events/[id]/invites - List invites
async function getHandler(req: AuthenticatedRequest, context?: { params: Promise<Record<string, string>> }) {
  try {
    const { id: eventId } = await context!.params;

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: { cohosts: true },
    });

    if (!event || event.deletedAt) {
      return notFoundError('Event not found');
    }

    const isOrganizer = event.organizerId === req.user.id;
    const isCohost = event.cohosts.some((c: { userId: string }) => c.userId === req.user.id);

    if (!isOrganizer && !isCohost) {
      return forbiddenError('You do not have permission to view invites');
    }

    const invites = await prisma.invite.findMany({
      where: { eventId },
      orderBy: { createdAt: 'desc' },
    });

    return successResponse({
      invites: invites.map((invite: typeof invites[0]) => ({
        id: invite.id,
        email: invite.email,
        status: invite.status,
        type: invite.type,
        sentAt: invite.sentAt?.toISOString(),
        openedAt: invite.openedAt?.toISOString(),
        respondedAt: invite.respondedAt?.toISOString(),
        createdAt: invite.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error('[Invites] List error:', error);
    return internalError();
  }
}

export const POST = withAuth(postHandler);
export const GET = withAuth(getHandler);
