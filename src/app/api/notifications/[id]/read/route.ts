import { prisma } from '@/lib/db';
import {
  withAuth,
  successResponse,
  notFoundError,
  forbiddenError,
  internalError,
  AuthenticatedRequest,
} from '@/lib/api';

// PATCH /api/notifications/[id]/read - Mark notification as read
async function patchHandler(req: AuthenticatedRequest, context?: { params: Promise<Record<string, string>> }) {
  try {
    const { id } = await context!.params;
    const user = req.user!;

    const notification = await prisma.notification.findUnique({
      where: { id },
    });

    if (!notification) {
      return notFoundError('Notification not found');
    }

    if (notification.userId !== user.id) {
      return forbiddenError('Not your notification');
    }

    if (notification.readAt) {
      return successResponse({ message: 'Already read' });
    }

    await prisma.notification.update({
      where: { id },
      data: { readAt: new Date() },
    });

    return successResponse({ message: 'Marked as read' });
  } catch (error) {
    console.error('[Notifications] Read error:', error);
    return internalError();
  }
}

export const PATCH = withAuth(patchHandler);
