import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { withAuth, type AuthenticatedRequest, successResponse, errorResponse, forbiddenError, notFoundError } from '@/lib/api';

async function requireAdmin(req: AuthenticatedRequest): Promise<boolean> {
  const dbUser = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { role: true },
  });
  return dbUser?.role === 'ADMIN' || dbUser?.role === 'MODERATOR';
}

async function getHandler(req: AuthenticatedRequest, context?: { params: Promise<Record<string, string>> }) {
  const isAdmin = await requireAdmin(req);
  if (!isAdmin) {
    return forbiddenError('Admin access required');
  }

  const { id } = await context!.params;

  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      profile: true,
      events: {
        select: {
          id: true,
          slug: true,
          title: true,
          status: true,
          startTime: true,
        },
        orderBy: { startTime: 'desc' },
        take: 10,
      },
      rsvps: {
        include: {
          event: {
            select: {
              id: true,
              slug: true,
              title: true,
              startTime: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      },
      _count: {
        select: {
          events: true,
          rsvps: true,
          notifications: true,
        },
      },
    },
  });

  if (!user) {
    return notFoundError('User not found');
  }

  // Don't return password hash
  const { passwordHash: _pw, ...safeUser } = user;
  return successResponse(safeUser);
}

async function patchHandler(req: AuthenticatedRequest, context?: { params: Promise<Record<string, string>> }) {
  const isAdmin = await requireAdmin(req);
  if (!isAdmin) {
    return forbiddenError('Admin access required');
  }

  const { id } = await context!.params;
  const body = await req.json();
  const { role, emailVerified, displayName } = body;

  // Only full admins can promote/demote roles
  const currentUser = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { role: true },
  });

  if (role && currentUser?.role !== 'ADMIN') {
    return forbiddenError('Only admins can change user roles');
  }

  const updateData: Record<string, unknown> = {};
  if (role) updateData.role = role;
  if (typeof emailVerified === 'boolean') updateData.emailVerified = emailVerified;

  const user = await prisma.user.update({
    where: { id },
    data: updateData,
    select: {
      id: true,
      email: true,
      role: true,
      emailVerified: true,
    },
  });

  // Log admin action
  await prisma.auditLog.create({
    data: {
      userId: req.user.id,
      action: 'USER_UPDATED',
      entityType: 'User',
      entityId: id,
      metadata: JSON.stringify({ changes: updateData }),
    },
  });

  return successResponse(user);
}

export const GET = withAuth(getHandler);
export const PATCH = withAuth(patchHandler);
