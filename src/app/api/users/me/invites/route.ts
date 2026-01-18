import { successResponse, internalError } from '@/lib/api';
import { withAuth, type AuthenticatedRequest } from '@/lib/api';
import { prisma } from '@/lib/db';
import { InviteStatus, Prisma } from '@prisma/client';

// GET /api/users/me/invites - Get invites received by current user
async function handler(req: AuthenticatedRequest) {
  try {
    const url = new URL(req.url);
    const status = url.searchParams.get('status') || 'PENDING';
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get('limit') || '20', 10)));
    const skip = (page - 1) * limit;

    // Find invites where the user is the recipient (by userId or by email)
    const whereClause: Prisma.InviteWhereInput = {
      OR: [
        { userId: req.user.id },
        { email: req.user.email },
      ],
      ...(status !== 'all' && status in InviteStatus ? { status: status as InviteStatus } : {}),
    };

    const [invites, total] = await Promise.all([
      prisma.invite.findMany({
        where: whereClause,
        include: {
          event: {
            select: {
              id: true,
              slug: true,
              title: true,
              coverImageUrl: true,
              startTime: true,
              endTime: true,
              timezone: true,
              privacy: true,
              status: true,
              locationName: true,
              locationAddress: true,
              organizer: {
                select: {
                  id: true,
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
          sender: {
            select: {
              id: true,
              profile: {
                select: {
                  displayName: true,
                  avatarUrl: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.invite.count({ where: whereClause }),
    ]);

    // Transform to a cleaner format
    const transformedInvites = invites.map((invite) => ({
      id: invite.id,
      token: invite.token,
      status: invite.status,
      message: invite.message,
      type: invite.type,
      createdAt: invite.createdAt,
      expiresAt: invite.expiresAt,
      event: {
        id: invite.event.id,
        slug: invite.event.slug,
        title: invite.event.title,
        coverImageUrl: invite.event.coverImageUrl,
        startTime: invite.event.startTime,
        endTime: invite.event.endTime,
        timezone: invite.event.timezone,
        privacy: invite.event.privacy,
        status: invite.event.status,
        location: invite.event.locationName
          ? { name: invite.event.locationName, address: invite.event.locationAddress }
          : null,
        host: {
          id: invite.event.organizer.id,
          displayName: invite.event.organizer.profile?.displayName || 'Unknown',
          avatarUrl: invite.event.organizer.profile?.avatarUrl,
        },
      },
      sender: {
        id: invite.sender.id,
        displayName: invite.sender.profile?.displayName || 'Unknown',
        avatarUrl: invite.sender.profile?.avatarUrl,
      },
    }));

    return successResponse({
      invites: transformedInvites,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('[Invites] Get user invites error:', error);
    return internalError();
  }
}

export const GET = withAuth(handler);
