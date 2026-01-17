import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { updateEventSchema } from '@/lib/validations';
import { sendEventUpdatedEmail, sendEventCancelledEmail } from '@/lib/email';
import { formatDateTime } from '@/lib/utils';
import {
  withAuth,
  withOptionalAuth,
  successResponse,
  validationError,
  notFoundError,
  forbiddenError,
  internalError,
  parseBody,
  AuthenticatedRequest,
} from '@/lib/api';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// Check if user can manage event
async function canManageEvent(idOrSlug: string, userId: string): Promise<{ allowed: boolean; eventId?: string }> {
  const event = await prisma.event.findFirst({
    where: isUUID(idOrSlug) ? { id: idOrSlug } : { slug: idOrSlug },
    include: {
      cohosts: true,
    },
  });

  if (!event) return { allowed: false };
  if (event.organizerId === userId) return { allowed: true, eventId: event.id };
  if (event.cohosts.some((c: { userId: string }) => c.userId === userId)) return { allowed: true, eventId: event.id };

  return { allowed: false };
}

// Check if a string looks like a UUID
function isUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

// GET /api/events/[id] - Get event by ID or slug
async function getHandler(req: NextRequest, context?: { params: Promise<Record<string, string>> }) {

  try {
    const { id } = await context!.params;
    const authUser = (req as AuthenticatedRequest).user;

    // Support lookup by either UUID or slug
    const event = await prisma.event.findFirst({
      where: isUUID(id) ? { id } : { slug: id },
      include: {
        organizer: {
          include: {
            profile: {
              select: {
                displayName: true,
                username: true,
                avatarUrl: true,
              },
            },
          },
        },
        cohosts: {
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
        },
        venue: true,
        _count: {
          select: {
            rsvps: true,
          },
        },
      },
    });

    if (!event || event.deletedAt) {
      return notFoundError('Event not found');
    }

    // Check access
    const isOrganizer = authUser?.id === event.organizerId;
    const isCohost = event.cohosts.some((c: { userId: string }) => c.userId === authUser?.id);
    const canManage = isOrganizer || isCohost;

    // Private events require invite or being organizer
    if (event.privacy === 'PRIVATE' && !canManage) {
      // Check if user has an invite or RSVP
      if (authUser) {
        const hasAccess = await prisma.rsvp.findFirst({
          where: { eventId: event.id, userId: authUser.id },
        });
        if (!hasAccess) {
          const hasInvite = await prisma.invite.findFirst({
            where: { eventId: event.id, userId: authUser.id },
          });
          if (!hasInvite) {
            return notFoundError('Event not found');
          }
        }
      } else {
        return notFoundError('Event not found');
      }
    }

    // Increment view count
    await prisma.event.update({
      where: { id: event.id },
      data: { viewCount: { increment: 1 } },
    });

    // Get RSVP counts
    const rsvpCounts = await prisma.rsvp.groupBy({
      by: ['status'],
      where: { eventId: event.id },
      _count: true,
    });

    type RsvpCount = { status: string; _count: number };
    const counts = {
      going: rsvpCounts.find((r: RsvpCount) => r.status === 'GOING')?._count || 0,
      maybe: rsvpCounts.find((r: RsvpCount) => r.status === 'MAYBE')?._count || 0,
      notGoing: rsvpCounts.find((r: RsvpCount) => r.status === 'NOT_GOING')?._count || 0,
      waitlist: rsvpCounts.find((r: RsvpCount) => r.status === 'WAITLIST')?._count || 0,
    };

    // Get user's RSVP if authenticated
    let userRsvp = null;
    if (authUser) {
      const rsvp = await prisma.rsvp.findFirst({
        where: { eventId: event.id, userId: authUser.id },
      });
      if (rsvp) {
        userRsvp = {
          id: rsvp.id,
          status: rsvp.status,
          plusOnes: rsvp.plusOnes,
          approved: rsvp.approved,
        };
      }
    }

    // Hide exact location if needed
    const showLocation = !event.locationHidden || canManage || userRsvp?.approved;

    return successResponse({
      id: event.id,
      slug: event.slug,
      title: event.title,
      description: event.description,
      coverImageUrl: event.coverImageUrl,
      startTime: event.startTime.toISOString(),
      endTime: event.endTime?.toISOString(),
      timezone: event.timezone,
      isOnline: event.isOnline,
      onlineUrl: canManage || userRsvp?.approved ? event.onlineUrl : null,
      location: showLocation
        ? {
            name: event.locationName,
            address: event.locationAddress,
            lat: event.locationLat ? Number(event.locationLat) : null,
            lng: event.locationLng ? Number(event.locationLng) : null,
          }
        : {
            name: event.locationName,
            address: null, // Hidden
            lat: null,
            lng: null,
          },
      locationHidden: event.locationHidden,
      privacy: event.privacy,
      status: event.status,
      requireApproval: event.requireApproval,
      allowPlusOnes: event.allowPlusOnes,
      maxPlusOnes: event.maxPlusOnes,
      capacity: event.capacity,
      enableWaitlist: event.enableWaitlist,
      enableComments: event.enableComments,
      guestListVisible: event.guestListVisible,
      category: event.category,
      viewCount: event.viewCount,
      rsvpCounts: counts,
      userRsvp,
      organizer: {
        id: event.organizer.id,
        displayName: event.organizer.profile?.displayName || 'Anonymous',
        username: event.organizer.profile?.username,
        avatarUrl: event.organizer.profile?.avatarUrl,
      },
      cohosts: event.cohosts.map((c: typeof event.cohosts[0]) => ({
        id: c.user.id,
        displayName: c.user.profile?.displayName || 'Anonymous',
        avatarUrl: c.user.profile?.avatarUrl,
      })),
      canManage,
      createdAt: event.createdAt.toISOString(),
      publishedAt: event.publishedAt?.toISOString(),
    });
  } catch (error) {
    console.error('[Events] Get error:', error);
    return internalError();
  }
}

// PATCH /api/events/[id] - Update event
async function patchHandler(req: AuthenticatedRequest, context?: { params: Promise<Record<string, string>> }) {
  try {
    const { id: idOrSlug } = await context!.params;

    // Check if user can manage this event
    const manageCheck = await canManageEvent(idOrSlug, req.user.id);
    if (!manageCheck.allowed || !manageCheck.eventId) {
      return forbiddenError('You do not have permission to edit this event');
    }
    const eventId = manageCheck.eventId;

    // Get current event to compare for changes
    const currentEvent = await prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!currentEvent) {
      return notFoundError('Event not found');
    }

    const body = await parseBody(req);
    if (!body) {
      return validationError([{ field: 'body', message: 'Invalid request body' }]);
    }

    const result = updateEventSchema.safeParse(body);
    if (!result.success) {
      return validationError(
        result.error.issues.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        }))
      );
    }

    const data = result.data;

    const updateData: Record<string, unknown> = {};

    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.startTime !== undefined) updateData.startTime = new Date(data.startTime);
    if (data.endTime !== undefined) updateData.endTime = data.endTime ? new Date(data.endTime) : null;
    if (data.timezone !== undefined) updateData.timezone = data.timezone;
    if (data.isOnline !== undefined) updateData.isOnline = data.isOnline;
    if (data.onlineUrl !== undefined) updateData.onlineUrl = data.onlineUrl;
    if (data.location !== undefined) {
      updateData.locationName = data.location?.name;
      updateData.locationAddress = data.location?.address;
      updateData.locationLat = data.location?.lat;
      updateData.locationLng = data.location?.lng;
    }
    if (data.privacy !== undefined) updateData.privacy = data.privacy;
    if (data.requireApproval !== undefined) updateData.requireApproval = data.requireApproval;
    if (data.allowPlusOnes !== undefined) updateData.allowPlusOnes = data.allowPlusOnes;
    if (data.maxPlusOnes !== undefined) updateData.maxPlusOnes = data.maxPlusOnes;
    if (data.capacity !== undefined) updateData.capacity = data.capacity;
    if (data.enableWaitlist !== undefined) updateData.enableWaitlist = data.enableWaitlist;
    if (data.enableComments !== undefined) updateData.enableComments = data.enableComments;
    if (data.guestListVisible !== undefined) updateData.guestListVisible = data.guestListVisible;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.coverImageUrl !== undefined) updateData.coverImageUrl = data.coverImageUrl;

    const event = await prisma.event.update({
      where: { id: eventId },
      data: updateData,
    });

    // Check for important changes (time, location) and notify attendees
    if (currentEvent.status === 'PUBLISHED') {
      const changes: { field: string; oldValue: string; newValue: string }[] = [];

      if (data.startTime && new Date(data.startTime).getTime() !== currentEvent.startTime.getTime()) {
        changes.push({
          field: 'Date & Time',
          oldValue: formatDateTime(currentEvent.startTime),
          newValue: formatDateTime(new Date(data.startTime)),
        });
      }

      if (data.location?.address && data.location.address !== currentEvent.locationAddress) {
        changes.push({
          field: 'Location',
          oldValue: currentEvent.locationAddress || 'Not specified',
          newValue: data.location.address,
        });
      }

      if (data.isOnline !== undefined && data.isOnline !== currentEvent.isOnline) {
        changes.push({
          field: 'Event Type',
          oldValue: currentEvent.isOnline ? 'Online' : 'In-person',
          newValue: data.isOnline ? 'Online' : 'In-person',
        });
      }

      // If there are important changes, notify attendees
      if (changes.length > 0) {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        const eventUrl = `${appUrl}/e/${event.slug}`;

        // Get all attendees with GOING or MAYBE status
        const rsvps = await prisma.rsvp.findMany({
          where: {
            eventId,
            status: { in: ['GOING', 'MAYBE'] },
          },
          include: {
            user: { select: { email: true } },
          },
        });

        // Send emails in background (don't await)
        for (const rsvp of rsvps) {
          sendEventUpdatedEmail(rsvp.user.email, event.title, eventUrl, changes).catch(err => {
            console.error(`Failed to send update email to ${rsvp.user.email}:`, err);
          });
        }
      }
    }

    return successResponse({
      id: event.id,
      slug: event.slug,
      title: event.title,
      status: event.status,
    });
  } catch (error) {
    console.error('[Events] Update error:', error);
    return internalError();
  }
}

// DELETE /api/events/[id] - Delete event (soft delete)
async function deleteHandler(req: AuthenticatedRequest, context?: { params: Promise<Record<string, string>> }) {
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
      },
    });

    if (!event || event.deletedAt) {
      return notFoundError('Event not found');
    }

    if (event.organizerId !== req.user.id && req.user.role !== 'ADMIN') {
      return forbiddenError('Only the organizer can delete this event');
    }

    // Get attendees before deleting (for notification)
    const rsvps = await prisma.rsvp.findMany({
      where: {
        eventId: event.id,
        status: { in: ['GOING', 'MAYBE'] },
      },
      include: {
        user: { select: { email: true } },
      },
    });

    await prisma.event.update({
      where: { id: event.id },
      data: { deletedAt: new Date() },
    });

    // Notify attendees of cancellation
    if (event.status === 'PUBLISHED' && rsvps.length > 0) {
      const organizerName = event.organizer.profile?.displayName || 'The organizer';
      const eventDate = formatDateTime(event.startTime);

      for (const rsvp of rsvps) {
        sendEventCancelledEmail(rsvp.user.email, event.title, eventDate, organizerName).catch(err => {
          console.error(`Failed to send cancellation email to ${rsvp.user.email}:`, err);
        });
      }
    }

    return successResponse({ message: 'Event deleted' });
  } catch (error) {
    console.error('[Events] Delete error:', error);
    return internalError();
  }
}

export const GET = withOptionalAuth(getHandler);
export const PATCH = withAuth(patchHandler);
export const DELETE = withAuth(deleteHandler);
