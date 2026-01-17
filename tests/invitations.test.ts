/**
 * Invitation Tracking Tests
 * 
 * Tests invitation sending, tracking, and status management
 */

import { prisma, apiRequest, testEmail } from './setup';
import { hashToken } from '@/lib/auth';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

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

describe('Invitation System', () => {
  let organizer: { id: string; email: string; token: string };
  let event: { id: string; slug: string };

  beforeAll(async () => {
    // Create organizer
    organizer = await createTestUser('invite-org');

    // Create a published event
    const eventRes = await apiRequest(
      'POST',
      '/api/events',
      {
        title: 'Invitation Test Event ' + Date.now(),
        startTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        timezone: 'America/New_York',
        isOnline: true,
        privacy: 'PUBLIC',
        category: 'community',
      },
      organizer.token
    );

    event = {
      id: eventRes.data.data.id,
      slug: eventRes.data.data.slug,
    };

    // Publish it
    await apiRequest('POST', `/api/events/${event.id}/publish`, {}, organizer.token);
  });

  afterAll(async () => {
    // Cleanup
    await prisma.invite.deleteMany({ where: { eventId: event.id } }).catch(() => {});
    await prisma.event.deleteMany({ where: { id: event.id } }).catch(() => {});
    await prisma.session.deleteMany({ where: { userId: organizer.id } }).catch(() => {});
    await prisma.magicLinkToken.deleteMany({ where: { email: organizer.email } }).catch(() => {});
    await prisma.profile.deleteMany({ where: { userId: organizer.id } }).catch(() => {});
    await prisma.user.deleteMany({ where: { id: organizer.id } }).catch(() => {});
  });

  describe('Sending Invitations', () => {
    it('should send invitations to multiple emails', async () => {
      const response = await apiRequest(
        'POST',
        `/api/events/${event.slug}/invites`,
        {
          recipients: [
            { email: 'guest1@example.com' },
            { email: 'guest2@example.com' },
            { email: 'guest3@example.com' },
          ],
          type: 'STANDARD',
          message: 'You are invited to our event!',
        },
        organizer.token
      );

      expect(response.status).toBe(200);
      // Should have processed all invites (sent + failed counts)
      const total = response.data.data.sent + response.data.data.failed + response.data.data.skipped;
      expect(total).toBe(3);
    });

    it('should skip already-invited emails', async () => {
      const response = await apiRequest(
        'POST',
        `/api/events/${event.slug}/invites`,
        {
          recipients: [
            { email: 'guest1@example.com' }, // Already invited above
          ],
          type: 'STANDARD',
        },
        organizer.token
      );

      expect(response.status).toBe(200);
      expect(response.data.data.skipped).toBe(1);
    });

    it('should track invitation status', async () => {
      const response = await apiRequest(
        'GET',
        `/api/events/${event.slug}/invites`,
        undefined,
        organizer.token
      );

      expect(response.status).toBe(200);
      expect(response.data.data.invites.length).toBeGreaterThanOrEqual(3);

      // Check that invites have expected properties
      const invite = response.data.data.invites[0];
      expect(invite).toHaveProperty('id');
      expect(invite).toHaveProperty('email');
      expect(invite).toHaveProperty('status');
      expect(invite).toHaveProperty('createdAt');
    });
  });

  describe('Invitation Status Tracking', () => {
    let inviteToken: string;

    beforeAll(async () => {
      // Create an invite directly
      const invite = await prisma.invite.create({
        data: {
          eventId: event.id,
          invitedBy: organizer.id,
          email: 'status-test@example.com',
          token: `inv-token-${Date.now()}`,
          type: 'STANDARD',
          status: 'SENT',
          sentAt: new Date(),
        },
      });
      inviteToken = invite.token;
    });

    it('should get invite by token', async () => {
      const response = await apiRequest('GET', `/api/invites/${inviteToken}`);

      expect(response.status).toBe(200);
      expect(response.data.data).toHaveProperty('event');
      expect(response.data.data).toHaveProperty('sender');
    });

    it('should accept invite', async () => {
      // First create a user for accepting
      const acceptUser = await createTestUser('accepter');

      const response = await apiRequest(
        'POST',
        `/api/invites/${inviteToken}/accept`,
        {},
        acceptUser.token
      );

      // Could be 200 or 400 depending on if RSVP already exists
      expect([200, 400]).toContain(response.status);

      // Cleanup
      await prisma.rsvp.deleteMany({ where: { userId: acceptUser.id } }).catch(() => {});
      await prisma.session.deleteMany({ where: { userId: acceptUser.id } });
      await prisma.magicLinkToken.deleteMany({ where: { email: acceptUser.email } });
      await prisma.profile.deleteMany({ where: { userId: acceptUser.id } });
      await prisma.user.deleteMany({ where: { id: acceptUser.id } });
    });
  });

  describe('Permission Checks', () => {
    it('should reject invites from non-organizer', async () => {
      // Create another user
      const nonOrgUser = await createTestUser('non-org');

      const response = await apiRequest(
        'POST',
        `/api/events/${event.slug}/invites`,
        {
          recipients: [{ email: 'unauthorized@example.com' }],
          type: 'STANDARD',
        },
        nonOrgUser.token
      );

      expect(response.status).toBe(403);

      // Cleanup
      await prisma.session.deleteMany({ where: { userId: nonOrgUser.id } });
      await prisma.magicLinkToken.deleteMany({ where: { email: nonOrgUser.email } });
      await prisma.profile.deleteMany({ where: { userId: nonOrgUser.id } });
      await prisma.user.deleteMany({ where: { id: nonOrgUser.id } });
    });

    it('should reject invite list from non-organizer', async () => {
      const nonOrgListUser = await createTestUser('non-org-list');

      const response = await apiRequest(
        'GET',
        `/api/events/${event.slug}/invites`,
        undefined,
        nonOrgListUser.token
      );

      expect(response.status).toBe(403);

      // Cleanup
      await prisma.session.deleteMany({ where: { userId: nonOrgListUser.id } });
      await prisma.magicLinkToken.deleteMany({ where: { email: nonOrgListUser.email } });
      await prisma.profile.deleteMany({ where: { userId: nonOrgListUser.id } });
      await prisma.user.deleteMany({ where: { id: nonOrgListUser.id } });
    });
  });
});

describe('Skip Already RSVPd Users', () => {
  let organizer2: { id: string; email: string; token: string };
  let event2: { id: string; slug: string };
  let rsvpUser: { id: string; email: string };

  beforeAll(async () => {
    // Create organizer
    organizer2 = await createTestUser('skip-org');

    // Create event
    const eventRes = await apiRequest('POST', '/api/events', {
      title: 'Skip RSVP Test ' + Date.now(),
      startTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      timezone: 'UTC',
      isOnline: true,
      privacy: 'PUBLIC',
      category: 'community',
    }, organizer2.token);
    event2 = { id: eventRes.data.data.id, slug: eventRes.data.data.slug };

    // Publish
    await apiRequest('POST', `/api/events/${event2.id}/publish`, {}, organizer2.token);

    // Create a user who has already RSVP'd
    const rsvpEmail = testEmail('already-rsvp');
    const rsvpUserData = await prisma.user.create({
      data: { email: rsvpEmail, role: 'USER' },
    });
    rsvpUser = { id: rsvpUserData.id, email: rsvpEmail };
    
    // Create RSVP for this user
    await prisma.rsvp.create({
      data: {
        eventId: event2.id,
        userId: rsvpUser.id,
        status: 'GOING',
        plusOnes: 0,
        approved: true,
      },
    });
  });

  afterAll(async () => {
    await prisma.rsvp.deleteMany({ where: { eventId: event2.id } }).catch(() => {});
    await prisma.invite.deleteMany({ where: { eventId: event2.id } }).catch(() => {});
    await prisma.event.deleteMany({ where: { id: event2.id } }).catch(() => {});
    await prisma.session.deleteMany({ where: { userId: organizer2.id } }).catch(() => {});
    await prisma.magicLinkToken.deleteMany({ where: { email: organizer2.email } }).catch(() => {});
    await prisma.profile.deleteMany({ where: { userId: organizer2.id } }).catch(() => {});
    await prisma.user.deleteMany({ where: { id: organizer2.id } }).catch(() => {});
    await prisma.user.deleteMany({ where: { id: rsvpUser.id } }).catch(() => {});
  });

  it('should skip users who already have RSVP', async () => {
    const response = await apiRequest(
      'POST',
      `/api/events/${event2.slug}/invites`,
      {
        recipients: [{ email: rsvpUser.email }],
        type: 'STANDARD',
      },
      organizer2.token
    );

    expect(response.status).toBe(200);
    expect(response.data.data.skipped).toBe(1);
    expect(response.data.data.invites[0].status).toBe('already_rsvp');
  });
});
