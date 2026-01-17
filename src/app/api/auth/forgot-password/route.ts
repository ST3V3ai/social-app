import { NextRequest } from 'next/server';
import { parseBody, successResponse, errorResponse, validationError, checkRateLimit, rateLimitError, getIpAddress } from '@/lib/api';
import { createPasswordResetToken } from '@/lib/auth';
import { sendPasswordResetEmail } from '@/lib/email';
import { prisma } from '@/lib/db';
import { forgotPasswordSchema } from '@/lib/validations';

export async function POST(req: NextRequest) {
  try {
    const body = await parseBody<{ email: string }>(req);
    
    if (!body) {
      return validationError([{ field: 'body', message: 'Invalid request body' }]);
    }

    const validation = forgotPasswordSchema.safeParse(body);
    if (!validation.success) {
      return validationError(
        validation.error.issues.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        }))
      );
    }

    const { email } = validation.data;

    // Rate limit by IP (5 requests per hour)
    const ip = getIpAddress(req) || 'anonymous';
    const rateLimitResult = await checkRateLimit(`forgot-password:${ip}`, {
      requests: 5,
      window: 3600,
    });

    if (!rateLimitResult.allowed) {
      return rateLimitError(rateLimitResult.resetIn);
    }

    // Also rate limit by email (3 per hour)
    const emailRateLimitResult = await checkRateLimit(`forgot-password:${email}`, {
      requests: 3,
      window: 3600,
    });

    if (!emailRateLimitResult.allowed) {
      return rateLimitError(emailRateLimitResult.resetIn);
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    // Always return success to prevent email enumeration
    // But only send email if user exists and has a password
    if (user && user.passwordHash) {
      const resetToken = await createPasswordResetToken(user.id);
      await sendPasswordResetEmail(user.email, resetToken);
    }

    return successResponse({
      message: 'If an account exists with that email, a password reset link has been sent.',
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    return errorResponse('INTERNAL_ERROR', 'An error occurred processing your request', 500);
  }
}