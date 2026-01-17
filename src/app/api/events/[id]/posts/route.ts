import { prisma } from '@/lib/db';
import { createPostSchema } from '@/lib/validations';
import {
  withAuth,
  withOptionalAuth,
  successResponse,
  validationError,
  notFoundError,
  forbiddenError,
  internalError,
  parseBody,
  AuthenticatedRequest,
} from '@/lib/api';
import { NextRequest } from 'next/server';

// GET /api/events/[id]/posts - List posts for an event
async function getHandler(req: NextRequest, context?: { params: Promise<Record<string, string>> }) {
  try {
    const { id: eventId } = await context!.params;
    const authUser = (req as AuthenticatedRequest).user;

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: { cohosts: true },
    });

    if (!event || event.deletedAt) {
      return notFoundError('Event not found');
    }

    // Check if user can view posts (must have RSVP'd or be organizer)
    const isOrganizer = authUser?.id === event.organizerId;
    const isCohost = event.cohosts.some((c: { userId: string }) => c.userId === authUser?.id);
    const canManage = isOrganizer || isCohost;

    if (!canManage && authUser) {
      const hasRsvp = await prisma.rsvp.findFirst({
        where: { eventId, userId: authUser.id },
      });
      if (!hasRsvp && event.privacy === 'PRIVATE') {
        return forbiddenError('You must RSVP to view posts');
      }
    }

    const posts = await prisma.post.findMany({
      where: {
        eventId,
        deletedAt: null,
      },
      include: {
        author: {
          include: {
            profile: {
              select: {
                displayName: true,
                avatarUrl: true,
              },
            },
          },
        },
        reactions: {
          select: {
            emoji: true,
            userId: true,
          },
        },
        _count: {
          select: {
            comments: true,
          },
        },
      },
      orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
    });

    return successResponse({
      posts: posts.map((post: typeof posts[0]) => {
        // Group reactions by emoji
        const reactionCounts: Record<string, number> = {};
        const userReaction = post.reactions.find((r: { userId: string }) => r.userId === authUser?.id);
        post.reactions.forEach((r: { emoji: string }) => {
          reactionCounts[r.emoji] = (reactionCounts[r.emoji] || 0) + 1;
        });

        return {
          id: post.id,
          type: post.type,
          content: post.content,
          isPinned: post.isPinned,
          author: {
            id: post.author.id,
            displayName: post.author.profile?.displayName || 'Anonymous',
            avatarUrl: post.author.profile?.avatarUrl,
          },
          reactions: reactionCounts,
          userReaction: userReaction?.emoji || null,
          commentCount: post._count.comments,
          createdAt: post.createdAt.toISOString(),
          updatedAt: post.updatedAt.toISOString(),
        };
      }),
    });
  } catch (error) {
    console.error('[Posts] List error:', error);
    return internalError();
  }
}

// POST /api/events/[id]/posts - Create a post
async function postHandler(req: AuthenticatedRequest, context?: { params: Promise<Record<string, string>> }) {
  try {
    const { id: eventId } = await context!.params;

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: { cohosts: true },
    });

    if (!event || event.deletedAt) {
      return notFoundError('Event not found');
    }

    // Only organizer and cohosts can post
    const isOrganizer = event.organizerId === req.user.id;
    const isCohost = event.cohosts.some((c: { userId: string }) => c.userId === req.user.id);

    if (!isOrganizer && !isCohost) {
      return forbiddenError('Only organizers can create posts');
    }

    const body = await parseBody(req);
    if (!body) {
      return validationError([{ field: 'body', message: 'Invalid request body' }]);
    }

    const result = createPostSchema.safeParse(body);
    if (!result.success) {
      return validationError(
        result.error.issues.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        }))
      );
    }

    const { content, type, isPinned } = result.data;

    const post = await prisma.post.create({
      data: {
        eventId,
        authorId: req.user.id,
        content,
        type,
        isPinned,
      },
    });

    // TODO: Send notifications to attendees based on post type

    return successResponse(
      {
        id: post.id,
        type: post.type,
        content: post.content,
        isPinned: post.isPinned,
        createdAt: post.createdAt.toISOString(),
      },
      201
    );
  } catch (error) {
    console.error('[Posts] Create error:', error);
    return internalError();
  }
}

export const GET = withOptionalAuth(getHandler);
export const POST = withAuth(postHandler);
