import { prisma } from '@/lib/db';
import {
  withAuth,
  successResponse,
  notFoundError,
  forbiddenError,
  internalError,
  AuthenticatedRequest,
} from '@/lib/api';

// POST /api/events/[id]/publish - Publish event
async function handler(req: AuthenticatedRequest, context?: { params: Promise<Record<string, string>> }) {
  try {
    const { id } = await context!.params;

    const event = await prisma.event.findUnique({
      where: { id },
      include: { cohosts: true },
    });

    if (!event || event.deletedAt) {
      return notFoundError('Event not found');
    }

    // Check permission
    const isOrganizer = event.organizerId === req.user.id;
    const isCohost = event.cohosts.some((c: { userId: string }) => c.userId === req.user.id);

    if (!isOrganizer && !isCohost) {
      return forbiddenError('You do not have permission to publish this event');
    }

    // Already published?
    if (event.status === 'PUBLISHED') {
      return successResponse({
        id: event.id,
        slug: event.slug,
        status: event.status,
        message: 'Event is already published',
      });
    }

    // Publish the event
    const updated = await prisma.event.update({
      where: { id },
      data: {
        status: 'PUBLISHED',
        publishedAt: new Date(),
      },
    });

    return successResponse({
      id: updated.id,
      slug: updated.slug,
      status: updated.status,
      publishedAt: updated.publishedAt?.toISOString(),
    });
  } catch (error) {
    console.error('[Events] Publish error:', error);
    return internalError();
  }
}

export const POST = withAuth(handler);
