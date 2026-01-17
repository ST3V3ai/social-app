import { NextRequest } from 'next/server';
import { parseBody, successResponse, errorResponse, validationError, getIpAddress } from '@/lib/api';
import { verifyPassword, generateAccessToken, generateRefreshToken, createSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { signinSchema } from '@/lib/validations';

export async function POST(req: NextRequest) {
  try {
    const body = await parseBody<{ email: string; password: string }>(req);
    
    if (!body) {
      return validationError([{ field: 'body', message: 'Invalid request body' }]);
    }

    const validation = signinSchema.safeParse(body);
    if (!validation.success) {
      return validationError(
        validation.error.issues.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        }))
      );
    }

    const { email, password } = validation.data;

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: { profile: true },
    });

    if (!user || !user.passwordHash) {
      return errorResponse('INVALID_CREDENTIALS', 'Invalid email or password', 401);
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, user.passwordHash);
    if (!isValidPassword) {
      return errorResponse('INVALID_CREDENTIALS', 'Invalid email or password', 401);
    }

    // Check user status
    if (user.status !== 'ACTIVE') {
      return errorResponse('ACCOUNT_SUSPENDED', 'Your account has been suspended', 403);
    }

    // Create session
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    
    await createSession(
      user.id,
      req.headers.get('user-agent') ? { userAgent: req.headers.get('user-agent') } : undefined,
      getIpAddress(req)
    );

    return successResponse({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        emailVerified: user.emailVerified,
        profile: user.profile,
      },
      accessToken,
      refreshToken,
    });
  } catch (error) {
    console.error('Signin error:', error);
    return errorResponse('INTERNAL_ERROR', 'An error occurred during signin', 500);
  }
}