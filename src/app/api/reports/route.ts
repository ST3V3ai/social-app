import { prisma } from '@/lib/db';
import {
  withAuth,
  successResponse,
  validationError,
  notFoundError,
  badRequestError,
  internalError,
  AuthenticatedRequest,
} from '@/lib/api';
import { z } from 'zod';

const createReportSchema = z.object({
  entityType: z.enum(['EVENT', 'USER', 'POST', 'COMMENT']),
  entityId: z.string().uuid(),
  reason: z.enum(['SPAM', 'HARASSMENT', 'INAPPROPRIATE', 'FAKE', 'OTHER']),
  details: z.string().max(1000).optional(),
});

// POST /api/reports - Create a report
async function postHandler(req: AuthenticatedRequest) {
  try {
    const user = req.user!;
    const body = await req.json();
    
    const result = createReportSchema.safeParse(body);
    if (!result.success) {
      return validationError(
        result.error.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        }))
      );
    }

    const { entityType, entityId, reason, details } = result.data;

    // Verify target exists
    let targetExists = false;
    switch (entityType) {
      case 'EVENT':
        const event = await prisma.event.findUnique({ where: { id: entityId } });
        targetExists = !!event;
        break;
      case 'USER':
        const targetUser = await prisma.user.findUnique({ where: { id: entityId } });
        targetExists = !!targetUser;
        // Can't report yourself
        if (entityId === user.id) {
          return badRequestError('Cannot report yourself');
        }
        break;
      case 'POST':
        const post = await prisma.post.findUnique({ where: { id: entityId } });
        targetExists = !!post;
        break;
      case 'COMMENT':
        const comment = await prisma.comment.findUnique({ where: { id: entityId } });
        targetExists = !!comment;
        break;
    }

    if (!targetExists) {
      return notFoundError(`${entityType} not found`);
    }

    // Check for existing report from this user
    const existingReport = await prisma.report.findFirst({
      where: {
        reporterId: user.id,
        entityType,
        entityId,
        status: { in: ['PENDING', 'REVIEWED'] },
      },
    });

    if (existingReport) {
      return badRequestError('You have already reported this content');
    }

    // Create report
    const report = await prisma.report.create({
      data: {
        reporterId: user.id,
        entityType,
        entityId,
        reason,
        details,
        status: 'PENDING',
      },
    });

    return successResponse({
      id: report.id,
      message: 'Report submitted successfully',
    }, 201);
  } catch (error) {
    console.error('[Reports] Create error:', error);
    return internalError();
  }
}

export const POST = withAuth(postHandler);
