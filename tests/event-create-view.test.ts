/**
 * Event Creation and View Tests
 * 
 * Tests the event creation flow for authenticated users,
 * ensuring the event can be viewed immediately after creation.
 * This tests Issue #5 from FEATURES_TO_BUILD.md.
 */

import { apiRequest, testEmail, prisma, clearRateLimits } from './setup';
import { createMagicLink, verifyMagicLink, createSession } from '@/lib/auth';

describe('Event Creation and View Flow', () => {
  let userEmail: string;
  let userId: string;
  let accessToken: string;
  let createdEventId: string;
  let createdEventSlug: string;

  beforeAll(async () => {
    userEmail = testEmail('event-creator');
    await clearRateLimits();

    // Create user via magic link
    const { token } = await createMagicLink(userEmail);
    const result = await verifyMagicLink(token);
    expect(result).not.toBeNull();
    userId = result!.user.id;

    // Create session
    const session = await createSession(userId);
    accessToken = session.accessToken;
  });

  afterAll(async () => {
    // Clean up
    try {
      if (createdEventId) {
        await prisma.event.delete({ where: { id: createdEventId } });
      }
      const user = await prisma.user.findUnique({ where: { email: userEmail } });
      if (user) {
        await prisma.session.deleteMany({ where: { userId: user.id } });
        await prisma.magicLinkToken.deleteMany({ where: { email: userEmail } });
        await prisma.profile.deleteMany({ where: { userId: user.id } });
        await prisma.user.delete({ where: { id: user.id } });
      }
    } catch (e) {
      console.log('Cleanup error (may be expected):', e);
    }
    await prisma.$disconnect();
  });

  describe('POST /api/events', () => {
    it('should create an event and return slug', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7); // 1 week from now

      const response = await apiRequest('POST', '/api/events', {
        title: 'Test Event for View Flow',
        description: 'This is a test event to verify the create and view flow.',
        startTime: futureDate.toISOString(),
        timezone: 'America/New_York',
        isOnline: true,
        onlineUrl: 'https://zoom.us/test',
        privacy: 'PUBLIC',
      }, accessToken);

      expect(response.status).toBe(201);
      expect(response.data.data).toHaveProperty('id');
      expect(response.data.data).toHaveProperty('slug');
      expect(response.data.data.slug).toBeTruthy();
      expect(response.data.data.slug.length).toBeGreaterThan(0);

      createdEventId = response.data.data.id;
      createdEventSlug = response.data.data.slug;

      // Verify slug is URL-safe
      expect(createdEventSlug).toMatch(/^[a-z0-9-]+$/);
    });

    it('should persist event to database with correct slug', async () => {
      const event = await prisma.event.findUnique({
        where: { id: createdEventId },
      });

      expect(event).not.toBeNull();
      expect(event!.slug).toBe(createdEventSlug);
      expect(event!.title).toBe('Test Event for View Flow');
      expect(event!.status).toBe('DRAFT');
      expect(event!.organizerId).toBe(userId);
    });
  });

  describe('GET /api/events/:slug', () => {
    it('should retrieve event by slug immediately after creation', async () => {
      const response = await apiRequest('GET', `/api/events/${createdEventSlug}`, undefined, accessToken);

      expect(response.status).toBe(200);
      expect(response.data.data.id).toBe(createdEventId);
      expect(response.data.data.slug).toBe(createdEventSlug);
      expect(response.data.data.title).toBe('Test Event for View Flow');
    });

    it('should retrieve event by ID immediately after creation', async () => {
      const response = await apiRequest('GET', `/api/events/${createdEventId}`, undefined, accessToken);

      expect(response.status).toBe(200);
      expect(response.data.data.id).toBe(createdEventId);
      expect(response.data.data.slug).toBe(createdEventSlug);
    });

    it('should allow organizer to view their draft event', async () => {
      const response = await apiRequest('GET', `/api/events/${createdEventSlug}`, undefined, accessToken);

      expect(response.status).toBe(200);
      expect(response.data.data.status).toBe('DRAFT');
      expect(response.data.data.canManage).toBe(true);
    });

    it('should allow unauthenticated access to public events', async () => {
      // First publish the event
      await prisma.event.update({
        where: { id: createdEventId },
        data: { status: 'PUBLISHED', publishedAt: new Date() },
      });

      // Now try to access without auth
      const response = await apiRequest('GET', `/api/events/${createdEventSlug}`);

      expect(response.status).toBe(200);
      expect(response.data.data.id).toBe(createdEventId);
      expect(response.data.data.status).toBe('PUBLISHED');
    });
  });

  describe('Slug uniqueness', () => {
    it('should generate unique slugs for events with same title', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 14);

      // Create second event with same title
      const response = await apiRequest('POST', '/api/events', {
        title: 'Test Event for View Flow',
        description: 'Second event with same title.',
        startTime: futureDate.toISOString(),
        timezone: 'America/New_York',
        isOnline: true,
        onlineUrl: 'https://zoom.us/test2',
        privacy: 'PUBLIC',
      }, accessToken);

      expect(response.status).toBe(201);
      const secondSlug = response.data.data.slug;
      const secondId = response.data.data.id;

      // Slugs should be different
      expect(secondSlug).not.toBe(createdEventSlug);

      // Clean up second event
      await prisma.event.delete({ where: { id: secondId } });
    });
  });
});
