import { prisma } from '@/lib/db';
import {
  withOptionalAuth,
  successResponse,
  notFoundError,
  internalError,
  AuthenticatedRequest,
} from '@/lib/api';
import { NextRequest } from 'next/server';

// GET /api/users/[id]/events - Get user's hosted events
async function getHandler(req: NextRequest, context?: { params: Promise<Record<string, string>> }) {
  try {
    const { id } = await context!.params;
    const authUser = (req as AuthenticatedRequest).user;
    const { searchParams } = new URL(req.url);
    
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const skip = (page - 1) * limit;
    const type = searchParams.get('type') || 'upcoming'; // upcoming, past, all

    const user = await prisma.user.findFirst({
      where: {
        OR: [{ id }, { profile: { username: id } }],
      },
    });

    if (!user) {
      return notFoundError('User not found');
    }

    const isOwn = authUser?.id === user.id;

    // Build where clause
    const where: Record<string, unknown> = {
      organizerId: user.id,
      deletedAt: null,
    };

    // Only show published public events to others
    if (!isOwn) {
      where.status = 'PUBLISHED';
      where.privacy = 'PUBLIC';
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
    console.error('[Users] Events error:', error);
    return internalError();
  }
}

export const GET = withOptionalAuth(getHandler);
