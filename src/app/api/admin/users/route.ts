import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { withAuth, type AuthenticatedRequest, successResponse, errorResponse, forbiddenError } from '@/lib/api';

async function requireAdmin(req: AuthenticatedRequest): Promise<boolean> {
  const dbUser = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { role: true },
  });
  return dbUser?.role === 'ADMIN' || dbUser?.role === 'MODERATOR';
}

async function handler(req: AuthenticatedRequest) {
  const isAdmin = await requireAdmin(req);
  if (!isAdmin) {
    return forbiddenError('Admin access required');
  }

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '20', 10);
  const search = searchParams.get('q') || '';
  const roleFilter = searchParams.get('role') || '';

  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};

  if (search) {
    where.OR = [
      { email: { contains: search, mode: 'insensitive' } },
      { displayName: { contains: search, mode: 'insensitive' } },
    ];
  }

  if (roleFilter) {
    where.role = roleFilter;
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        role: true,
        emailVerified: true,
        createdAt: true,
        profile: {
          select: {
            displayName: true,
          },
        },
        _count: {
          select: {
            events: true,
            rsvps: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.user.count({ where }),
  ]);

  return NextResponse.json(
    successResponse({
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  );
}

export const GET = withAuth(handler);
