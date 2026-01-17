/**
 * Authenticated Event Creation Tests
 * 
 * Tests the full flow of:
 * 1. Logging in via magic link
 * 2. Creating events with proper validation
 * 3. Category validation (lowercase values)
 * 4. Full event lifecycle with auth
 */

import { apiRequest, testEmail, prisma } from './setup';
import { hashToken } from '@/lib/auth';

describe('Authenticated Event Creation', () => {
  let testUserEmail: string;
  let accessToken: string;
  let userId: string;
  let createdEventId: string;

  beforeAll(async () => {
    // Create a test user and get access token
    testUserEmail = testEmail('event-auth');
    
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
    expect(response.status).toBe(200);
    accessToken = response.data.data.accessToken;
    userId = response.data.data.user.id;
  });

  afterAll(async () => {
    // Clean up test data
    try {
      if (createdEventId) {
        await prisma.event.delete({ where: { id: createdEventId } }).catch(() => {});
      }
      const user = await prisma.user.findUnique({ where: { email: testUserEmail } });
      if (user) {
        await prisma.event.deleteMany({ where: { organizerId: user.id } });
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

  describe('Login verification', () => {
    it('should have valid access token', async () => {
      const response = await apiRequest('GET', '/api/auth/me', undefined, accessToken);
      expect(response.status).toBe(200);
      expect(response.data.data.id).toBe(userId);
    });
  });

  describe('Event creation with valid data', () => {
    it('should create event with all required fields', async () => {
      const eventData = {
        title: 'Auth Test Event ' + Date.now(),
        description: 'Testing event creation when authenticated',
        startTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        timezone: 'America/New_York',
        isOnline: true,
        privacy: 'PUBLIC',
      };

      const response = await apiRequest('POST', '/api/events', eventData, accessToken);

      expect(response.status).toBe(201);
      expect(response.data.data).toHaveProperty('id');
      expect(response.data.data).toHaveProperty('slug');
      expect(response.data.data.title).toBe(eventData.title);
      
      createdEventId = response.data.data.id;
    });

    it('should create event with lowercase category', async () => {
      const eventData = {
        title: 'Music Event ' + Date.now(),
        startTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        timezone: 'America/New_York',
        isOnline: true,
        privacy: 'PUBLIC',
        category: 'music', // lowercase as required by API
      };

      const response = await apiRequest('POST', '/api/events', eventData, accessToken);

      expect(response.status).toBe(201);
      
      // Verify the category was stored correctly by fetching the event
      const eventId = response.data.data.id;
      const getResponse = await apiRequest('GET', `/api/events/${eventId}`);
      expect(getResponse.data.data.category).toBe('music');

      // Clean up
      await prisma.event.delete({ where: { id: eventId } }).catch(() => {});
    });

    it('should create event with location object', async () => {
      const eventData = {
        title: 'In-Person Event ' + Date.now(),
        startTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        timezone: 'America/New_York',
        isOnline: false,
        location: {
          name: 'Test Venue',
          address: '123 Test Street, City',
        },
        privacy: 'PUBLIC',
        category: 'community',
      };

      const response = await apiRequest('POST', '/api/events', eventData, accessToken);

      expect(response.status).toBe(201);
      
      // Clean up
      await prisma.event.delete({ where: { id: response.data.data.id } }).catch(() => {});
    });
  });

  describe('Event creation validation failures', () => {
    it('should reject event without auth', async () => {
      const eventData = {
        title: 'Unauthorized Event',
        startTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        timezone: 'America/New_York',
      };

      const response = await apiRequest('POST', '/api/events', eventData);

      expect(response.status).toBe(401);
    });

    it('should reject event with invalid category (uppercase)', async () => {
      const eventData = {
        title: 'Bad Category Event',
        startTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        timezone: 'America/New_York',
        isOnline: true,
        privacy: 'PUBLIC',
        category: 'MUSIC', // uppercase should fail
      };

      const response = await apiRequest('POST', '/api/events', eventData, accessToken);

      expect(response.status).toBe(400);
      expect(response.data.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject event with invalid category value', async () => {
      const eventData = {
        title: 'Invalid Category Event',
        startTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        timezone: 'America/New_York',
        isOnline: true,
        privacy: 'PUBLIC',
        category: 'invalid-category',
      };

      const response = await apiRequest('POST', '/api/events', eventData, accessToken);

      expect(response.status).toBe(400);
    });

    it('should reject event without title', async () => {
      const eventData = {
        startTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        timezone: 'America/New_York',
      };

      const response = await apiRequest('POST', '/api/events', eventData, accessToken);

      expect(response.status).toBe(400);
    });

    it('should reject event without timezone', async () => {
      const eventData = {
        title: 'No Timezone Event',
        startTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      };

      const response = await apiRequest('POST', '/api/events', eventData, accessToken);

      expect(response.status).toBe(400);
    });
  });

  describe('Full event lifecycle', () => {
    let eventId: string;
    let eventSlug: string;

    it('should create event', async () => {
      const eventData = {
        title: 'Lifecycle Test Event ' + Date.now(),
        description: 'Testing full event lifecycle',
        startTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        endTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString(),
        timezone: 'America/New_York',
        isOnline: true,
        onlineUrl: 'https://zoom.us/j/123456789',
        privacy: 'PUBLIC',
        category: 'networking',
        allowPlusOnes: true,
        maxPlusOnes: 2,
      };

      const response = await apiRequest('POST', '/api/events', eventData, accessToken);

      expect(response.status).toBe(201);
      eventId = response.data.data.id;
      eventSlug = response.data.data.slug;
    });

    it('should get created event', async () => {
      const response = await apiRequest('GET', `/api/events/${eventId}`, undefined, accessToken);

      expect(response.status).toBe(200);
      expect(response.data.data.id).toBe(eventId);
    });

    it('should update event', async () => {
      const response = await apiRequest('PATCH', `/api/events/${eventId}`, {
        title: 'Updated Lifecycle Event',
      }, accessToken);

      expect(response.status).toBe(200);
      expect(response.data.data.title).toBe('Updated Lifecycle Event');
    });

    it('should publish event', async () => {
      const response = await apiRequest('POST', `/api/events/${eventId}/publish`, {}, accessToken);

      expect(response.status).toBe(200);
      expect(response.data.data.status).toBe('PUBLISHED');
    });

    it('should delete event', async () => {
      const response = await apiRequest('DELETE', `/api/events/${eventId}`, {}, accessToken);

      expect(response.status).toBe(200);
    });
  });
});
