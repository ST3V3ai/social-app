import { prisma } from '@/lib/db';
import {
  withAuth,
  withOptionalAuth,
  successResponse,
  notFoundError,
  forbiddenError,
  internalError,
  AuthenticatedRequest,
} from '@/lib/api';
import { NextRequest } from 'next/server';

// GET /api/communities/[id] - Get community
async function getHandler(req: NextRequest, context?: { params: Promise<Record<string, string>> }) {
  try {
    const { id } = await context!.params;
    const authUser = (req as AuthenticatedRequest).user;

    const community = await prisma.community.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
        deletedAt: null,
      },
      include: {
        creator: {
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
            events: {
              where: { status: 'PUBLISHED', deletedAt: null },
            },
          },
        },
      },
    });

    if (!community) {
      return notFoundError('Community not found');
    }

    // Check if private and user is member
    if (community.privacy === 'PRIVATE' && authUser) {
      const isMember = await prisma.communityMember.findFirst({
        where: { communityId: community.id, userId: authUser.id },
      });
      if (!isMember) {
        return notFoundError('Community not found');
      }
    } else if (community.privacy === 'PRIVATE') {
      return notFoundError('Community not found');
    }

    // Check if user is member
    let membership = null;
    if (authUser) {
      const member = await prisma.communityMember.findFirst({
        where: { communityId: community.id, userId: authUser.id },
      });
      if (member) {
        membership = { role: member.role, joinedAt: member.joinedAt.toISOString() };
      }
    }

    return successResponse({
      id: community.id,
      slug: community.slug,
      name: community.name,
      description: community.description,
      coverImageUrl: community.coverImageUrl,
      privacy: community.privacy,
      memberCount: community.memberCount,
      eventCount: community._count.events,
      creator: {
        id: community.creator.id,
        displayName: community.creator.profile?.displayName || 'Anonymous',
        avatarUrl: community.creator.profile?.avatarUrl,
      },
      membership,
      createdAt: community.createdAt.toISOString(),
    });
  } catch (error) {
    console.error('[Communities] Get error:', error);
    return internalError();
  }
}

export const GET = withOptionalAuth(getHandler);
