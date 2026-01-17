import { prisma } from '@/lib/db';
import {
  withAuth,
  successResponse,
  notFoundError,
  badRequestError,
  internalError,
  AuthenticatedRequest,
} from '@/lib/api';

// POST /api/communities/[id]/join - Join a community
async function postHandler(req: AuthenticatedRequest, context?: { params: Promise<Record<string, string>> }) {
  try {
    const { id } = await context!.params;
    const user = req.user!;

    const community = await prisma.community.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
        deletedAt: null,
      },
    });

    if (!community) {
      return notFoundError('Community not found');
    }

    // Check if private community
    if (community.privacy === 'PRIVATE') {
      return badRequestError('Cannot join private communities without invite');
    }

    // Check if already a member
    const existingMember = await prisma.communityMember.findFirst({
      where: { communityId: community.id, userId: user.id },
    });

    if (existingMember) {
      return badRequestError('Already a member of this community');
    }

    // Create membership
    await prisma.$transaction([
      prisma.communityMember.create({
        data: {
          communityId: community.id,
          userId: user.id,
          role: 'MEMBER',
        },
      }),
      prisma.community.update({
        where: { id: community.id },
        data: { memberCount: { increment: 1 } },
      }),
    ]);

    return successResponse({
      message: 'Joined community successfully',
      role: 'MEMBER',
    });
  } catch (error) {
    console.error('[Communities] Join error:', error);
    return internalError();
  }
}

export const POST = withAuth(postHandler);
