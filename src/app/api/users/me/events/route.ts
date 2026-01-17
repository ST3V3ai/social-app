import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import {
  withAuth,
  successResponse,
  internalError,
  AuthenticatedRequest,
} from '@/lib/api';

// GET /api/users/me/events - Get current user's events (hosted and RSVPed)
async function getHandler(req: NextRequest) {
  try {
    const user = (req as AuthenticatedRequest).user;
    const { searchParams } = new URL(req.url);
    
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const skip = (page - 1) * limit;
    const type = searchParams.get('type') || 'upcoming'; // upcoming, past, all
    const source = searchParams.get('source'); // hosting, attending, all (default)

    // Build where clause
    interface EventWhere {
      deletedAt: null;
      OR?: Array<{ organizerId?: string; rsvps?: { some: { userId: string; status: { in: ('GOING' | 'MAYBE')[] } } } }>;
      organizerId?: string;
      startTime?: { gte?: Date; lt?: Date };
    }

    const where: EventWhere = {
      deletedAt: null,
    };

    // Determine what events to include
    if (source === 'hosting') {
      where.organizerId = user.id;
    } else if (source === 'attending') {
      where.OR = [
        { rsvps: { some: { userId: user.id, status: { in: ['GOING', 'MAYBE'] } } } },
      ];
    } else {
      // Default: both hosted and RSVPed events
      where.OR = [
        { organizerId: user.id },
        { rsvps: { some: { userId: user.id, status: { in: ['GOING', 'MAYBE'] } } } },
      ];
    }

    // Filter by time
    const now = new Date();
    if (type === 'upcoming') {
      where.startTime = { gte: now };
    } else if (type === 'past') {
      where.startTime = { lt: now };
    }

    const [events, total] = await Promise.all([
      prisma.event.findMany({
        where,
        skip,
        take: limit,
        orderBy: type === 'past' ? { startTime: 'desc' } : { startTime: 'asc' },
        include: {
          organizer: {
            include: {
              profile: {
                select: {
                  displayName: true,
                  avatarUrl: true,
                },
              },
            },
          },
          venue: {
            select: {
              id: true,
              name: true,
              city: true,
            },
          },
          _count: {
            select: {
              rsvps: {
                where: { status: 'GOING' },
              },
            },
          },
        },
      }),
      prisma.event.count({ where }),
    ]);

    const data = events.map((event: typeof events[0]) => ({
      id: event.id,
      slug: event.slug,
      title: event.title,
      coverImageUrl: event.coverImageUrl,
      startTime: event.startTime.toISOString(),
      endTime: event.endTime?.toISOString(),
      timezone: event.timezone,
      status: event.status,
      privacy: event.privacy,
      location: event.venue
        ? { name: event.venue.name, city: event.venue.city }
        : event.locationName
        ? { name: event.locationName }
        : null,
      goingCount: event._count.rsvps,
      host: {
        id: event.organizer.id,
        displayName: event.organizer.profile?.displayName || 'Anonymous',
        avatarUrl: event.organizer.profile?.avatarUrl,
      },
    }));

    return successResponse({
      events: data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('[Users] Me Events error:', error);
    return internalError();
  }
}

export const GET = withAuth(getHandler);
