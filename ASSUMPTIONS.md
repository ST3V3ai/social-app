# Assumptions & Design Decisions

This document outlines the key assumptions and design decisions made during the development of Gather.

## Architecture Decisions

### 1. Magic Link Authentication
**Decision**: Use magic link (passwordless) authentication instead of password-based auth.

**Rationale**:
- Eliminates password-related security vulnerabilities (weak passwords, password reuse, credential stuffing)
- Better UX for casual users who may not use the platform frequently
- Aligns with modern authentication patterns (Slack, Notion, etc.)

**Trade-offs**:
- Users must have access to their email to log in
- Slightly longer initial login flow

### 2. JWT + Refresh Token Pattern
**Decision**: Short-lived access tokens (15 min) with long-lived refresh tokens (30 days).

**Rationale**:
- Access tokens are stateless and fast to verify
- Short expiry limits the window of vulnerability if token is compromised
- Refresh tokens allow seamless re-authentication
- Session revocation is possible by deleting refresh tokens from database

### 3. Next.js App Router
**Decision**: Use Next.js 14 with App Router instead of Pages Router.

**Rationale**:
- Server Components reduce client-side JavaScript
- Improved data fetching with async components
- Better streaming and loading states
- Modern patterns for layouts and templates

### 4. Prisma ORM
**Decision**: Use Prisma instead of raw SQL or other ORMs.

**Rationale**:
- Type-safe database queries
- Excellent migration system
- Prisma Studio for database management
- Good fit with TypeScript ecosystem

### 5. Redis for Sessions & Rate Limiting
**Decision**: Use Redis for session storage and rate limiting.

**Rationale**:
- Fast key-value lookups for session verification
- Built-in TTL support for automatic session expiration
- Atomic operations for rate limiting counters
- Horizontally scalable

## Data Model Decisions

### 1. Event Slugs
**Decision**: Events are accessed by URL-friendly slugs, not UUIDs.

**Rationale**:
- Better SEO and shareability (`/e/my-birthday-party` vs `/e/550e8400-e29b...`)
- More memorable URLs for users
- UUIDs still stored as primary key for internal references

### 2. Soft Deletes
**Decision**: Deleted events use `deletedAt` timestamp instead of hard delete.

**Rationale**:
- Preserve referential integrity
- Allow recovery of accidentally deleted content
- Maintain audit trail
- RSVPs and other related data remain intact

### 3. Profile as Separate Model
**Decision**: User profile data is stored in a separate `Profile` table.

**Rationale**:
- Cleaner separation of auth data vs profile data
- Profile data can be updated without touching auth records
- Easier to add optional profile fields
- One-to-one relationship maintains simplicity

### 4. RSVP Status Enum
**Decision**: Use GOING, MAYBE, NOT_GOING, WAITLIST statuses.

**Rationale**:
- Matches familiar patterns from existing platforms
- WAITLIST is separate status to track capacity management
- Approved field handles invite-only events separately

### 5. Event Privacy Levels
**Decision**: Three privacy levels - PUBLIC, UNLISTED, PRIVATE.

**Rationale**:
- PUBLIC: Discoverable and accessible by anyone
- UNLISTED: Accessible with link but not in search/discovery
- PRIVATE: Invite-only, requires authentication and RSVP/invite

## API Design Decisions

### 1. Consistent Response Format
**Decision**: All API responses use `{ success: boolean, data?: T, error?: { code, message } }`.

**Rationale**:
- Predictable structure for frontend error handling
- Easy to add metadata fields if needed
- Clear distinction between successful and error responses

### 2. Zod for Validation
**Decision**: Use Zod schemas for all input validation.

**Rationale**:
- Type inference from schemas
- Rich validation primitives (email, UUID, etc.)
- Consistent error message format
- Runtime type safety

### 3. RESTful API Design
**Decision**: Follow REST conventions for API routes.

**Rationale**:
- Familiar patterns for developers
- Works well with HTTP caching
- Clear resource hierarchy
- Standard HTTP methods and status codes

### 4. Pagination
**Decision**: Offset-based pagination with page/limit parameters.

**Rationale**:
- Simple to implement and understand
- Works for most use cases
- Easy to navigate to specific pages
- Trade-off: less efficient for very large datasets (cursor-based would be better)

## Security Assumptions

### 1. Email Verification
**Assumption**: Users who click magic links have access to the associated email.

**Mitigation**: 
- Magic links expire in 15 minutes
- Single-use tokens
- Email includes warning about unexpected links

### 2. Trust Model
**Assumption**: Authenticated users are who they claim to be.

**Implementation**:
- JWT verification on every request
- Role-based access control
- Server-side permission checks

### 3. Data Exposure
**Assumption**: Users should only see data they're authorized to access.

**Implementation**:
- Privacy checks on event viewing
- Host/co-host verification for management
- Guest list visibility controls
- Admin-only moderation endpoints

## Performance Assumptions

### 1. Event Scale
**Assumption**: Most events have fewer than 1,000 attendees.

**Implication**: 
- In-memory guest list rendering is acceptable
- No specialized large-event infrastructure needed
- RSVP counts can be calculated without caching

### 2. Search Scale
**Assumption**: Full-text search can use PostgreSQL's built-in capabilities.

**Implication**:
- No external search service (Elasticsearch, Algolia) needed for v1
- ILIKE queries with proper indexing are sufficient

### 3. Real-time Requirements
**Assumption**: Near-real-time is acceptable; sub-second updates not required.

**Implication**:
- React Query refetching is sufficient
- No WebSocket implementation for v1
- Background job processing can have seconds of delay

## Scope Limitations

### 1. Not Implemented (Out of Scope for v1)
- Image upload (referenced by URL only)
- Push notifications
- Real-time WebSocket updates
- Calendar integrations (OAuth)
- Payment processing
- Recurring event editing (only creation)
- Mobile app

### 2. Deferred Decisions
- Analytics/metrics collection
- A/B testing infrastructure  
- CDN configuration
- Production monitoring/alerting

## Environment Assumptions

### 1. Development Environment
- Docker available for local database
- Node.js 18+ installed
- Access to email for magic link testing (or console logging in dev)

### 2. Production Environment
- PostgreSQL database available
- Redis instance available
- SMTP/email service configured (Resend)
- HTTPS termination at load balancer level
