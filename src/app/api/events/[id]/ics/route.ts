import { prisma } from '@/lib/db';
import {
  withOptionalAuth,
  notFoundError,
  forbiddenError,
  internalError,
  AuthenticatedRequest,
} from '@/lib/api';
import { NextRequest, NextResponse } from 'next/server';

// Helper to escape ICS text
function escapeIcsText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

// Helper to format date for ICS
function formatIcsDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

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
    } else if (event.locationName) {
      location = event.locationName;
    }

    // Build ICS content
    const organizerName = event.organizer.profile?.displayName || 'Gather User';
    const eventUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://gather.app'}/e/${event.slug}`;
    
    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Gather//Gather Events//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:${event.id}@gather.app`,
      `DTSTAMP:${formatIcsDate(new Date())}`,
      `DTSTART:${formatIcsDate(event.startTime)}`,
      event.endTime ? `DTEND:${formatIcsDate(event.endTime)}` : '',
      `SUMMARY:${escapeIcsText(event.title)}`,
      event.description ? `DESCRIPTION:${escapeIcsText(event.description)}` : '',
      location ? `LOCATION:${escapeIcsText(location)}` : '',
      `URL:${eventUrl}`,
      `ORGANIZER;CN=${escapeIcsText(organizerName)}:mailto:noreply@gather.app`,
      'END:VEVENT',
      'END:VCALENDAR',
    ].filter(Boolean).join('\r\n');

    return new NextResponse(icsContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `attachment; filename="${event.slug}.ics"`,
      },
    });
  } catch (error) {
    console.error('[Events] ICS error:', error);
    return internalError();
  }
}

export const GET = withOptionalAuth(getHandler);
