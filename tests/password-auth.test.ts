/**
 * Password Authentication Tests
 * 
 * Tests the password-based authentication flow:
 * 1. User registration with password
 * 2. User signin with password
 * 3. Forgot password flow
 * 4. Reset password flow
 * 5. Validation tests
 */

import { apiRequest, testEmail, prisma, BASE_URL, clearRateLimits } from './setup';
import { hashToken } from '@/lib/auth';

describe('Password Authentication API', () => {
  let testUserEmail: string;
  let testUserId: string;
  let accessToken: string;
  let resetToken: string;

  beforeAll(async () => {
    testUserEmail = testEmail('password-auth');
    // Clear rate limits to prevent 429 errors
    await clearRateLimits();
  });

  afterAll(async () => {
    // Clean up test user and related data
    try {
      const user = await prisma.user.findUnique({ where: { email: testUserEmail } });
      if (user) {
        await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });
        await prisma.session.deleteMany({ where: { userId: user.id } });
        await prisma.magicLinkToken.deleteMany({ where: { email: testUserEmail } });
        await prisma.profile.deleteMany({ where: { userId: user.id } });
        await prisma.user.delete({ where: { id: user.id } });
      }
    } catch (e) {
      console.log('Cleanup error (may be expected):', e);
    }
    await prisma.$disconnect();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user with password', async () => {
      const response = await apiRequest('POST', '/api/auth/register', {
        email: testUserEmail,
        password: 'Password123!',
        displayName: 'Test User',
      });

      expect(response.status).toBe(201);
      expect(response.data.data).toHaveProperty('user');
      expect(response.data.data).toHaveProperty('accessToken');
      expect(response.data.data).toHaveProperty('refreshToken');
      
      const { user } = response.data.data;
      expect(user.email).toBe(testUserEmail);
      expect(user.emailVerified).toBe(true);
      expect(user.profile.displayName).toBe('Test User');

      // Store for later tests
      testUserId = user.id;
      accessToken = response.data.data.accessToken;
    });

    it('should reject registration with existing email', async () => {
      const response = await apiRequest('POST', '/api/auth/register', {
        email: testUserEmail,
        password: 'Password123!',
      });

      expect(response.status).toBe(409);
      expect(response.data.error.code).toBe('USER_EXISTS');
    });

    it('should reject weak password', async () => {
      const response = await apiRequest('POST', '/api/auth/register', {
        email: testEmail('weak-password'),
        password: 'weak',
      });

      expect(response.status).toBe(400);
      expect(response.data.error.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'password',
            message: expect.stringContaining('at least 8 characters')
          })
        ])
      );
    });

    it('should reject invalid email format', async () => {
      const response = await apiRequest('POST', '/api/auth/register', {
        email: 'not-an-email',
        password: 'Password123!',
      });

      expect(response.status).toBe(400);
      expect(response.data.error.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'email',
            message: expect.stringContaining('valid email')
          })
        ])
      );
    });
  });

  describe('POST /api/auth/signin', () => {
    it('should sign in with correct credentials', async () => {
      const response = await apiRequest('POST', '/api/auth/signin', {
        email: testUserEmail,
        password: 'Password123!',
      });

      expect(response.status).toBe(200);
      expect(response.data.data).toHaveProperty('user');
      expect(response.data.data).toHaveProperty('accessToken');
      expect(response.data.data).toHaveProperty('refreshToken');
      
      const { user } = response.data.data;
      expect(user.email).toBe(testUserEmail);
    });

    it('should reject incorrect password', async () => {
      const response = await apiRequest('POST', '/api/auth/signin', {
        email: testUserEmail,
        password: 'WrongPassword123!',
      });

      expect(response.status).toBe(401);
      expect(response.data.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('should reject non-existent email', async () => {
      const response = await apiRequest('POST', '/api/auth/signin', {
        email: testEmail('nonexistent'),
        password: 'Password123!',
      });

      expect(response.status).toBe(401);
      expect(response.data.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('should reject magic-link-only users (without password)', async () => {
      // Create a user without password (like old magic-link users)
      const magicOnlyUser = await prisma.user.create({
        data: {
          email: testEmail('magic-only'),
          emailVerified: true,
          profile: {
            create: {
              displayName: 'Magic Only User',
            },
          },
        },
      });

      const response = await apiRequest('POST', '/api/auth/signin', {
        email: magicOnlyUser.email,
        password: 'Password123!',
      });

      expect(response.status).toBe(401);
      expect(response.data.error.code).toBe('INVALID_CREDENTIALS');

      // Cleanup
      await prisma.profile.deleteMany({ where: { userId: magicOnlyUser.id } });
      await prisma.user.delete({ where: { id: magicOnlyUser.id } });
    });
  });

  describe('POST /api/auth/forgot-password', () => {
    it('should send reset email for existing user with password', async () => {
      const response = await apiRequest('POST', '/api/auth/forgot-password', {
        email: testUserEmail,
      });

      expect(response.status).toBe(200);
      expect(response.data.data.message).toContain('reset link has been sent');

      // Verify reset token was created in database
      const resetTokenRecord = await prisma.passwordResetToken.findFirst({
        where: { userId: testUserId },
        orderBy: { createdAt: 'desc' },
      });
      expect(resetTokenRecord).toBeTruthy();
      expect(resetTokenRecord!.usedAt).toBeNull();
    });

    it('should return success even for non-existent email (security)', async () => {
      const response = await apiRequest('POST', '/api/auth/forgot-password', {
        email: testEmail('nonexistent-forgot'),
      });

      expect(response.status).toBe(200);
      expect(response.data.data.message).toContain('reset link has been sent');
    });

    it('should return success for magic-link-only users (no password)', async () => {
      const magicOnlyUser = await prisma.user.create({
        data: {
          email: testEmail('magic-forgot'),
          emailVerified: true,
          profile: {
            create: {
              displayName: 'Magic User',
            },
          },
        },
      });

      const response = await apiRequest('POST', '/api/auth/forgot-password', {
        email: magicOnlyUser.email,
      });

      expect(response.status).toBe(200);
      expect(response.data.data.message).toContain('reset link has been sent');

      // Should not create reset token for user without password
      const resetTokenRecord = await prisma.passwordResetToken.findFirst({
        where: { userId: magicOnlyUser.id },
      });
      expect(resetTokenRecord).toBeNull();

      // Cleanup
      await prisma.profile.deleteMany({ where: { userId: magicOnlyUser.id } });
      await prisma.user.delete({ where: { id: magicOnlyUser.id } });
    });
  });

  describe('POST /api/auth/reset-password', () => {
    beforeAll(async () => {
      // Create a password reset token for testing
      const tokenPlain = 'test-reset-token-' + Date.now();
      const tokenHash = hashToken(tokenPlain);
      
      await prisma.passwordResetToken.create({
        data: {
          userId: testUserId,
          tokenHash,
          expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
        },
      });
      
      resetToken = tokenPlain;
    });

    it('should reset password with valid token', async () => {
      const newPassword = 'NewPassword456!';
      
      const response = await apiRequest('POST', '/api/auth/reset-password', {
        token: resetToken,
        password: newPassword,
      });

      expect(response.status).toBe(200);
      expect(response.data.data.message).toContain('reset successfully');

      // Verify the token is marked as used
      const resetTokenRecord = await prisma.passwordResetToken.findFirst({
        where: { 
          tokenHash: hashToken(resetToken),
          userId: testUserId,
        },
      });
      expect(resetTokenRecord!.usedAt).toBeTruthy();

      // Verify old sessions were invalidated (check BEFORE creating new session)
      const oldSessionResponse = await apiRequest('GET', '/api/auth/me', undefined, accessToken);
      expect(oldSessionResponse.status).toBe(401);

      // Verify we can sign in with new password
      const signinResponse = await apiRequest('POST', '/api/auth/signin', {
        email: testUserEmail,
        password: newPassword,
      });
      expect(signinResponse.status).toBe(200);
    });

    it('should reject invalid token', async () => {
      const response = await apiRequest('POST', '/api/auth/reset-password', {
        token: 'invalid-token',
        password: 'ValidPassword789!',
      });

      expect(response.status).toBe(400);
      expect(response.data.error.code).toBe('INVALID_TOKEN');
    });

    it('should reject weak password in reset', async () => {
      // Create another reset token
      const tokenPlain = 'test-reset-weak-' + Date.now();
      const tokenHash = hashToken(tokenPlain);
      
      await prisma.passwordResetToken.create({
        data: {
          userId: testUserId,
          tokenHash,
          expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        },
      });

      const response = await apiRequest('POST', '/api/auth/reset-password', {
        token: tokenPlain,
        password: 'weak',
      });

      expect(response.status).toBe(400);
      expect(response.data.error.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'password',
            message: expect.stringContaining('at least 8 characters')
          })
        ])
      );
    });

    it('should reject expired token', async () => {
      // Create an expired reset token
      const expiredTokenPlain = 'expired-token-' + Date.now();
      const expiredTokenHash = hashToken(expiredTokenPlain);
      
      await prisma.passwordResetToken.create({
        data: {
          userId: testUserId,
          tokenHash: expiredTokenHash,
          expiresAt: new Date(Date.now() - 60 * 1000), // 1 minute ago
        },
      });

      const response = await apiRequest('POST', '/api/auth/reset-password', {
        token: expiredTokenPlain,
        password: 'ValidPassword789!',
      });

      expect(response.status).toBe(400);
      expect(response.data.error.code).toBe('INVALID_TOKEN');
    });
  });
});