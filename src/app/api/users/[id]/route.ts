import { prisma } from '@/lib/db';
import {
  withAuth,
  withOptionalAuth,
  successResponse,
  validationError,
  notFoundError,
  forbiddenError,
  internalError,
  AuthenticatedRequest,
} from '@/lib/api';
import { NextRequest } from 'next/server';
import { z } from 'zod';

const updateProfileSchema = z.object({
  displayName: z.string().min(1).max(100).optional(),
  bio: z.string().max(500).optional(),
  avatarUrl: z.string().url().optional().nullable(),
  locationCity: z.string().max(100).optional().nullable(),
  timezone: z.string().max(50).optional(),
});

// GET /api/users/[id] - Get user profile
async function getHandler(req: NextRequest, context?: { params: Promise<Record<string, string>> }) {
  try {
    const { id } = await context!.params;
    const authUser = (req as AuthenticatedRequest).user;

    const user = await prisma.user.findFirst({
      where: {
        OR: [{ id }, { profile: { username: id } }],
        status: { not: 'SUSPENDED' },
      },
      include: {
        profile: true,
        _count: {
          select: {
            events: {
              where: { status: 'PUBLISHED', deletedAt: null, privacy: 'PUBLIC' },
            },
          },
        },
      },
    });

    if (!user) {
      return notFoundError('User not found');
    }

    const isOwn = authUser?.id === user.id;

    return successResponse({
      id: user.id,
      username: user.profile?.username,
      displayName: user.profile?.displayName || 'Anonymous',
      bio: user.profile?.bio,
      avatarUrl: user.profile?.avatarUrl,
      location: user.profile?.locationCity,
      eventCount: user._count.events,
      createdAt: user.createdAt.toISOString(),
      // Only show email to self
      ...(isOwn && { email: user.email }),
    });
  } catch (error) {
    console.error('[Users] Get error:', error);
    return internalError();
  }
}

// PATCH /api/users/[id] - Update user profile
async function patchHandler(req: AuthenticatedRequest, context?: { params: Promise<Record<string, string>> }) {
  try {
    const { id } = await context!.params;
    const user = req.user!;

    // Can only update own profile
    if (id !== user.id) {
      return forbiddenError('Cannot update another user profile');
    }

    const body = await req.json();
    const result = updateProfileSchema.safeParse(body);
    
    if (!result.success) {
      return validationError(
        result.error.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        }))
      );
    }

    const { displayName, bio, avatarUrl, locationCity, timezone } = result.data;

    // Upsert profile
    const profile = await prisma.profile.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        displayName,
        bio,
        avatarUrl,
        locationCity,
        timezone,
      },
      update: {
        ...(displayName !== undefined && { displayName }),
        ...(bio !== undefined && { bio }),
        ...(avatarUrl !== undefined && { avatarUrl }),
        ...(locationCity !== undefined && { locationCity }),
        ...(timezone !== undefined && { timezone }),
      },
    });

    return successResponse({
      displayName: profile.displayName,
      bio: profile.bio,
      avatarUrl: profile.avatarUrl,
      location: profile.locationCity,
      timezone: profile.timezone,
    });
  } catch (error) {
    console.error('[Users] Update error:', error);
    return internalError();
  }
}

export const GET = withOptionalAuth(getHandler);
export const PATCH = withAuth(patchHandler);
