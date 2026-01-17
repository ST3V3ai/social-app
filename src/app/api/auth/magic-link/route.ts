import { NextRequest } from 'next/server';
import { createMagicLink } from '@/lib/auth';
import { sendMagicLinkEmail } from '@/lib/email';
import { magicLinkRequestSchema } from '@/lib/validations';
import {
  successResponse,
  validationError,
  rateLimitError,
  internalError,
  parseBody,
  checkRateLimit,
  getIpAddress,
} from '@/lib/api';
import { isDisposableEmail } from '@/lib/utils';

export async function POST(req: NextRequest) {
  try {
    const body = await parseBody<{ email: string }>(req);
    if (!body) {
      return validationError([{ field: 'body', message: 'Invalid request body' }]);
    }

    // Validate input
    const result = magicLinkRequestSchema.safeParse(body);
    if (!result.success) {
      return validationError(
        result.error.issues.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        }))
      );
    }

    const { email } = result.data;

    // Check for disposable email
    if (isDisposableEmail(email)) {
      return validationError([
        { field: 'email', message: 'Disposable email addresses are not allowed' },
      ]);
    }

    // Rate limit by IP (10 requests per hour)
    const ip = getIpAddress(req) || 'anonymous';
    const rateLimitResult = await checkRateLimit(`magic-link:${ip}`, {
      requests: 10,
      window: 3600,
    });

    if (!rateLimitResult.allowed) {
      return rateLimitError(rateLimitResult.resetIn);
    }

    // Also rate limit by email (5 per hour)
    const emailRateLimitResult = await checkRateLimit(`magic-link:${email}`, {
      requests: 5,
      window: 3600,
    });

    if (!emailRateLimitResult.allowed) {
      return rateLimitError(emailRateLimitResult.resetIn);
    }

    // Create magic link
    const { token, expiresAt } = await createMagicLink(email);

    // Send email
    const emailSent = await sendMagicLinkEmail(email, token);

    if (!emailSent) {
      console.error('[Auth] Failed to send magic link email to:', email);
      // Still return success to prevent email enumeration
    }

    return successResponse({
      message: 'Magic link sent',
      expiresIn: Math.floor((expiresAt.getTime() - Date.now()) / 1000),
    });
  } catch (error) {
    console.error('[Auth] Magic link error:', error);
    return internalError();
  }
}
