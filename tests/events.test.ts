/**
 * Events API Tests
 * 
 * Tests the events CRUD operations:
 * 1. Create event
 * 2. Get event by ID
 * 3. List events
 * 4. Update event
 * 5. Publish event
 * 6. Delete event
 */

import { apiRequest, testEmail, prisma } from './setup';
import { hashToken } from '@/lib/auth';

describe('Events API', () => {
  let testUserEmail: string;
  let accessToken: string;
  let userId: string;
  let eventId: string;
  let eventSlug: string;

  beforeAll(async () => {
    // Create a test user and get access token
    testUserEmail = testEmail('events');
    
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
      if (eventId) {
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

  describe('POST /api/events', () => {
    it('should create a new event', async () => {
      const eventData = {
        title: 'Test Event ' + Date.now(),
        description: 'This is a test event for our test suite',
        startTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 1 week from now
        endTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString(), // 2 hours later
        timezone: 'America/New_York',
        isOnline: false,
        location: {
          name: 'Test Venue',
          address: '123 Test Street',
        },
        privacy: 'PUBLIC',
        category: 'community',
      };

      const response = await apiRequest('POST', '/api/events', eventData, accessToken);

      expect(response.status).toBe(201);
      expect(response.data.data).toHaveProperty('id');
      expect(response.data.data).toHaveProperty('slug');
      expect(response.data.data.title).toBe(eventData.title);
      expect(response.data.data.status).toBe('DRAFT');

      eventId = response.data.data.id;
      eventSlug = response.data.data.slug;
    });

    it('should reject event creation without auth', async () => {
      const response = await apiRequest('POST', '/api/events', {
        title: 'Unauthorized Event',
        startTime: new Date().toISOString(),
      });

      expect(response.status).toBe(401);
    });

    it('should reject event with missing required fields', async () => {
      const response = await apiRequest('POST', '/api/events', {
        description: 'Missing title and startTime',
      }, accessToken);

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/events/[id]', () => {
    it('should get event by ID', async () => {
      const response = await apiRequest('GET', `/api/events/${eventId}`, undefined, accessToken);

      expect(response.status).toBe(200);
      expect(response.data.data.id).toBe(eventId);
      expect(response.data.data.slug).toBe(eventSlug);
    });

    it('should return 404 for non-existent event', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await apiRequest('GET', `/api/events/${fakeId}`);

      expect(response.status).toBe(404);
    });
  });

  describe('PATCH /api/events/[id]', () => {
    it('should update event', async () => {
      const updateData = {
        title: 'Updated Test Event',
        description: 'Updated description',
      };

      const response = await apiRequest('PATCH', `/api/events/${eventId}`, updateData, accessToken);

      expect(response.status).toBe(200);
      expect(response.data.data.title).toBe(updateData.title);
      // Note: API returns minimal response (id, slug, title, status)
      // Verify description was updated by fetching the event
      const getResponse = await apiRequest('GET', `/api/events/${eventId}`, undefined, accessToken);
      expect(getResponse.data.data.description).toBe(updateData.description);
    });

    it('should reject update without auth', async () => {
      const response = await apiRequest('PATCH', `/api/events/${eventId}`, {
        title: 'Unauthorized Update',
      });

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/events/[id]/publish', () => {
    it('should publish event', async () => {
      const response = await apiRequest('POST', `/api/events/${eventId}/publish`, {}, accessToken);

      expect(response.status).toBe(200);
      expect(response.data.data.status).toBe('PUBLISHED');
    });
  });

  describe('GET /api/events', () => {
    it('should list published events', async () => {
      const response = await apiRequest('GET', '/api/events');

      expect(response.status).toBe(200);
      expect(response.data.data).toHaveProperty('events');
      expect(Array.isArray(response.data.data.events)).toBe(true);
    });

    it('should support pagination', async () => {
      const response = await apiRequest('GET', '/api/events?page=1&perPage=5');

      expect(response.status).toBe(200);
      expect(response.data.data).toHaveProperty('pagination');
      expect(response.data.data.pagination).toHaveProperty('page');
      expect(response.data.data.pagination).toHaveProperty('perPage');
    });
  });

  describe('DELETE /api/events/[id]', () => {
    it('should soft delete event', async () => {
      const response = await apiRequest('DELETE', `/api/events/${eventId}`, {}, accessToken);

      expect(response.status).toBe(200);
    });

    it('should not find deleted event', async () => {
      const response = await apiRequest('GET', `/api/events/${eventId}`);

      expect(response.status).toBe(404);
    });
  });
});
