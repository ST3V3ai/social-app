import { parseBody, successResponse, validationError, errorResponse, internalError } from '@/lib/api';
import { withAuth, type AuthenticatedRequest } from '@/lib/api';
import { prisma } from '@/lib/db';
import { changePasswordSchema } from '@/lib/validations';
import { hashPassword, validatePassword, verifyPassword } from '@/lib/auth';

async function handler(req: AuthenticatedRequest) {
  try {
    const body = await parseBody<{ currentPassword: string; newPassword: string }>(req);

    if (!body) {
      return validationError([{ field: 'body', message: 'Invalid request body' }]);
    }

    const validation = changePasswordSchema.safeParse(body);
    if (!validation.success) {
      return validationError(
        validation.error.issues.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        }))
      );
    }

    const { currentPassword, newPassword } = validation.data;

    if (currentPassword && currentPassword === newPassword) {
      return errorResponse('SAME_PASSWORD', 'New password must be different from current password', 400);
    }

    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      return validationError(
        passwordValidation.errors.map((error) => ({
          field: 'newPassword',
          message: error,
        }))
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, passwordHash: true },
    });

    if (!user) {
      return errorResponse('USER_NOT_FOUND', 'User not found', 404);
    }

    if (user.passwordHash) {
      if (!currentPassword) {
        return validationError([{ field: 'currentPassword', message: 'Current password is required' }]);
      }

      const isValidPassword = await verifyPassword(currentPassword, user.passwordHash);
      if (!isValidPassword) {
        return errorResponse('INVALID_CREDENTIALS', 'Current password is incorrect', 401);
      }
    }

    const newPasswordHash = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newPasswordHash },
    });

    return successResponse({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('[Settings] Change password error:', error);
    return internalError();
  }
}

export const PATCH = withAuth(handler);
