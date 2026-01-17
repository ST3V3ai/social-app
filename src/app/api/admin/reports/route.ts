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

// GET /api/admin/reports - List reports (moderators only)
async function getHandler(req: AuthenticatedRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const skip = (page - 1) * limit;
    
    const status = searchParams.get('status');
    const entityType = searchParams.get('entityType');

    const where: Record<string, unknown> = {};
    if (status && ['PENDING', 'REVIEWED', 'ACTIONED', 'DISMISSED'].includes(status)) {
      where.status = status;
    }
    if (entityType && ['EVENT', 'USER', 'POST', 'COMMENT'].includes(entityType)) {
      where.entityType = entityType;
    }

    const [reports, total] = await Promise.all([
      prisma.report.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          reporter: {
            include: {
              profile: {
                select: {
                  displayName: true,
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
      }),
      prisma.report.count({ where }),
    ]);

    const data = reports.map((report: typeof reports[0]) => ({
      id: report.id,
      entityType: report.entityType,
      entityId: report.entityId,
      reason: report.reason,
      details: report.details,
      status: report.status,
      reporter: {
        id: report.reporter.id,
        displayName: report.reporter.profile?.displayName || 'Anonymous',
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
    }));

    return successResponse({
      reports: data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('[Admin] Reports list error:', error);
    return internalError();
  }
}

export const GET = withModerator(getHandler);
