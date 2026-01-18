/**
 * Comprehensive End-to-End Flow Tests
 * 
 * Tests the complete user journey through the application:
 * - Event creation and viewing by slug
 * - Event editing and deletion
 * - Join links and invitations
 * - RSVP flows
 */

import { prisma, apiRequest, testEmail, BASE_URL } from './setup';
import { hashToken } from '@/lib/auth';

// Create a test user with magic link and return credentials
async function createTestUser(prefix: string): Promise<{ id: string; email: string; token: string }> {
  const email = testEmail(prefix);
  const crypto = await import('crypto');
  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(token);

  await prisma.magicLinkToken.create({
    data: {
      email,
      tokenHash,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    },
  });

  const response = await apiRequest('POST', '/api/auth/verify', { token });
  return {
    id: response.data.data.user.id,
    email,
    token: response.data.data.accessToken,
  };
}

// Test user credentials
let testUser: { id: string; email: string; token: string } | null = null;
let testEvent: { id: string; slug: string } | null = null;

describe('End-to-End Flow Tests', () => {
  beforeAll(async () => {
    testUser = await createTestUser('e2e');
  });

  afterAll(async () => {
    // Cleanup test data
    if (testEvent) {
      await prisma.event.deleteMany({ where: { id: testEvent.id } }).catch(() => {});
    }
    if (testUser) {
      await prisma.session.deleteMany({ where: { userId: testUser.id } }).catch(() => {});
      await prisma.magicLinkToken.deleteMany({ where: { email: testUser.email } }).catch(() => {});
      await prisma.profile.deleteMany({ where: { userId: testUser.id } }).catch(() => {});
      await prisma.user.deleteMany({ where: { id: testUser.id } }).catch(() => {});
    }
  });

  describe('Event Creation Flow', () => {
    it('should create an event with all required fields', async () => {
      const eventData = {
        title: 'E2E Test Event ' + Date.now(),
        description: 'This is a test event for E2E testing',
        startTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        timezone: 'America/New_York',
        isOnline: false,
        location: {
          name: 'Test Venue',
          address: '123 Test Street, Test City',
        },
        privacy: 'PUBLIC',
        category: 'community',
      };

      const response = await apiRequest('POST', '/api/events', eventData, testUser!.token);

      expect(response.status).toBe(201);
      expect(response.data.data).toHaveProperty('id');
      expect(response.data.data).toHaveProperty('slug');
      expect(response.data.data.title).toBe(eventData.title);

      testEvent = {
        id: response.data.data.id,
        slug: response.data.data.slug,
      };
    });

    it('should publish the event', async () => {
      const response = await apiRequest(
        'POST',
        `/api/events/${testEvent!.id}/publish`,
        {},
        testUser!.token
      );

      expect(response.status).toBe(200);
      expect(response.data.data.status).toBe('PUBLISHED');
    });
  });

  describe('Event Viewing by Slug', () => {
    it('should get event by UUID', async () => {
      const response = await apiRequest('GET', `/api/events/${testEvent!.id}`);

      expect(response.status).toBe(200);
      expect(response.data.data.id).toBe(testEvent!.id);
      expect(response.data.data.slug).toBe(testEvent!.slug);
    });

    it('should get event by slug', async () => {
      const response = await apiRequest('GET', `/api/events/${testEvent!.slug}`);

      expect(response.status).toBe(200);
      expect(response.data.data.id).toBe(testEvent!.id);
      expect(response.data.data.slug).toBe(testEvent!.slug);
    });

    it('should return 404 for non-existent slug', async () => {
      const response = await apiRequest('GET', '/api/events/non-existent-slug-12345');

      expect(response.status).toBe(404);
    });
  });

  describe('Event RSVP Flow', () => {
    let secondUser: { id: string; email: string; token: string } | null = null;

    beforeAll(async () => {
      secondUser = await createTestUser('rsvp');
    });

    afterAll(async () => {
      if (secondUser) {
        await prisma.rsvp.deleteMany({ where: { userId: secondUser.id } }).catch(() => {});
        await prisma.session.deleteMany({ where: { userId: secondUser.id } }).catch(() => {});
        await prisma.magicLinkToken.deleteMany({ where: { email: secondUser.email } }).catch(() => {});
        await prisma.profile.deleteMany({ where: { userId: secondUser.id } }).catch(() => {});
        await prisma.user.deleteMany({ where: { id: secondUser.id } }).catch(() => {});
      }
    });

    it('should RSVP by event slug', async () => {
      const response = await apiRequest(
        'POST',
        `/api/events/${testEvent!.slug}/rsvp`,
        { status: 'GOING', plusOnes: 0 },
        secondUser!.token
      );

      expect(response.status).toBe(200);
      expect(response.data.data.status).toBe('GOING');
    });

    it('should get RSVP by event slug', async () => {
      const response = await apiRequest(
        'GET',
        `/api/events/${testEvent!.slug}/rsvp`,
        undefined,
        secondUser!.token
      );

      expect(response.status).toBe(200);
      expect(response.data.data.rsvp.status).toBe('GOING');
    });

    it('should list RSVPs by event slug', async () => {
      const response = await apiRequest(
        'GET',
        `/api/events/${testEvent!.slug}/rsvps`,
        undefined,
        testUser!.token
      );

      expect(response.status).toBe(200);
      expect(response.data.data.rsvps.going.length).toBeGreaterThanOrEqual(1);
    });

    it('should update RSVP to MAYBE', async () => {
      const response = await apiRequest(
        'POST',
        `/api/events/${testEvent!.slug}/rsvp`,
        { status: 'MAYBE', plusOnes: 0 },
        secondUser!.token
      );

      expect(response.status).toBe(200);
      expect(response.data.data.status).toBe('MAYBE');
    });

    it('should cancel RSVP by event slug', async () => {
      const response = await apiRequest(
        'DELETE',
        `/api/events/${testEvent!.slug}/rsvp`,
        undefined,
        secondUser!.token
      );

      expect(response.status).toBe(200);
    });
  });

  describe('Event Edit Flow', () => {
    it('should update event by slug', async () => {
      const response = await apiRequest(
        'PATCH',
        `/api/events/${testEvent!.slug}`,
        { description: 'Updated description for E2E test' },
        testUser!.token
      );

      expect(response.status).toBe(200);
    });

    it('should update event time (triggers notification)', async () => {
      const newTime = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
      const response = await apiRequest(
        'PATCH',
        `/api/events/${testEvent!.slug}`,
        { startTime: newTime },
        testUser!.token
      );

      expect(response.status).toBe(200);
    });

    it('should update event location (triggers notification)', async () => {
      const response = await apiRequest(
        'PATCH',
        `/api/events/${testEvent!.slug}`,
        { 
          location: {
            name: 'New Venue',
            address: '456 New Street, New City',
          }
        },
        testUser!.token
      );

      expect(response.status).toBe(200);
    });

    it('should reject update from non-organizer', async () => {
      // Create another user
      const otherUser = await createTestUser('other');

      const response = await apiRequest(
        'PATCH',
        `/api/events/${testEvent!.slug}`,
        { description: 'Unauthorized update' },
        otherUser.token
      );

      expect(response.status).toBe(403);

      // Cleanup
      await prisma.session.deleteMany({ where: { userId: otherUser.id } });
      await prisma.magicLinkToken.deleteMany({ where: { email: otherUser.email } });
      await prisma.profile.deleteMany({ where: { userId: otherUser.id } });
      await prisma.user.deleteMany({ where: { id: otherUser.id } });
    });
  });

  describe('Event Publish Flow by Slug', () => {
    let draftEvent: { id: string; slug: string } | null = null;
    let publishUser: { id: string; email: string; token: string } | null = null;

    beforeAll(async () => {
      publishUser = await createTestUser('publish-flow');
    });

    afterAll(async () => {
      if (draftEvent) {
        await prisma.event.deleteMany({ where: { id: draftEvent.id } }).catch(() => {});
      }
      if (publishUser) {
        await prisma.session.deleteMany({ where: { userId: publishUser.id } });
        await prisma.magicLinkToken.deleteMany({ where: { email: publishUser.email } });
        await prisma.profile.deleteMany({ where: { userId: publishUser.id } });
        await prisma.user.deleteMany({ where: { id: publishUser.id } });
      }
    });

    it('should publish event by slug', async () => {
      // Create a draft event
      const createResponse = await apiRequest(
        'POST',
        '/api/events',
        {
          title: 'Draft Event ' + Date.now(),
          startTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          timezone: 'America/New_York',
          isOnline: true,
          privacy: 'PUBLIC',
          category: 'community',
        },
        publishUser!.token
      );

      expect(createResponse.status).toBe(201);
      draftEvent = {
        id: createResponse.data.data.id,
        slug: createResponse.data.data.slug,
      };

      // Now publish it by slug
      const response = await apiRequest(
        'POST',
        `/api/events/${draftEvent.slug}/publish`,
        {},
        publishUser!.token
      );

      expect(response.status).toBe(200);
      expect(response.data.data.status).toBe('PUBLISHED');
    });
  });

  describe('Invitation Flow', () => {
    it('should send invitation for event by slug', async () => {
      const response = await apiRequest(
        'POST',
        `/api/events/${testEvent!.slug}/invites`,
        {
          recipients: [{ email: 'invite-test@example.com' }],
          type: 'STANDARD',
        },
        testUser!.token
      );

      expect(response.status).toBe(200);
      expect(response.data.data.sent + response.data.data.skipped + response.data.data.failed).toBeGreaterThanOrEqual(0);
    });

    it('should list invitations by slug', async () => {
      const response = await apiRequest(
        'GET',
        `/api/events/${testEvent!.slug}/invites`,
        undefined,
        testUser!.token
      );

      expect(response.status).toBe(200);
      expect(response.data.data).toHaveProperty('invites');
    });
  });

  describe('Event Posts Flow', () => {
    it('should create a post on event by slug', async () => {
      const response = await apiRequest(
        'POST',
        `/api/events/${testEvent!.slug}/posts`,
        {
          type: 'UPDATE',
          content: 'This is a test post for the event!',
        },
        testUser!.token
      );

      expect(response.status).toBe(201);
      expect(response.data.data).toHaveProperty('id');
    });

    it('should list posts by slug', async () => {
      const response = await apiRequest(
        'GET',
        `/api/events/${testEvent!.slug}/posts`
      );

      expect(response.status).toBe(200);
      expect(response.data.data.posts.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Event Delete Flow', () => {
    let deleteEvent: { id: string; slug: string } | null = null;

    beforeAll(async () => {
      // Create an event to delete
      const response = await apiRequest(
        'POST',
        '/api/events',
        {
          title: 'Event to Delete ' + Date.now(),
          startTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          timezone: 'America/New_York',
          isOnline: true,
          privacy: 'PUBLIC',
          category: 'music',
        },
        testUser!.token
      );

      deleteEvent = {
        id: response.data.data.id,
        slug: response.data.data.slug,
      };

      // Publish it
      await apiRequest(
        'POST',
        `/api/events/${deleteEvent.id}/publish`,
        {},
        testUser!.token
      );
    });

    it('should delete event by slug', async () => {
      const response = await apiRequest(
        'DELETE',
        `/api/events/${deleteEvent!.slug}`,
        undefined,
        testUser!.token
      );

      expect(response.status).toBe(200);
      expect(response.data.data.message).toBe('Event deleted');
    });

    it('should return 404 for deleted event', async () => {
      const response = await apiRequest('GET', `/api/events/${deleteEvent!.slug}`);

      expect(response.status).toBe(404);
    });
  });
});

describe('Join Link Flow', () => {
  it('should redirect /join/[token] to auth/verify', async () => {
    // Create a magic link
    const email = testEmail('join');
    const crypto = await import('crypto');
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashToken(token);

    await prisma.magicLinkToken.create({
      data: {
        email,
        tokenHash,
        expiresAt: new Date(Date.now() + 3600000),
      },
    });

    const response = await fetch(`${BASE_URL}/join/${token}`, {
      redirect: 'manual',
    });

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toContain('/auth/verify');

    // Cleanup
    await prisma.magicLinkToken.deleteMany({ where: { email } });
  });
});

describe('Error Handling', () => {
  it('should return 401 for protected routes without auth', async () => {
    const response = await apiRequest('POST', '/api/events', {
      title: 'Unauthorized Event',
      startTime: new Date().toISOString(),
      timezone: 'UTC',
      isOnline: true,
      privacy: 'PUBLIC',
      category: 'community',
    });

    expect(response.status).toBe(401);
  });

  it('should return 400 for invalid event data', async () => {
    const errorUser = await createTestUser('error');

    // Missing required fields
    const response = await apiRequest(
      'POST',
      '/api/events',
      { title: 'Incomplete Event' }, // Missing startTime, timezone, etc.
      errorUser.token
    );

    expect(response.status).toBe(400);

    // Cleanup
    await prisma.session.deleteMany({ where: { userId: errorUser.id } });
    await prisma.magicLinkToken.deleteMany({ where: { email: errorUser.email } });
    await prisma.profile.deleteMany({ where: { userId: errorUser.id } });
    await prisma.user.deleteMany({ where: { id: errorUser.id } });
  });

  it('should return 404 for non-existent event', async () => {
    const response = await apiRequest('GET', '/api/events/00000000-0000-0000-0000-000000000000');

    expect(response.status).toBe(404);
  });
});
