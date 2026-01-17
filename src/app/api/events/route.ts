import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { createEventSchema, searchEventsSchema } from '@/lib/validations';
import { generateEventSlug } from '@/lib/utils';
import {
  withAuth,
  withOptionalAuth,
  successResponse,
  validationError,
  internalError,
  parseBody,
  getSearchParams,
  AuthenticatedRequest,
} from '@/lib/api';

// GET /api/events - List/search events
async function getHandler(req: NextRequest) {
  try {
    const params = getSearchParams(req);
    const result = searchEventsSchema.safeParse(params);

    if (!result.success) {
      return validationError(
        result.error.issues.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        }))
      );
    }

    const { page, perPage, category, privacy, startAfter, startBefore, q, sort } = result.data;

    // Build where clause
    const where: Record<string, unknown> = {
      status: 'PUBLISHED',
      deletedAt: null,
    };

    // Only show public events in discovery by default
    if (privacy) {
      where.privacy = privacy;
    } else {
      where.privacy = 'PUBLIC';
    }

    if (category) {
      where.category = category;
    }

    if (startAfter || startBefore) {
      where.startTime = {};
      if (startAfter) {
        (where.startTime as Record<string, unknown>).gte = new Date(startAfter);
      }
      if (startBefore) {
        (where.startTime as Record<string, unknown>).lte = new Date(startBefore);
      }
    } else {
      // Default: upcoming events only
      where.startTime = { gte: new Date() };
    }

    if (q) {
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
      ];
    }

    // Build order by
    let orderBy: Record<string, string> = { startTime: 'asc' };
    if (sort === '-start_time') {
      orderBy = { startTime: 'desc' };
    } else if (sort === 'popularity') {
      orderBy = { viewCount: 'desc' };
    }

    const [events, total] = await Promise.all([
      prisma.event.findMany({
        where,
        orderBy,
        skip: (page - 1) * perPage,
        take: perPage,
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

    const formattedEvents = events.map((event: typeof events[0]) => ({
      id: event.id,
      slug: event.slug,
      title: event.title,
      description: event.description?.slice(0, 200),
      coverImageUrl: event.coverImageUrl,
      startTime: event.startTime.toISOString(),
      endTime: event.endTime?.toISOString(),
      timezone: event.timezone,
      isOnline: event.isOnline,
      locationName: event.locationName,
      privacy: event.privacy,
      category: event.category,
      attendeeCount: event._count.rsvps,
      organizer: {
        id: event.organizer.id,
        displayName: event.organizer.profile?.displayName || 'Anonymous',
        avatarUrl: event.organizer.profile?.avatarUrl,
      },
    }));

    return successResponse({
      events: formattedEvents,
      pagination: {
        page,
        perPage,
        total,
        totalPages: Math.ceil(total / perPage),
      },
    });
  } catch (error) {
    console.error('[Events] List error:', error);
    return internalError();
  }
}

// POST /api/events - Create event
async function postHandler(req: AuthenticatedRequest) {
  try {
    const body = await parseBody(req);
    if (!body) {
      return validationError([{ field: 'body', message: 'Invalid request body' }]);
    }

    const result = createEventSchema.safeParse(body);
    if (!result.success) {
      return validationError(
        result.error.issues.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        }))
      );
    }

    const data = result.data;
    const startTime = new Date(data.startTime);
    const slug = generateEventSlug(data.title, startTime);

    const event = await prisma.event.create({
      data: {
        organizerId: req.user.id,
        title: data.title,
        slug,
        description: data.description,
        startTime,
        endTime: data.endTime ? new Date(data.endTime) : null,
        timezone: data.timezone,
        isOnline: data.isOnline,
        onlineUrl: data.onlineUrl,
        locationName: data.location?.name,
        locationAddress: data.location?.address,
        locationLat: data.location?.lat,
        locationLng: data.location?.lng,
        locationHidden: true, // Default to hidden
        privacy: data.privacy,
        requireApproval: data.requireApproval,
        allowPlusOnes: data.allowPlusOnes,
        maxPlusOnes: data.maxPlusOnes,
        capacity: data.capacity,
        enableWaitlist: data.enableWaitlist,
        enableComments: data.enableComments,
        guestListVisible: data.guestListVisible,
        category: data.category,
        coverImageUrl: data.coverImageUrl,
        communityId: data.communityId,
        status: 'DRAFT',
      },
    });

    return successResponse(
      {
        id: event.id,
        slug: event.slug,
        title: event.title,
        status: event.status,
      },
      201
    );
  } catch (error) {
    console.error('[Events] Create error:', error);
    return internalError();
  }
}

export const GET = withOptionalAuth(getHandler);
export const POST = withAuth(postHandler);
