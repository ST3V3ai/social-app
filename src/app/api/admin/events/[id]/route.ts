import { prisma } from '@/lib/db';
import { updateEventSchema } from '@/lib/validations';
import {
  withAuth,
  successResponse,
  validationError,
  notFoundError,
  forbiddenError,
  internalError,
  parseBody,
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

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET /api/admin/events/[id] - Get event details for admin
async function getHandler(req: NextRequest, context?: { params: Promise<Record<string, string>> }) {
  try {
    const authReq = req as AuthenticatedRequest;
    const isAdmin = await requireAdmin(authReq);
    if (!isAdmin) {
      return forbiddenError('Admin access required');
    }

    const { id } = await context!.params;

    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        organizer: {
          include: {
            profile: true,
          },
        },
        cohosts: {
          include: {
            user: {
              include: {
                profile: true,
              },
            },
          },
        },
        venue: true,
        _count: {
          select: {
            rsvps: true,
            invites: true,
            posts: true,
          },
        },
      },
    });

    if (!event) {
      return notFoundError('Event not found');
    }

    return successResponse({
      ...event,
      startTime: event.startTime.toISOString(),
      endTime: event.endTime?.toISOString(),
      createdAt: event.createdAt.toISOString(),
      updatedAt: event.updatedAt.toISOString(),
      publishedAt: event.publishedAt?.toISOString(),
      cancelledAt: event.cancelledAt?.toISOString(),
      deletedAt: event.deletedAt?.toISOString(),
    });
  } catch (error) {
    console.error('[Admin] Event get error:', error);
    return internalError();
  }
}

// PATCH /api/admin/events/[id] - Update event as admin
async function patchHandler(req: NextRequest, context?: { params: Promise<Record<string, string>> }) {
  try {
    const authReq = req as AuthenticatedRequest;
    const isAdmin = await requireAdmin(authReq);
    if (!isAdmin) {
      return forbiddenError('Admin access required');
    }

    const { id } = await context!.params;
    const body = await parseBody(req);

    if (!body) {
      return validationError([{ field: 'body', message: 'Invalid request body' }]);
    }

    const event = await prisma.event.findUnique({
      where: { id },
    });

    if (!event) {
      return notFoundError('Event not found');
    }

    // Validate update data
    const result = updateEventSchema.safeParse(body);
    if (!result.success) {
      return validationError(
        result.error.issues.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        }))
      );
    }

    const data = result.data;

    // Build update data
    const updateData: Record<string, unknown> = {};

    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.startTime !== undefined) updateData.startTime = new Date(data.startTime);
    if (data.endTime !== undefined) updateData.endTime = data.endTime ? new Date(data.endTime) : null;
    if (data.timezone !== undefined) updateData.timezone = data.timezone;
    if (data.isOnline !== undefined) updateData.isOnline = data.isOnline;
    if (data.onlineUrl !== undefined) updateData.onlineUrl = data.onlineUrl;
    if (data.privacy !== undefined) updateData.privacy = data.privacy;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.capacity !== undefined) updateData.capacity = data.capacity;
    if (data.enableWaitlist !== undefined) updateData.enableWaitlist = data.enableWaitlist;
    if (data.enableComments !== undefined) updateData.enableComments = data.enableComments;
    if (data.guestListVisible !== undefined) updateData.guestListVisible = data.guestListVisible;
    if (data.requireApproval !== undefined) updateData.requireApproval = data.requireApproval;
    if (data.allowPlusOnes !== undefined) updateData.allowPlusOnes = data.allowPlusOnes;
    if (data.maxPlusOnes !== undefined) updateData.maxPlusOnes = data.maxPlusOnes;
    if (data.coverImageUrl !== undefined) updateData.coverImageUrl = data.coverImageUrl;

    if (data.location) {
      updateData.locationName = data.location.name;
      updateData.locationAddress = data.location.address;
      updateData.locationLat = data.location.lat;
      updateData.locationLng = data.location.lng;
    }

    // Handle admin-specific status changes
    if ((body as Record<string, unknown>).status !== undefined) {
      const newStatus = (body as Record<string, unknown>).status as string;
      if (['DRAFT', 'PUBLISHED', 'CANCELLED'].includes(newStatus)) {
        updateData.status = newStatus;
        if (newStatus === 'PUBLISHED' && !event.publishedAt) {
          updateData.publishedAt = new Date();
        } else if (newStatus === 'CANCELLED') {
          updateData.cancelledAt = new Date();
        }
      }
    }

    // Handle soft delete
    if ((body as Record<string, unknown>).deleted !== undefined) {
      updateData.deletedAt = (body as Record<string, unknown>).deleted ? new Date() : null;
    }

    const updated = await prisma.event.update({
      where: { id },
      data: updateData,
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: authReq.user.id,
        action: 'admin_event_update',
        entityType: 'event',
        entityId: event.id,
        oldData: JSON.parse(JSON.stringify(event)),
        newData: JSON.parse(JSON.stringify(updated)),
      },
    });

    return successResponse({
      id: updated.id,
      slug: updated.slug,
      status: updated.status,
      privacy: updated.privacy,
      updatedAt: updated.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error('[Admin] Event update error:', error);
    return internalError();
  }
}

// DELETE /api/admin/events/[id] - Soft delete event as admin
async function deleteHandler(req: NextRequest, context?: { params: Promise<Record<string, string>> }) {
  try {
    const authReq = req as AuthenticatedRequest;
    const isAdmin = await requireAdmin(authReq);
    if (!isAdmin) {
      return forbiddenError('Admin access required');
    }

    const { id } = await context!.params;

    const event = await prisma.event.findUnique({
      where: { id },
    });

    if (!event) {
      return notFoundError('Event not found');
    }

    // Soft delete
    await prisma.event.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: authReq.user.id,
        action: 'admin_event_delete',
        entityType: 'event',
        entityId: event.id,
        oldData: JSON.parse(JSON.stringify(event)),
      },
    });

    return successResponse({ deleted: true });
  } catch (error) {
    console.error('[Admin] Event delete error:', error);
    return internalError();
  }
}

export const GET = withAuth(getHandler);
export const PATCH = withAuth(patchHandler);
export const DELETE = withAuth(deleteHandler);
