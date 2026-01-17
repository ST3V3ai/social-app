import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import {
  successResponse,
  notFoundError,
  internalError,
} from '@/lib/api';

// GET /api/invites/[token] - Get invite details
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await context.params;

    const invite = await prisma.invite.findUnique({
      where: { token },
      include: {
        event: {
          include: {
            organizer: {
              include: {
                profile: {
                  select: {
                    displayName: true,
                    avatarUrl: true,
                  },
                },
              },
            },
          },
        },
        sender: {
          include: {
            profile: {
              select: {
                displayName: true,
              },
            },
          },
        },
      },
    });

    if (!invite || invite.event.deletedAt) {
      return notFoundError('Invite not found or expired');
    }

    // Mark as opened
    if (!invite.openedAt) {
      await prisma.invite.update({
        where: { id: invite.id },
        data: { openedAt: new Date() },
      });
    }

    return successResponse({
      invite: {
        id: invite.id,
        message: invite.message,
        type: invite.type,
        status: invite.status,
      },
      event: {
        id: invite.event.id,
        slug: invite.event.slug,
        title: invite.event.title,
        description: invite.event.description?.slice(0, 300),
        coverImageUrl: invite.event.coverImageUrl,
        startTime: invite.event.startTime.toISOString(),
        endTime: invite.event.endTime?.toISOString(),
        timezone: invite.event.timezone,
        isOnline: invite.event.isOnline,
        locationName: invite.event.locationName,
        organizer: {
          displayName: invite.event.organizer.profile?.displayName || 'Anonymous',
          avatarUrl: invite.event.organizer.profile?.avatarUrl,
        },
      },
      sender: {
        displayName: invite.sender.profile?.displayName || 'Anonymous',
      },
    });
  } catch (error) {
    console.error('[Invites] Get error:', error);
    return internalError();
  }
}
