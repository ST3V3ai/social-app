import { prisma } from '@/lib/db';
import {
  withOptionalAuth,
  successResponse,
  internalError,
} from '@/lib/api';
import { NextRequest } from 'next/server';

// GET /api/discover/upcoming - Get upcoming events
async function getHandler(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const skip = (page - 1) * limit;

    // Get upcoming public events
    const where = {
      status: 'PUBLISHED' as const,
      privacy: 'PUBLIC' as const,
      deletedAt: null,
      startTime: { gte: new Date() },
    };

    const [events, total] = await Promise.all([
      prisma.event.findMany({
        where,
        skip,
        take: limit,
        orderBy: { startTime: 'asc' },
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
      privacy: event.privacy,
      location: event.venue
        ? { name: event.venue.name, city: event.venue.city }
        : event.locationName
        ? { name: event.locationName }
        : null,
      host: {
        id: event.organizer.id,
        displayName: event.organizer.profile?.displayName || 'Anonymous',
        avatarUrl: event.organizer.profile?.avatarUrl,
      },
      goingCount: event._count.rsvps,
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
    console.error('[Discover] Upcoming error:', error);
    return internalError();
  }
}

export const GET = withOptionalAuth(getHandler);
