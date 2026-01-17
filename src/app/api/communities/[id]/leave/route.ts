import { prisma } from '@/lib/db';
import {
  withAuth,
  successResponse,
  notFoundError,
  badRequestError,
  internalError,
  AuthenticatedRequest,
} from '@/lib/api';

// DELETE /api/communities/[id]/leave - Leave a community
async function deleteHandler(req: AuthenticatedRequest, context?: { params: Promise<Record<string, string>> }) {
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

    // Check if member
    const member = await prisma.communityMember.findFirst({
      where: { communityId: community.id, userId: user.id },
    });

    if (!member) {
      return badRequestError('Not a member of this community');
    }

    // Creator cannot leave
    if (community.createdBy === user.id) {
      return badRequestError('Creator cannot leave the community');
    }

    // Remove membership
    await prisma.$transaction([
      prisma.communityMember.delete({
        where: { id: member.id },
      }),
      prisma.community.update({
        where: { id: community.id },
        data: { memberCount: { decrement: 1 } },
      }),
    ]);

    return successResponse({
      message: 'Left community successfully',
    });
  } catch (error) {
    console.error('[Communities] Leave error:', error);
    return internalError();
  }
}

export const DELETE = withAuth(deleteHandler);
