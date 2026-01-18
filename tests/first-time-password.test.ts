/**
 * First-time Password Set Tests
 * 
 * Tests the flow where a magic-link-authenticated user sets their initial password.
 * This is Issue #4 from FEATURES_TO_BUILD.md.
 */

import { apiRequest, testEmail, prisma, clearRateLimits } from './setup';
import { createMagicLink, verifyMagicLink, hashToken } from '@/lib/auth';

describe('First-time Password Set API', () => {
  let magicLinkUserEmail: string;
  let magicLinkUserId: string;
  let accessToken: string;

  beforeAll(async () => {
    magicLinkUserEmail = testEmail('first-time-password');
    await clearRateLimits();
  });

  afterAll(async () => {
    // Clean up test user and related data
    try {
      const user = await prisma.user.findUnique({ where: { email: magicLinkUserEmail } });
      if (user) {
        await prisma.session.deleteMany({ where: { userId: user.id } });
        await prisma.magicLinkToken.deleteMany({ where: { email: magicLinkUserEmail } });
        await prisma.profile.deleteMany({ where: { userId: user.id } });
        await prisma.user.delete({ where: { id: user.id } });
      }
    } catch (e) {
      console.log('Cleanup error (may be expected):', e);
    }
    await prisma.$disconnect();
  });

  describe('PATCH /api/users/me/password', () => {
    beforeAll(async () => {
      // Create a magic-link user (no password)
      const { token } = await createMagicLink(magicLinkUserEmail);
      const result = await verifyMagicLink(token);
      
      expect(result).not.toBeNull();
      magicLinkUserId = result!.user.id;

      // Create a session for this user
      const { createSession } = await import('@/lib/auth');
      const session = await createSession(magicLinkUserId);
      accessToken = session.accessToken;
    });

    it('should allow first-time password set without currentPassword', async () => {
      const response = await apiRequest('PATCH', '/api/users/me/password', {
        newPassword: 'FirstPassword123!',
      }, accessToken);

      expect(response.status).toBe(200);
      expect(response.data.data.message).toContain('updated successfully');

      // Verify password was set
      const user = await prisma.user.findUnique({ where: { id: magicLinkUserId } });
      expect(user?.passwordHash).toBeTruthy();
    });

    it('should require currentPassword after password is set', async () => {
      const response = await apiRequest('PATCH', '/api/users/me/password', {
        newPassword: 'SecondPassword123!',
      }, accessToken);

      expect(response.status).toBe(400);
      expect(response.data.error.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'currentPassword',
            message: expect.stringContaining('required')
          })
        ])
      );
    });

    it('should allow password change with correct currentPassword', async () => {
      const response = await apiRequest('PATCH', '/api/users/me/password', {
        currentPassword: 'FirstPassword123!',
        newPassword: 'SecondPassword123!',
      }, accessToken);

      expect(response.status).toBe(200);
      expect(response.data.data.message).toContain('updated successfully');
    });

    it('should reject password change with incorrect currentPassword', async () => {
      const response = await apiRequest('PATCH', '/api/users/me/password', {
        currentPassword: 'WrongPassword123!',
        newPassword: 'ThirdPassword123!',
      }, accessToken);

      expect(response.status).toBe(401);
      expect(response.data.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('should reject weak password and return detailed errors', async () => {
      const response = await apiRequest('PATCH', '/api/users/me/password', {
        currentPassword: 'SecondPassword123!',
        newPassword: 'weak',
      }, accessToken);

      expect(response.status).toBe(400);
      // Should have specific validation error details
      expect(response.data.error.details).toBeDefined();
      expect(Array.isArray(response.data.error.details)).toBe(true);
      expect(response.data.error.details.length).toBeGreaterThan(0);
      
      // Check that error messages are specific
      const messages = response.data.error.details.map((d: { message: string }) => d.message);
      expect(messages.some((m: string) => m.includes('8 characters'))).toBe(true);
    });

    it('should reject password without uppercase and return specific error', async () => {
      const response = await apiRequest('PATCH', '/api/users/me/password', {
        currentPassword: 'SecondPassword123!',
        newPassword: 'lowercase123!',
      }, accessToken);

      expect(response.status).toBe(400);
      const messages = response.data.error.details.map((d: { message: string }) => d.message);
      expect(messages.some((m: string) => m.includes('uppercase'))).toBe(true);
    });

    it('should reject password without special character and return specific error', async () => {
      const response = await apiRequest('PATCH', '/api/users/me/password', {
        currentPassword: 'SecondPassword123!',
        newPassword: 'Password123',
      }, accessToken);

      expect(response.status).toBe(400);
      const messages = response.data.error.details.map((d: { message: string }) => d.message);
      expect(messages.some((m: string) => m.includes('special character'))).toBe(true);
    });
  });
});
