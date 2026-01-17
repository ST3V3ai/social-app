import { prisma } from '@/lib/db';
import {
  withAuth,
  successResponse,
  internalError,
  AuthenticatedRequest,
} from '@/lib/api';

// POST /api/notifications/read-all - Mark all notifications as read
async function postHandler(req: AuthenticatedRequest) {
  try {
    const user = req.user!;

    const result = await prisma.notification.updateMany({
      where: {
        userId: user.id,
        readAt: null,
      },
      data: { readAt: new Date() },
    });

    return successResponse({
      message: 'All notifications marked as read',
      count: result.count,
    });
  } catch (error) {
    console.error('[Notifications] Read all error:', error);
    return internalError();
  }
}

export const POST = withAuth(postHandler);
