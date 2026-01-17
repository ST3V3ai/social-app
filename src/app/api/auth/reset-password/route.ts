import { NextRequest } from 'next/server';
import { parseBody, successResponse, errorResponse, validationError } from '@/lib/api';
import { verifyPasswordResetToken, hashPassword, validatePassword } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { resetPasswordSchema } from '@/lib/validations';

export async function POST(req: NextRequest) {
  try {
    const body = await parseBody<{ token: string; password: string }>(req);
    
    if (!body) {
      return validationError([{ field: 'body', message: 'Invalid request body' }]);
    }

    const validation = resetPasswordSchema.safeParse(body);
    if (!validation.success) {
      return validationError(
        validation.error.issues.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        }))
      );
    }

    const { token, password } = validation.data;

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

    // Verify reset token
    const tokenData = await verifyPasswordResetToken(token);
    if (!tokenData) {
      return errorResponse('INVALID_TOKEN', 'Invalid or expired reset token', 400);
    }

    // Hash new password and update user
    const passwordHash = await hashPassword(password);
    
    await prisma.user.update({
      where: { id: tokenData.userId },
      data: { passwordHash },
    });

    // Invalidate all existing sessions for security
    await prisma.session.deleteMany({
      where: { userId: tokenData.userId },
    });

    return successResponse({
      message: 'Password has been reset successfully. Please sign in with your new password.',
    });
  } catch (error) {
    console.error('Reset password error:', error);
    return errorResponse('INTERNAL_ERROR', 'An error occurred resetting your password', 500);
  }
}