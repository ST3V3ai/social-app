/**
 * Profile & Settings API Tests
 * 
 * Tests:
 * 1. Get user profile
 * 2. Update profile (display name, bio, etc.)
 * 3. New users get display name from email prefix
 */

import { apiRequest, testEmail, prisma } from './setup';
import { hashToken } from '@/lib/auth';

describe('Profile & Settings API', () => {
  let testUserEmail: string;
  let accessToken: string;
  let userId: string;

  beforeAll(async () => {
    // Create a test user and get access token
    testUserEmail = testEmail('profile');
    
    const crypto = await import('crypto');
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashToken(token);
    
    await prisma.magicLinkToken.create({
      data: {
        email: testUserEmail,
        tokenHash,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      },
    });

    const response = await apiRequest('POST', '/api/auth/verify', { token });
    accessToken = response.data.data.accessToken;
    userId = response.data.data.user.id;
  });

  afterAll(async () => {
    // Clean up test data
    try {
      const user = await prisma.user.findUnique({ where: { email: testUserEmail } });
      if (user) {
        await prisma.magicLinkToken.deleteMany({ where: { email: testUserEmail } });
        await prisma.session.deleteMany({ where: { userId: user.id } });
        await prisma.profile.deleteMany({ where: { userId: user.id } });
        await prisma.user.delete({ where: { id: user.id } });
      }
    } catch (e) {
      console.log('Cleanup error:', e);
    }
    await prisma.$disconnect();
  });

  describe('GET /api/users/[id]', () => {
    it('should get user profile', async () => {
      const response = await apiRequest('GET', `/api/users/${userId}`, undefined, accessToken);

      expect(response.status).toBe(200);
      expect(response.data.data.id).toBe(userId);
      expect(response.data.data).toHaveProperty('displayName');
      expect(response.data.data).toHaveProperty('email'); // Own profile should include email
    });

    it('should return 404 for non-existent user', async () => {
      const response = await apiRequest('GET', '/api/users/00000000-0000-0000-0000-000000000000');

      expect(response.status).toBe(404);
    });
  });

  describe('PATCH /api/users/[id]', () => {
    it('should update display name', async () => {
      const response = await apiRequest('PATCH', `/api/users/${userId}`, {
        displayName: 'Updated Name',
      }, accessToken);

      expect(response.status).toBe(200);
      expect(response.data.data.displayName).toBe('Updated Name');
    });

    it('should update bio', async () => {
      const response = await apiRequest('PATCH', `/api/users/${userId}`, {
        bio: 'This is my test bio',
      }, accessToken);

      expect(response.status).toBe(200);
      expect(response.data.data.bio).toBe('This is my test bio');
    });

    it('should update multiple fields', async () => {
      const response = await apiRequest('PATCH', `/api/users/${userId}`, {
        displayName: 'New Name',
        bio: 'New bio',
        locationCity: 'New York',
      }, accessToken);

      expect(response.status).toBe(200);
      expect(response.data.data.displayName).toBe('New Name');
      expect(response.data.data.bio).toBe('New bio');
    });

    it('should reject update without auth', async () => {
      const response = await apiRequest('PATCH', `/api/users/${userId}`, {
        displayName: 'Unauthorized Update',
      });

      expect(response.status).toBe(401);
    });

    it('should reject updating another user profile', async () => {
      const response = await apiRequest('PATCH', '/api/users/00000000-0000-0000-0000-000000000000', {
        displayName: 'Hacked Name',
      }, accessToken);

      expect(response.status).toBe(403);
    });
  });

  describe('New user display name from email', () => {
    it('should set display name from email prefix for new users', async () => {
      // Create a new user with a formatted email
      const newEmail = 'john.doe.test@example.com';
      
      const crypto = await import('crypto');
      const token = crypto.randomBytes(32).toString('hex');
      const tokenHash = hashToken(token);
      
      await prisma.magicLinkToken.create({
        data: {
          email: newEmail,
          tokenHash,
          expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        },
      });

      const response = await apiRequest('POST', '/api/auth/verify', { token });
      expect(response.status).toBe(200);
      
      const newUserId = response.data.data.user.id;
      
      // Check the profile
      const profileResponse = await apiRequest('GET', `/api/users/${newUserId}`, undefined, response.data.data.accessToken);
      expect(profileResponse.status).toBe(200);
      // Email prefix "john.doe.test" should become "John Doe Test"
      expect(profileResponse.data.data.displayName).toBe('John Doe Test');

      // Clean up
      const user = await prisma.user.findUnique({ where: { email: newEmail } });
      if (user) {
        await prisma.magicLinkToken.deleteMany({ where: { email: newEmail } });
        await prisma.session.deleteMany({ where: { userId: user.id } });
        await prisma.profile.deleteMany({ where: { userId: user.id } });
        await prisma.user.delete({ where: { id: user.id } });
      }
    });
  });
});
