import { prisma } from '@/lib/db';
import {
  withOptionalAuth,
  notFoundError,
  forbiddenError,
  internalError,
  AuthenticatedRequest,
} from '@/lib/api';
import { NextRequest, NextResponse } from 'next/server';
import { generateIcsFile, type CalendarEvent } from '@/lib/calendar';

// GET /api/events/[id]/ics - Get event as ICS file
async function getHandler(req: NextRequest, context?: { params: Promise<Record<string, string>> }) {
  try {
    const { id } = await context!.params;
    const authUser = (req as AuthenticatedRequest).user;

    const event = await prisma.event.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
        deletedAt: null,
      },
      include: {
        organizer: {
          include: {
            profile: {
              select: {
                displayName: true,
              },
            },
          },
        },
        venue: true,
      },
    });

    if (!event) {
      return notFoundError('Event not found');
    }

    // Check access for private/unlisted events
    if (event.privacy === 'PRIVATE') {
      if (!authUser) {
        return forbiddenError('Event is private');
      }
      // Check if user is organizer, co-host, or has RSVP
      const isOrganizer = event.organizerId === authUser.id;
      const isCoHost = await prisma.eventCoHost.findFirst({
        where: { eventId: event.id, userId: authUser.id },
      });
      const hasRsvp = await prisma.rsvp.findFirst({
        where: { eventId: event.id, userId: authUser.id },
      });
      if (!isOrganizer && !isCoHost && !hasRsvp) {
        return forbiddenError('Event is private');
      }
    }

    // Build location string
    let location = '';
    if (event.venue) {
      const parts = [
        event.venue.name,
        event.venue.address,
        event.venue.city,
        event.venue.country,
      ].filter(Boolean);
      location = parts.join(', ');
    } else if (event.isOnline) {
      location = event.onlineUrl || 'Online Event';
    } else if (event.locationName) {
      location = event.locationName;
    } else if (event.locationAddress) {
      location = event.locationAddress;
    }

    // Build calendar event data
    const organizerName = event.organizer.profile?.displayName || 'Gather User';
    const eventUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://gather.app'}/e/${event.slug}`;
    
    // Calculate sequence number based on how many times the event has been updated
    // This helps calendar apps understand when an event has changed
    const createdTime = event.createdAt.getTime();
    const updatedTime = event.updatedAt.getTime();
    const sequence = Math.floor((updatedTime - createdTime) / 1000); // Simple sequence based on time diff

    // Determine event status
    let status: 'CONFIRMED' | 'TENTATIVE' | 'CANCELLED' = 'CONFIRMED';
    if (event.status === 'CANCELLED') {
      status = 'CANCELLED';
    } else if (event.status === 'DRAFT') {
      status = 'TENTATIVE';
    }

    const calendarEvent: CalendarEvent = {
      id: event.id,
      slug: event.slug,
      title: event.title,
      description: event.description || undefined,
      startTime: event.startTime,
      endTime: event.endTime || undefined,
      timezone: event.timezone,
      location,
      url: eventUrl,
      organizerName,
      organizerEmail: 'noreply@gather.app',
      status,
      sequence,
      lastModified: event.updatedAt,
    };

    // Generate ICS file using the utility function
    const icsContent = generateIcsFile(calendarEvent);

    return new NextResponse(icsContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `attachment; filename="${event.slug}.ics"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    console.error('[Events] ICS error:', error);
    return internalError();
  }
}

export const GET = withOptionalAuth(getHandler);
