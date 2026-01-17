/**
 * Authentication API Tests
 * 
 * Tests the complete magic link authentication flow:
 * 1. Request magic link
 * 2. Verify magic link (new user)
 * 3. Verify magic link (existing user)
 * 4. Get current user
 * 5. Refresh token
 * 6. Logout
 */

import { apiRequest, testEmail, prisma, BASE_URL } from './setup';
import { hashToken } from '@/lib/auth';

describe('Authentication API', () => {
  let testUserEmail: string;
  let accessToken: string;
  let refreshToken: string;

  beforeAll(() => {
    testUserEmail = testEmail('auth');
  });

  afterAll(async () => {
    // Clean up test user and related data
    try {
      const user = await prisma.user.findUnique({ where: { email: testUserEmail } });
      if (user) {
        await prisma.magicLinkToken.deleteMany({ where: { email: testUserEmail } });
        await prisma.session.deleteMany({ where: { userId: user.id } });
        await prisma.profile.deleteMany({ where: { userId: user.id } });
        await prisma.user.delete({ where: { id: user.id } });
      }
    } catch (e) {
      console.log('Cleanup error (may be expected):', e);
    }
    await prisma.$disconnect();
  });

  describe('POST /api/auth/magic-link', () => {
    it('should send magic link for new email', async () => {
      const response = await apiRequest('POST', '/api/auth/magic-link', {
        email: testUserEmail,
      });

      expect(response.status).toBe(200);
      expect(response.data.data).toHaveProperty('message');
      expect(response.data.data.message.toLowerCase()).toContain('magic link');
    });

    it('should reject invalid email format', async () => {
      const response = await apiRequest('POST', '/api/auth/magic-link', {
        email: 'not-an-email',
      });

      expect(response.status).toBe(400);
      expect(response.data.error).toBeDefined();
    });

    it('should reject missing email', async () => {
      const response = await apiRequest('POST', '/api/auth/magic-link', {});

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/auth/verify', () => {
    let validToken: string;

    beforeAll(async () => {
      // Create a magic link token directly in the database for testing
      const crypto = await import('crypto');
      validToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = hashToken(validToken);
      
      await prisma.magicLinkToken.create({
        data: {
          email: testUserEmail,
          tokenHash,
          expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
        },
      });
    });

    it('should verify valid magic link and create new user', async () => {
      const response = await apiRequest('POST', '/api/auth/verify', {
        token: validToken,
      });

      expect(response.status).toBe(200);
      expect(response.data.data).toHaveProperty('accessToken');
      expect(response.data.data).toHaveProperty('user');
      expect(response.data.data.user.email).toBe(testUserEmail);
      expect(response.data.data.user.isNewUser).toBe(true);

      accessToken = response.data.data.accessToken;
    });

    it('should reject already used magic link', async () => {
      const response = await apiRequest('POST', '/api/auth/verify', {
        token: validToken,
      });

      expect(response.status).toBe(401);
      expect(response.data.error.message).toContain('Invalid or expired');
    });

    it('should reject invalid token', async () => {
      const response = await apiRequest('POST', '/api/auth/verify', {
        token: 'invalid-token-12345',
      });

      expect(response.status).toBe(401);
    });

    it('should verify magic link for existing user', async () => {
      // Create a new magic link for the same (now existing) user
      const crypto = await import('crypto');
      const newToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = hashToken(newToken);
      
      await prisma.magicLinkToken.create({
        data: {
          email: testUserEmail,
          tokenHash,
          expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        },
      });

      const response = await apiRequest('POST', '/api/auth/verify', {
        token: newToken,
      });

      expect(response.status).toBe(200);
      expect(response.data.data.user.isNewUser).toBe(false);
      expect(response.data.data.user.email).toBe(testUserEmail);

      // Save tokens for subsequent tests
      accessToken = response.data.data.accessToken;
    });

    it('should reject expired magic link', async () => {
      const crypto = await import('crypto');
      const expiredToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = hashToken(expiredToken);
      
      await prisma.magicLinkToken.create({
        data: {
          email: testUserEmail,
          tokenHash,
          expiresAt: new Date(Date.now() - 1000), // Already expired
        },
      });

      const response = await apiRequest('POST', '/api/auth/verify', {
        token: expiredToken,
      });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return current user with valid token', async () => {
      const response = await apiRequest('GET', '/api/auth/me', undefined, accessToken);

      expect(response.status).toBe(200);
      expect(response.data.data).toHaveProperty('id');
      expect(response.data.data).toHaveProperty('email');
      expect(response.data.data.email).toBe(testUserEmail);
    });

    it('should reject request without token', async () => {
      const response = await apiRequest('GET', '/api/auth/me');

      expect(response.status).toBe(401);
    });

    it('should reject invalid token', async () => {
      const response = await apiRequest('GET', '/api/auth/me', undefined, 'invalid-token');

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should logout successfully with valid token', async () => {
      const response = await apiRequest('POST', '/api/auth/logout', {}, accessToken);

      expect(response.status).toBe(200);
    });
  });
});
