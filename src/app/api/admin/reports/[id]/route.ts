import { prisma } from '@/lib/db';
import {
  withModerator,
  successResponse,
  validationError,
  notFoundError,
  internalError,
  AuthenticatedRequest,
} from '@/lib/api';
import { z } from 'zod';

const updateReportSchema = z.object({
  status: z.enum(['UNDER_REVIEW', 'RESOLVED', 'DISMISSED']),
  actionTaken: z.string().max(100).optional(),
});

// GET /api/admin/reports/[id] - Get report details
async function getHandler(req: AuthenticatedRequest, context?: { params: Promise<Record<string, string>> }) {
  try {
    const { id } = await context!.params;

    const report = await prisma.report.findUnique({
      where: { id },
      include: {
        reporter: {
          include: {
            profile: {
              select: {
                displayName: true,
                avatarUrl: true,
              },
            },
          },
        },
        reviewer: {
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

    if (!report) {
      return notFoundError('Report not found');
    }

    // Get target details
    let target: Record<string, unknown> = { id: report.entityId, type: report.entityType };
    switch (report.entityType) {
      case 'EVENT':
        const event = await prisma.event.findUnique({
          where: { id: report.entityId },
          select: { id: true, title: true, slug: true },
        });
        if (event) target = { ...target, title: event.title, slug: event.slug };
        break;
      case 'USER':
        const user = await prisma.user.findUnique({
          where: { id: report.entityId },
          include: { profile: { select: { displayName: true } } },
        });
        if (user) target = { ...target, displayName: user.profile?.displayName || 'Anonymous' };
        break;
      case 'POST':
        const post = await prisma.post.findUnique({
          where: { id: report.entityId },
          select: { id: true, content: true },
        });
        if (post) target = { ...target, content: post.content?.substring(0, 200) };
        break;
      case 'COMMENT':
        const comment = await prisma.comment.findUnique({
          where: { id: report.entityId },
          select: { id: true, content: true },
        });
        if (comment) target = { ...target, content: comment.content.substring(0, 200) };
        break;
    }

    return successResponse({
      id: report.id,
      target,
      reason: report.reason,
      details: report.details,
      status: report.status,
      reporter: {
        id: report.reporter.id,
        displayName: report.reporter.profile?.displayName || 'Anonymous',
        avatarUrl: report.reporter.profile?.avatarUrl,
      },
      reviewer: report.reviewer
        ? {
            id: report.reviewer.id,
            displayName: report.reviewer.profile?.displayName || 'Anonymous',
          }
        : null,
      actionTaken: report.actionTaken,
      createdAt: report.createdAt.toISOString(),
      reviewedAt: report.reviewedAt?.toISOString(),
    });
  } catch (error) {
    console.error('[Admin] Report get error:', error);
    return internalError();
  }
}

// PATCH /api/admin/reports/[id] - Update report status
async function patchHandler(req: AuthenticatedRequest, context?: { params: Promise<Record<string, string>> }) {
  try {
    const { id } = await context!.params;
    const user = req.user!;
    const body = await req.json();

    const result = updateReportSchema.safeParse(body);
    if (!result.success) {
      return validationError(
        result.error.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        }))
      );
    }

    const report = await prisma.report.findUnique({
      where: { id },
    });

    if (!report) {
      return notFoundError('Report not found');
    }

    const { status, actionTaken } = result.data;
    const updateData: Record<string, unknown> = { status };

    if (status === 'RESOLVED' || status === 'DISMISSED') {
      updateData.reviewedBy = user.id;
      updateData.reviewedAt = new Date();
      if (actionTaken) {
        updateData.actionTaken = actionTaken;
      }
    }

    const updated = await prisma.report.update({
      where: { id },
      data: updateData,
    });

    return successResponse({
      id: updated.id,
      status: updated.status,
      reviewedAt: updated.reviewedAt?.toISOString(),
    });
  } catch (error) {
    console.error('[Admin] Report update error:', error);
    return internalError();
  }
}

export const GET = withModerator(getHandler);
export const PATCH = withModerator(patchHandler);
