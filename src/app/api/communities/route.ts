import { prisma } from '@/lib/db';
import { createCommunitySchema, paginationSchema } from '@/lib/validations';
import { slugify, randomId } from '@/lib/utils';
import {
  withAuth,
  withOptionalAuth,
  successResponse,
  validationError,
  internalError,
  parseBody,
  getSearchParams,
  AuthenticatedRequest,
} from '@/lib/api';
import { NextRequest } from 'next/server';

// GET /api/communities - List communities
async function getHandler(req: NextRequest) {
  try {
    const params = getSearchParams(req);
    const result = paginationSchema.safeParse(params);

    if (!result.success) {
      return validationError(
        result.error.issues.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        }))
      );
    }

    const { page, perPage } = result.data;
    const q = params.q;

    const where: Record<string, unknown> = {
      deletedAt: null,
      privacy: 'PUBLIC',
    };

    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [communities, total] = await Promise.all([
      prisma.community.findMany({
        where,
        orderBy: { memberCount: 'desc' },
        skip: (page - 1) * perPage,
        take: perPage,
        include: {
          creator: {
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
      }),
      prisma.community.count({ where }),
    ]);

    return successResponse({
      communities: communities.map((c: typeof communities[0]) => ({
        id: c.id,
        slug: c.slug,
        name: c.name,
        description: c.description?.slice(0, 200),
        coverImageUrl: c.coverImageUrl,
        privacy: c.privacy,
        memberCount: c.memberCount,
        creator: {
          id: c.creator.id,
          displayName: c.creator.profile?.displayName || 'Anonymous',
          avatarUrl: c.creator.profile?.avatarUrl,
        },
      })),
      pagination: {
        page,
        perPage,
        total,
        totalPages: Math.ceil(total / perPage),
      },
    });
  } catch (error) {
    console.error('[Communities] List error:', error);
    return internalError();
  }
}

// POST /api/communities - Create community
async function postHandler(req: AuthenticatedRequest) {
  try {
    const body = await parseBody(req);
    if (!body) {
      return validationError([{ field: 'body', message: 'Invalid request body' }]);
    }

    const result = createCommunitySchema.safeParse(body);
    if (!result.success) {
      return validationError(
        result.error.issues.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        }))
      );
    }

    const { name, description, privacy, coverImageUrl } = result.data;
    const slug = `${slugify(name)}-${randomId(4)}`;

    const community = await prisma.community.create({
      data: {
        createdBy: req.user.id,
        name,
        slug,
        description,
        privacy,
        coverImageUrl,
        memberCount: 1,
        members: {
          create: {
            userId: req.user.id,
            role: 'ADMIN',
          },
        },
      },
    });

    return successResponse(
      {
        id: community.id,
        slug: community.slug,
        name: community.name,
      },
      201
    );
  } catch (error) {
    console.error('[Communities] Create error:', error);
    return internalError();
  }
}

export const GET = withOptionalAuth(getHandler);
export const POST = withAuth(postHandler);
