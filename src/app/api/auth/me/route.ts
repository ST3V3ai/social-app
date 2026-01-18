import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { withAuth, successResponse, internalError, AuthenticatedRequest } from '@/lib/api';

async function handler(req: AuthenticatedRequest) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        profile: true,
      },
    });

    if (!user) {
      return internalError('User not found');
    }

    return successResponse({
      id: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
      emailVerified: user.emailVerified,
      hasPassword: Boolean(user.passwordHash),
      profile: user.profile
        ? {
            displayName: user.profile.displayName,
            username: user.profile.username,
            bio: user.profile.bio,
            avatarUrl: user.profile.avatarUrl,
            timezone: user.profile.timezone,
            locale: user.profile.locale,
          }
        : null,
    });
  } catch (error) {
    console.error('[Auth] Get me error:', error);
    return internalError();
  }
}

export const GET = withAuth(handler);
