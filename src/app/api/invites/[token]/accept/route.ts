import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createRsvpSchema } from '@/lib/validations';
import { createSession, createMagicLink, verifyMagicLink } from '@/lib/auth';
import { sendRsvpConfirmationEmail } from '@/lib/email';
import { formatDateTime } from '@/lib/utils';
import {
  successResponse,
  validationError,
  notFoundError,
  forbiddenError,
  internalError,
  parseBody,
  getIpAddress,
} from '@/lib/api';

// POST /api/invites/[token]/accept - Accept invite
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await context.params;
    const body = await parseBody<{
      status?: string;
      plusOnes?: number;
      email?: string;
      name?: string;
    }>(req);

    const invite = await prisma.invite.findUnique({
      where: { token },
      include: {
        event: true,
      },
    });

    if (!invite || invite.event.deletedAt) {
      return notFoundError('Invite not found or expired');
    }

    // If user is already authenticated via cookie or header, use that
    let userId: string | null = null;
    const refreshToken = req.cookies.get('refresh_token')?.value;
    
    if (refreshToken) {
      // Try to get user from session
      const session = await prisma.session.findFirst({
        where: { 
          tokenHash: require('@/lib/auth').hashToken(refreshToken),
          expiresAt: { gt: new Date() },
        },
        include: { user: true },
      });
      if (session) {
        userId = session.userId;
      }
    }

    // If not authenticated, check if email was provided
    if (!userId && body?.email) {
      // Look up or create user by email
      let user = await prisma.user.findUnique({
        where: { email: body.email.toLowerCase() },
      });

      if (!user) {
        // Create new user
        user = await prisma.user.create({
          data: {
            email: body.email.toLowerCase(),
            emailVerified: false, // They'll need to verify later
            profile: {
              create: {
                displayName: body.name || null,
              },
            },
          },
        });
      }

      userId = user.id;
    }

    if (!userId) {
      return validationError([{ field: 'email', message: 'Email is required to RSVP' }]);
    }

    // Default to GOING if not specified
    const status = (body?.status || 'GOING') as 'GOING' | 'MAYBE' | 'NOT_GOING';
    const plusOnes = body?.plusOnes || 0;

    // Validate plus ones
    if (plusOnes > 0 && !invite.event.allowPlusOnes) {
      return validationError([{ field: 'plusOnes', message: 'Plus ones not allowed' }]);
    }

    if (plusOnes > invite.event.maxPlusOnes) {
      return validationError([
        { field: 'plusOnes', message: `Maximum ${invite.event.maxPlusOnes} plus ones allowed` },
      ]);
    }

    // Check capacity for VIP invites (bypass waitlist)
    let finalStatus: 'GOING' | 'MAYBE' | 'NOT_GOING' | 'WAITLIST' = status;
    if (status === 'GOING' && invite.event.capacity && invite.type !== 'VIP') {
      const currentCount = await prisma.rsvp.aggregate({
        where: {
          eventId: invite.eventId,
          status: 'GOING',
        },
        _sum: { plusOnes: true },
        _count: true,
      });

      const totalAttendees = (currentCount._count || 0) + (currentCount._sum.plusOnes || 0);
      if (totalAttendees + 1 + plusOnes > invite.event.capacity) {
        if (invite.event.enableWaitlist) {
          finalStatus = 'WAITLIST';
        } else {
          return forbiddenError('Event is at capacity');
        }
      }
    }

    // Create or update RSVP
    const existingRsvp = await prisma.rsvp.findFirst({
      where: {
        eventId: invite.eventId,
        userId,
      },
    });

    let rsvp;
    if (existingRsvp) {
      rsvp = await prisma.rsvp.update({
        where: { id: existingRsvp.id },
        data: {
          status: finalStatus,
          plusOnes,
          inviteId: invite.id,
        },
      });
    } else {
      rsvp = await prisma.rsvp.create({
        data: {
          eventId: invite.eventId,
          userId,
          status: finalStatus,
          plusOnes,
          approved: !invite.event.requireApproval || invite.type === 'VIP',
          inviteId: invite.id,
        },
      });
    }

    // Update invite as responded
    await prisma.invite.update({
      where: { id: invite.id },
      data: {
        status: 'RESPONDED',
        respondedAt: new Date(),
        userId,
      },
    });

    // Send confirmation email
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      await sendRsvpConfirmationEmail(
        user.email,
        invite.event.title,
        formatDateTime(invite.event.startTime),
        `${appUrl}/e/${invite.event.slug}`,
        finalStatus
      );
    }

    // Create session for the user if not already authenticated
    let accessToken = null;
    let response = NextResponse.json({
      data: {
        rsvp: {
          id: rsvp.id,
          status: rsvp.status,
          plusOnes: rsvp.plusOnes,
          approved: rsvp.approved,
        },
        event: {
          id: invite.event.id,
          slug: invite.event.slug,
          title: invite.event.title,
        },
      },
    });

    if (!refreshToken && userId) {
      const session = await createSession(userId, { platform: 'web' }, getIpAddress(req));
      accessToken = session.accessToken;

      response = NextResponse.json({
        data: {
          accessToken: session.accessToken,
          expiresIn: 900,
          rsvp: {
            id: rsvp.id,
            status: rsvp.status,
            plusOnes: rsvp.plusOnes,
            approved: rsvp.approved,
          },
          event: {
            id: invite.event.id,
            slug: invite.event.slug,
            title: invite.event.title,
          },
        },
      });

      response.cookies.set('refresh_token', session.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: 30 * 24 * 60 * 60,
      });
    }

    return response;
  } catch (error) {
    console.error('[Invites] Accept error:', error);
    return internalError();
  }
}
