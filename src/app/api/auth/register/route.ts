import { NextRequest } from 'next/server';
import { parseBody, successResponse, errorResponse, validationError, getIpAddress } from '@/lib/api';
import { hashPassword, validatePassword, generateAccessToken, generateRefreshToken, createSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { registerSchema } from '@/lib/validations';

export async function POST(req: NextRequest) {
  try {
    const body = await parseBody<{ email: string; password: string; displayName?: string }>(req);
    
    if (!body) {
      return validationError([{ field: 'body', message: 'Invalid request body' }]);
    }

    const validation = registerSchema.safeParse(body);
    if (!validation.success) {
      return validationError(
        validation.error.issues.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        }))
      );
    }

    const { email, password, displayName } = validation.data;

    // Validate password strength
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      return validationError(
        passwordValidation.errors.map(error => ({
          field: 'password',
          message: error
        }))
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      return errorResponse('USER_EXISTS', 'An account with this email already exists', 409);
    }

    // Hash password and create user
    const passwordHash = await hashPassword(password);
    
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        passwordHash,
        emailVerified: true, // Consider email verified on registration
        profile: {
          create: {
            displayName: displayName || email.split('@')[0].replace(/[._-]/g, ' '),
          },
        },
      },
      include: {
        profile: true,
      },
    });

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
    }, 201);
  } catch (error) {
    console.error('Registration error:', error);
    return errorResponse('INTERNAL_ERROR', 'An error occurred during registration', 500);
  }
}