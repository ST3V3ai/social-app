import { prisma } from '@/lib/db';
import {
  withAuth,
  successResponse,
  forbiddenError,
  internalError,
  AuthenticatedRequest,
} from '@/lib/api';
import { NextRequest } from 'next/server';

// Middleware to check admin access
async function requireAdmin(req: AuthenticatedRequest): Promise<boolean> {
  const user = req.user;
  if (!user) return false;
  
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { role: true },
  });
  
  return dbUser?.role === 'ADMIN' || dbUser?.role === 'MODERATOR';
}

// GET /api/admin/events - List all events for admin management
async function getHandler(req: NextRequest) {
  try {
    const authReq = req as AuthenticatedRequest;
    const isAdmin = await requireAdmin(authReq);
    if (!isAdmin) {
      return forbiddenError('Admin access required');
    }

    const { searchParams } = new URL(req.url);
    
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const skip = (page - 1) * limit;
    const status = searchParams.get('status'); // DRAFT, PUBLISHED, CANCELLED
    const privacy = searchParams.get('privacy'); // PRIVATE, UNLISTED, PUBLIC
    const q = searchParams.get('q'); // search query
    const sort = searchParams.get('sort') || '-created'; // -created, created, -start, start

    // Build where clause
    const where: Record<string, unknown> = {};

    if (status) {
      where.status = status;
    }
    if (privacy) {
      where.privacy = privacy;
    }
    if (q) {
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { slug: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
      ];
    }

    // Build order by
    let orderBy: Record<string, string> = { createdAt: 'desc' };
    switch (sort) {
      case 'created':
        orderBy = { createdAt: 'asc' };
        break;
      case '-start':
        orderBy = { startTime: 'desc' };
        break;
      case 'start':
        orderBy = { startTime: 'asc' };
        break;
    }

    const [events, total] = await Promise.all([
      prisma.event.findMany({
        where,
        skip,
        take: limit,
        orderBy,
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
          _count: {
            select: {
              rsvps: true,
              invites: true,
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
      status: event.status,
      privacy: event.privacy,
      startTime: event.startTime.toISOString(),
      endTime: event.endTime?.toISOString(),
      createdAt: event.createdAt.toISOString(),
      publishedAt: event.publishedAt?.toISOString(),
      cancelledAt: event.cancelledAt?.toISOString(),
      deletedAt: event.deletedAt?.toISOString(),
      viewCount: event.viewCount,
      rsvpCount: event._count.rsvps,
      inviteCount: event._count.invites,
      organizer: {
        id: event.organizer.id,
        email: event.organizer.email,
        displayName: event.organizer.profile?.displayName || 'Anonymous',
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
    console.error('[Admin] Events list error:', error);
    return internalError();
  }
}

export const GET = withAuth(getHandler);
