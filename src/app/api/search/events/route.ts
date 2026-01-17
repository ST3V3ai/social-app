import { prisma } from '@/lib/db';
import {
  withOptionalAuth,
  successResponse,
  internalError,
  AuthenticatedRequest,
} from '@/lib/api';
import { NextRequest } from 'next/server';

// GET /api/search/events - Search events
async function getHandler(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const authUser = (req as AuthenticatedRequest).user;
    
    const q = searchParams.get('q') || '';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const skip = (page - 1) * limit;
    
    // Optional filters
    const communityId = searchParams.get('communityId');
    const startDateStr = searchParams.get('startDate');
    const endDateStr = searchParams.get('endDate');
    const privacy = searchParams.get('privacy');

    // Build where clause
    const where: Record<string, unknown> = {
      status: 'PUBLISHED',
      deletedAt: null,
    };

    // Search by title or description
    if (q) {
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
      ];
    }

    // Filter by community
    if (communityId) {
      where.communityId = communityId;
    }

    // Filter by date range
    if (startDateStr) {
      const startDate = new Date(startDateStr);
      if (!isNaN(startDate.getTime())) {
        where.startTime = { ...(where.startTime as object || {}), gte: startDate };
      }
    }
    if (endDateStr) {
      const endDate = new Date(endDateStr);
      if (!isNaN(endDate.getTime())) {
        where.endTime = { ...(where.endTime as object || {}), lte: endDate };
      }
    }

    // Privacy filter
    if (privacy === 'PUBLIC' || privacy === 'UNLISTED') {
      where.privacy = privacy;
    } else {
      // By default, only show public events in search
      where.privacy = 'PUBLIC';
    }

    // Only show future events by default
    const showPast = searchParams.get('showPast') === 'true';
    if (!showPast) {
      where.startTime = { ...(where.startTime as object || {}), gte: new Date() };
    }

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
    console.error('[Search] Events error:', error);
    return internalError();
  }
}

export const GET = withOptionalAuth(getHandler);
