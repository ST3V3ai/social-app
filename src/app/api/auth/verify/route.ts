import { NextRequest, NextResponse } from 'next/server';
import { verifyMagicLink, createSession } from '@/lib/auth';
import { magicLinkVerifySchema } from '@/lib/validations';
import {
  successResponse,
  validationError,
  unauthorizedError,
  internalError,
  parseBody,
  getIpAddress,
} from '@/lib/api';

export async function POST(req: NextRequest) {
  try {
    const body = await parseBody<{ token: string }>(req);
    if (!body) {
      return validationError([{ field: 'body', message: 'Invalid request body' }]);
    }

    // Validate input
    const result = magicLinkVerifySchema.safeParse(body);
    if (!result.success) {
      return validationError(
        result.error.issues.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        }))
      );
    }

    const { token } = result.data;

    // Verify magic link
    const verifyResult = await verifyMagicLink(token);
    if (!verifyResult) {
      return unauthorizedError('Invalid or expired magic link');
    }

    const { user, isNewUser } = verifyResult;

    // Get device info from user agent
    const userAgent = req.headers.get('user-agent') || 'Unknown';
    const deviceInfo = {
      userAgent,
      platform: 'web',
    };

    // Create session
    const session = await createSession(user.id, deviceInfo, getIpAddress(req));

    // Set refresh token as httpOnly cookie
    const response = NextResponse.json({
      data: {
        accessToken: session.accessToken,
        expiresIn: 900, // 15 minutes
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          emailVerified: user.emailVerified,
          isNewUser,
        },
      },
    });

    // Set secure cookie for refresh token
    response.cookies.set('refresh_token', session.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });

    return response;
  } catch (error) {
    console.error('[Auth] Verify error:', error);
    return internalError();
  }
}
