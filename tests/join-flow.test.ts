/**
 * Magic Link Join Flow Test
 * 
 * End-to-end test simulating the complete user journey:
 * 1. New user requests magic link
 * 2. User clicks join link from email
 * 3. User is authenticated and redirected
 * 4. Existing user requests another magic link
 * 5. User clicks join link again
 * 6. User is authenticated (not as new user)
 */

import { apiRequest, testEmail, prisma, BASE_URL, clearRateLimits } from './setup';
import { hashToken } from '@/lib/auth';

describe('Magic Link Join Flow (E2E)', () => {
  let testUserEmail: string;
  let magicLinkToken: string;

  beforeAll(async () => {
    testUserEmail = testEmail('join-flow');
    // Clear rate limits to prevent 429 errors
    await clearRateLimits();
  });

  afterAll(async () => {
    // Clean up
    try {
      const user = await prisma.user.findUnique({ where: { email: testUserEmail } });
      if (user) {
        await prisma.magicLinkToken.deleteMany({ where: { email: testUserEmail } });
        await prisma.session.deleteMany({ where: { userId: user.id } });
        await prisma.profile.deleteMany({ where: { userId: user.id } });
        await prisma.user.delete({ where: { id: user.id } });
      } else {
        await prisma.magicLinkToken.deleteMany({ where: { email: testUserEmail } });
      }
    } catch (e) {
      console.log('Cleanup error:', e);
    }
    await prisma.$disconnect();
  });

  describe('New User Journey', () => {
    it('Step 1: Request magic link via email', async () => {
      const response = await apiRequest('POST', '/api/auth/magic-link', {
        email: testUserEmail,
      });

      expect(response.status).toBe(200);
      expect(response.data.data.message.toLowerCase()).toContain('magic link');

      // Get the token from database (simulating email click)
      const magicLink = await prisma.magicLinkToken.findFirst({
        where: { email: testUserEmail },
        orderBy: { createdAt: 'desc' },
      });
      
      expect(magicLink).not.toBeNull();
      // We need to get the raw token, but we only have the hash
      // In real scenario, the token is sent via email
    });

    it('Step 2: Verify magic link creates new user', async () => {
      // Create a fresh token for testing since we can't reverse the hash
      const crypto = await import('crypto');
      magicLinkToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = hashToken(magicLinkToken);
      
      await prisma.magicLinkToken.create({
        data: {
          email: testUserEmail,
          tokenHash,
          expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        },
      });

      // Simulate clicking the join link by calling verify
      const response = await apiRequest('POST', '/api/auth/verify', {
        token: magicLinkToken,
      });

      expect(response.status).toBe(200);
      expect(response.data.data.accessToken).toBeDefined();
      expect(response.data.data.user.email).toBe(testUserEmail);
      expect(response.data.data.user.isNewUser).toBe(true);
    });

    it('Step 3: User profile was created', async () => {
      const user = await prisma.user.findUnique({
        where: { email: testUserEmail },
        include: { profile: true },
      });

      expect(user).not.toBeNull();
      expect(user!.emailVerified).toBe(true);
      expect(user!.profile).not.toBeNull();
    });
  });

  describe('Existing User Journey', () => {
    it('Step 4: Request another magic link', async () => {
      const response = await apiRequest('POST', '/api/auth/magic-link', {
        email: testUserEmail,
      });

      expect(response.status).toBe(200);
    });

    it('Step 5: Verify magic link for existing user', async () => {
      // First, ensure the user exists by fetching from DB
      const existingUser = await prisma.user.findUnique({
        where: { email: testUserEmail },
      });
      expect(existingUser).not.toBeNull();
      
      // Create another token for the existing user
      const crypto = await import('crypto');
      const newToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = hashToken(newToken);
      
      // Link the userId this time to match what createMagicLink does
      await prisma.magicLinkToken.create({
        data: {
          email: testUserEmail,
          tokenHash,
          expiresAt: new Date(Date.now() + 15 * 60 * 1000),
          userId: existingUser!.id,
        },
      });

      const response = await apiRequest('POST', '/api/auth/verify', {
        token: newToken,
      });

      if (response.status !== 200) {
        console.log('Verify response:', response.data);
      }
      expect(response.status).toBe(200);
      expect(response.data.data.user.email).toBe(testUserEmail);
      expect(response.data.data.user.isNewUser).toBe(false);
    });
  });

  describe('Error Cases', () => {
    it('Should reject expired magic link', async () => {
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
      expect(response.data.error.message).toContain('Invalid or expired');
    });

    it('Should reject already used magic link', async () => {
      const crypto = await import('crypto');
      const usedToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = hashToken(usedToken);
      
      await prisma.magicLinkToken.create({
        data: {
          email: testUserEmail,
          tokenHash,
          expiresAt: new Date(Date.now() + 15 * 60 * 1000),
          usedAt: new Date(), // Already used
        },
      });

      const response = await apiRequest('POST', '/api/auth/verify', {
        token: usedToken,
      });

      expect(response.status).toBe(401);
    });

    it('Should reject invalid token', async () => {
      const response = await apiRequest('POST', '/api/auth/verify', {
        token: 'completely-invalid-token-that-does-not-exist',
      });

      expect(response.status).toBe(401);
    });
  });
});

describe('Join Link Redirect', () => {
  it('/join/[token] should redirect to /auth/verify?token=[token]', async () => {
    const testToken = 'test-redirect-token-12345';
    
    // Make a request to /join/[token] and check it redirects
    const response = await fetch(`${BASE_URL}/join/${testToken}`, {
      redirect: 'manual',
    });

    // Should be a redirect (307 or 308)
    expect([307, 308]).toContain(response.status);
    
    const location = response.headers.get('location');
    expect(location).toContain('/auth/verify');
    expect(location).toContain(`token=${testToken}`);
  });
});
