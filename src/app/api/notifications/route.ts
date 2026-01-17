import { prisma } from '@/lib/db';
import {
  withAuth,
  successResponse,
  internalError,
  AuthenticatedRequest,
} from '@/lib/api';

// GET /api/notifications - Get user's notifications
async function getHandler(req: AuthenticatedRequest) {
  try {
    const user = req.user!;
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const skip = (page - 1) * limit;
    const unreadOnly = searchParams.get('unread') === 'true';

    const where: Record<string, unknown> = {
      userId: user.id,
    };

    if (unreadOnly) {
      where.readAt = null;
    }

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({
        where: { userId: user.id, readAt: null },
      }),
    ]);

    const data = notifications.map((n: typeof notifications[0]) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      body: n.body,
      entityType: n.entityType,
      entityId: n.entityId,
      readAt: n.readAt?.toISOString(),
      createdAt: n.createdAt.toISOString(),
    }));

    return successResponse({
      notifications: data,
      unreadCount,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('[Notifications] List error:', error);
    return internalError();
  }
}

export const GET = withAuth(getHandler);
