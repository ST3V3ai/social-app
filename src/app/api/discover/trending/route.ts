import { prisma } from '@/lib/db';
import {
  withOptionalAuth,
  successResponse,
  internalError,
} from '@/lib/api';
import { NextRequest } from 'next/server';

// GET /api/discover/trending - Get trending events
async function getHandler(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(20, Math.max(1, parseInt(searchParams.get('limit') || '10', 10)));

    // Get events with most RSVPs in the past 7 days, happening in the future
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const events = await prisma.event.findMany({
      where: {
        status: 'PUBLISHED',
        privacy: 'PUBLIC',
        deletedAt: null,
        startTime: { gte: new Date() },
      },
      take: limit,
      orderBy: [
        { viewCount: 'desc' },
        { startTime: 'asc' },
      ],
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
    });

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

    return successResponse({ events: data });
  } catch (error) {
    console.error('[Discover] Trending error:', error);
    return internalError();
  }
}

export const GET = withOptionalAuth(getHandler);
