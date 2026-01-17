import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { withAuth, AuthenticatedRequest } from '@/lib/api';
import { successResponse, notFoundError, forbiddenError, validationError, internalError } from '@/lib/api';
import { sendEventAnnouncementEmail } from '@/lib/email';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// Check if a string looks like a UUID
function isUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

// GET /api/events/[id]/announcements - List event announcements
async function getHandler(req: NextRequest, context?: { params: Promise<Record<string, string>> }) {
  try {
    const { id: idOrSlug } = await context!.params;

    const event = await prisma.event.findFirst({
      where: isUUID(idOrSlug) ? { id: idOrSlug } : { slug: idOrSlug },
      select: { id: true },
    });

    if (!event) {
      return notFoundError('Event not found');
    }

    const announcements = await prisma.eventAnnouncement.findMany({
      where: { eventId: event.id },
      orderBy: { createdAt: 'desc' },
      include: {
        author: {
          select: {
            id: true,
            profile: {
              select: {
                displayName: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });

    return successResponse(announcements);
  } catch (error) {
    console.error('[Announcements] Get error:', error);
    return internalError();
  }
}

// POST /api/events/[id]/announcements - Create announcement
async function postHandler(req: AuthenticatedRequest, context?: { params: Promise<Record<string, string>> }) {
  try {
    const { id: idOrSlug } = await context!.params;

    const event = await prisma.event.findFirst({
      where: isUUID(idOrSlug) ? { id: idOrSlug } : { slug: idOrSlug },
      include: {
        cohosts: true,
        organizer: {
          include: {
            profile: { select: { displayName: true } },
          },
        },
      },
    });

    if (!event) {
      return notFoundError('Event not found');
    }

    // Check permission
    const isOrganizer = event.organizerId === req.user.id;
    const isCohost = event.cohosts.some((c) => c.userId === req.user.id);
    if (!isOrganizer && !isCohost) {
      return forbiddenError('You do not have permission to make announcements');
    }

    const body = await req.json();
    const { title, message, notifyAttendees = true } = body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return validationError([{ field: 'message', message: 'Message is required' }]);
    }

    if (message.length > 5000) {
      return validationError([{ field: 'message', message: 'Message must be less than 5000 characters' }]);
    }

    const announcement = await prisma.eventAnnouncement.create({
      data: {
        eventId: event.id,
        authorId: req.user.id,
        title: title?.trim() || null,
        message: message.trim(),
      },
      include: {
        author: {
          select: {
            id: true,
            displayName: true,
            profile: {
              select: { avatarUrl: true },
            },
          },
        },
      },
    });

    // Notify attendees
    if (notifyAttendees) {
      const rsvps = await prisma.rsvp.findMany({
        where: {
          eventId: event.id,
          status: { in: ['GOING', 'MAYBE'] },
        },
        include: {
          user: { select: { id: true, email: true } },
        },
      });

      // Create in-app notifications
      if (rsvps.length > 0) {
        await prisma.notification.createMany({
          data: rsvps.map((rsvp) => ({
            userId: rsvp.user.id,
            type: 'EVENT_ANNOUNCEMENT',
            title: title || 'New Announcement',
            body: message.substring(0, 200) + (message.length > 200 ? '...' : ''),
            entityType: 'Event',
            entityId: event.id,
            channel: 'IN_APP',
          })),
        });

        // Send emails in background
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        const eventUrl = `${appUrl}/e/${event.slug}`;
        const organizerName = event.organizer.profile?.displayName || 'The organizer';

        for (const rsvp of rsvps) {
          sendEventAnnouncementEmail(
            rsvp.user.email,
            event.title,
            eventUrl,
            title || 'Announcement',
            message,
            organizerName
          ).catch((err) => {
            console.error(`Failed to send announcement email to ${rsvp.user.email}:`, err);
          });
        }
      }
    }

    return NextResponse.json(successResponse(announcement), { status: 201 });
  } catch (error) {
    console.error('[Announcements] Create error:', error);
    return internalError();
  }
}

export const GET = getHandler;
export const POST = withAuth(postHandler);
