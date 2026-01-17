/**
 * RSVP API Tests
 * 
 * Tests the RSVP operations:
 * 1. Create RSVP
 * 2. Update RSVP
 * 3. Get user's RSVP
 * 4. List event RSVPs
 * 5. Cancel RSVP
 */

import { apiRequest, testEmail, prisma } from './setup';
import { hashToken } from '@/lib/auth';

describe('RSVP API', () => {
  let testUserEmail: string;
  let accessToken: string;
  let userId: string;
  let eventId: string;

  beforeAll(async () => {
    // Create a test user
    testUserEmail = testEmail('rsvp');
    
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

    const authResponse = await apiRequest('POST', '/api/auth/verify', { token });
    accessToken = authResponse.data.data.accessToken;
    userId = authResponse.data.data.user.id;

    // Create a test event
    const eventResponse = await apiRequest('POST', '/api/events', {
      title: 'RSVP Test Event ' + Date.now(),
      description: 'Event for testing RSVPs',
      startTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      timezone: 'America/New_York',
      isOnline: true,
      privacy: 'PUBLIC',
      category: 'community',
    }, accessToken);
    
    eventId = eventResponse.data.data.id;

    // Publish the event
    await apiRequest('POST', `/api/events/${eventId}/publish`, {}, accessToken);
  });

  afterAll(async () => {
    // Clean up
    try {
      if (eventId) {
        await prisma.rsvp.deleteMany({ where: { eventId } });
        await prisma.event.delete({ where: { id: eventId } }).catch(() => {});
      }
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

  describe('POST /api/events/[id]/rsvp', () => {
    it('should create RSVP with GOING status', async () => {
      const response = await apiRequest('POST', `/api/events/${eventId}/rsvp`, {
        status: 'GOING',
        plusOnes: 0,
      }, accessToken);

      expect(response.status).toBe(200);
      expect(response.data.data).toHaveProperty('id');
      expect(response.data.data.status).toBe('GOING');
    });

    it('should update RSVP to MAYBE status', async () => {
      const response = await apiRequest('POST', `/api/events/${eventId}/rsvp`, {
        status: 'MAYBE',
        plusOnes: 0,
      }, accessToken);

      expect(response.status).toBe(200);
      expect(response.data.data.status).toBe('MAYBE');
    });

    it('should reject RSVP without auth', async () => {
      const response = await apiRequest('POST', `/api/events/${eventId}/rsvp`, {
        status: 'GOING',
      });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/events/[id]/rsvps', () => {
    it('should list event RSVPs', async () => {
      const response = await apiRequest('GET', `/api/events/${eventId}/rsvps`);

      expect(response.status).toBe(200);
      expect(response.data.data).toHaveProperty('rsvps');
      // RSVPs are grouped by status (going, maybe, notGoing, waitlist)
      expect(response.data.data.rsvps).toHaveProperty('going');
      expect(response.data.data.rsvps).toHaveProperty('maybe');
      expect(response.data.data).toHaveProperty('counts');
    });
  });

  describe('DELETE /api/events/[id]/rsvp', () => {
    it('should cancel RSVP', async () => {
      const response = await apiRequest('DELETE', `/api/events/${eventId}/rsvp`, {}, accessToken);

      expect(response.status).toBe(200);
    });

    it('should return 404 when canceling non-existent RSVP', async () => {
      const response = await apiRequest('DELETE', `/api/events/${eventId}/rsvp`, {}, accessToken);

      expect(response.status).toBe(404);
    });
  });
});
