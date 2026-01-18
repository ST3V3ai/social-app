# Gather - Modern Event Platform

A full-stack event management platform built with Next.js 14, TypeScript, Prisma, and PostgreSQL. Gather is designed as a modern replacement for Facebook Events with a focus on simplicity, privacy, and real-time collaboration.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- Docker and Docker Compose
- npm or yarn

### Setup

1. **Clone and install dependencies**
   ```bash
   cd gather
   npm install
   ```

2. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` with your configuration:
   - `DATABASE_URL` - PostgreSQL connection string
   - `JWT_SECRET` - Secret key for JWT tokens (min 32 chars)
   - `RESEND_API_KEY` - (Optional) Resend.com API key for emails

3. **Start the database**
   ```bash
   docker-compose up -d
   ```

4. **Run database migrations**
   ```bash
   npx prisma migrate dev
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Open [http://localhost:32300](http://localhost:32300)**

## 🏗️ Architecture

### Tech Stack

- **Frontend**: Next.js 14 (App Router), React 18, TypeScript
- **Styling**: Tailwind CSS
- **Database**: PostgreSQL with Prisma ORM
- **Cache/Sessions**: Redis
- **Authentication**: Magic Link + JWT
- **Email**: Resend
- **State Management**: React Query (TanStack Query)

### Project Structure

```
gather/
├── prisma/
│   └── schema.prisma      # Database schema
├── src/
│   ├── app/               # Next.js App Router pages
│   │   ├── api/           # API routes
│   │   ├── e/[slug]/      # Event pages
│   │   ├── u/[id]/        # User profiles
│   │   └── ...
│   ├── components/        # React components
│   │   ├── events/        # Event-specific components
│   │   ├── layout/        # Layout components (Navbar, Footer)
│   │   ├── providers/     # Context providers
│   │   └── ui/            # Reusable UI primitives
│   └── lib/               # Shared utilities
│       ├── api.ts         # API middleware & helpers
│       ├── auth.ts        # Authentication logic
│       ├── db.ts          # Prisma client
│       ├── email.ts       # Email templates & sending
│       └── redis.ts       # Redis client
├── docker-compose.yml     # PostgreSQL + Redis containers
└── package.json
```

## 📋 Features

### Authentication
- Magic link email authentication (passwordless)
- JWT access tokens (15 min expiry)
- Refresh token rotation
- Session management

### Events
- Create, edit, delete events
- Public, unlisted, or private privacy settings
- Capacity limits with optional waitlist
- Plus-one support
- Cover images
- ICS calendar export

### RSVPs
- Going, Maybe, Not Going statuses
- Automatic waitlist management
- Approval workflow for private events
- Plus-one tracking

### Invites
- Email or link-based invitations
- VIP invites (bypass waitlist/capacity)
- Expiration dates
- Usage limits

### Communities
- Create communities for groups
- Member management
- Community-hosted events
- Public/private communities

### Social Features
- Event discussion posts
- Guest list visibility controls
- User profiles

### Admin/Moderation
- Content reporting system
- Admin report review
- User moderation tools

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/magic-link` - Request magic link
- `GET /api/auth/verify?token=...` - Verify magic link
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user

### Events
- `GET /api/events` - List events
- `POST /api/events` - Create event
- `GET /api/events/[id]` - Get event details
- `PATCH /api/events/[id]` - Update event
- `DELETE /api/events/[id]` - Delete event
- `POST /api/events/[id]/publish` - Publish draft
- `GET /api/events/[id]/ics` - Download ICS file

### RSVPs
- `POST /api/events/[id]/rsvp` - Create/update RSVP
- `GET /api/events/[id]/rsvps` - List RSVPs

### Invites
- `POST /api/events/[id]/invites` - Send invites
- `GET /api/invites/[token]` - Get invite details
- `POST /api/invites/[token]/accept` - Accept invite

### Communities
- `GET /api/communities` - List communities
- `POST /api/communities` - Create community
- `GET /api/communities/[id]` - Get community
- `POST /api/communities/[id]/join` - Join
- `POST /api/communities/[id]/leave` - Leave

### Search & Discovery
- `GET /api/search/events` - Search events
- `GET /api/discover/trending` - Trending events
- `GET /api/discover/upcoming` - Upcoming events

### Users
- `GET /api/users/[id]` - Get user profile
- `PATCH /api/users/[id]` - Update profile
- `GET /api/users/[id]/events` - User's events

### Reports
- `POST /api/reports` - Submit report
- `GET /api/admin/reports` - List reports (admin)
- `PATCH /api/admin/reports/[id]` - Update report (admin)

## 🧪 Development

### Running the Application

#### Prerequisites
Ensure Docker containers are running for PostgreSQL and Redis:
```bash
docker-compose up -d
```

Verify containers are running:
```bash
docker ps | grep gather
```

#### Local Environment Setup

Create a `.env.local` file for local development overrides:
```bash
# .env.local - local development overrides
PORT=32300
HOST=0.0.0.0
NEXT_PUBLIC_APP_URL="http://localhost:32300"
NEXT_PUBLIC_API_URL="http://localhost:32300/api"
```

This ensures the SSR fetch uses the correct local URL. Without this, event pages may return 404 after creation.

#### Development Mode
```bash
npm run dev
```
This starts the Next.js dev server with hot reload on http://localhost:32300 and binds to 0.0.0.0

#### Ensure server binds to port 32300 and host 0.0.0.0

The project is configured to always bind the dev and production servers to port 32300 and host 0.0.0.0. If that port is already in use, Next may auto-select a different port. To avoid surprises and ensure the app always runs on port 32300 and is reachable from other hosts, follow these steps:

- Start explicitly on port 32300 and host 0.0.0.0 (Linux/macOS):

```bash
# from the `gather` folder
PORT=32300 HOST=0.0.0.0 npm run dev
```

- If port 32300 is in use, find and stop the owning process (only stop processes you recognize):

```bash
# show the process using port 32300
lsof -i :32300 -sTCP:LISTEN -Pn

# if it's a stray local Next/Node process owned by you, stop it safely
# (replace <PID> with the process id from the previous command)
# make sure you inspect the command before killing
kill <PID>
```

- Alternative safe one-liner to locate common dev servers you started locally (will only show processes matching "node"/"next"):

```bash
ps aux | grep -E "node .*next|next dev|next start" | grep -v grep
# inspect the output; then kill the PID(s) you recognize
kill <PID>
```

Note: Avoid killing system processes or services you do not recognize. If a non-local process occupies port 32300 (for example, a Docker container or another service), stop that service with its proper tooling (docker, systemctl, etc.).

#### Production Mode
```bash
# Build the application first
npm run build

# Start the production server
npm start
```

#### Rebooting the Application

If the server stops responding or you need to restart:

```bash
# Method 1: Kill by port and restart
lsof -ti:32300 | xargs kill -9 2>/dev/null
npm start

# Method 2: Kill by process name and restart  
pkill -f "next start"
npm start

# Method 3: Run in background with nohup (for persistent server)
nohup npm start > /tmp/server.log 2>&1 &

# Check if server is running
curl -s http://localhost:32300/api/auth/me
# Expected: {"error":{"code":"UNAUTHORIZED","message":"Missing authorization token"}}
```

### Testing

#### Test Suite Overview
The project includes a comprehensive Jest test suite with 39 tests across 4 files:

| File | Tests | Coverage |
|------|-------|----------|
| `tests/auth.test.ts` | 12 | Magic link, token validation, logout |
| `tests/events.test.ts` | 12 | CRUD, publish, soft delete |
| `tests/rsvp.test.ts` | 6 | Create/update/cancel RSVPs |
| `tests/join-flow.test.ts` | 9 | E2E magic link user flows |

#### Running Tests

**Important:** The server must be running before executing tests.

```bash
# 1. Start the server (in background or separate terminal)
npm start &

# 2. Clear rate limits from Redis (prevents 429 errors)
docker exec gather-redis redis-cli KEYS "rl:*" | xargs -r docker exec -i gather-redis redis-cli DEL

# 3. Run all tests
npm test

# 4. Run specific test file
npm test -- --testPathPatterns="join-flow"

# 5. Run with coverage
npm run test:coverage

# 6. Run in watch mode (for development)
npm run test:watch
```

#### Test Troubleshooting

| Issue | Solution |
|-------|----------|
| `fetch failed` / `ECONNREFUSED` | Server not running. Start with `npm start` |
| `429 Too Many Requests` | Rate limited. Clear Redis: `docker exec gather-redis redis-cli KEYS "rl:*" \| xargs -r docker exec -i gather-redis redis-cli DEL` |
| `Unique constraint failed on token_hash` | Old bug - fixed by adding jti to refresh tokens |
| Tests timeout | Check Docker containers: `docker ps` |

### Database Commands
```bash
# Generate Prisma client
npx prisma generate

# Run migrations (development)
npx prisma migrate dev

# Run migrations (production)
npx prisma migrate deploy

# Open Prisma Studio (database GUI)
npx prisma studio

# Reset database (WARNING: deletes all data)
npx prisma migrate reset
```

### Email Testing Locally

The app supports multiple email providers. For local development, you have several options:

#### Option 1: Use MailHog (Recommended for Development)

MailHog captures all emails locally without sending them:

```bash
# Add MailHog to docker-compose.yml or run standalone
docker run -d -p 1025:1025 -p 8025:8025 mailhog/mailhog

# Configure .env.local to use MailHog
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
```

View captured emails at: http://localhost:8025

#### Option 2: Console Logging

Set `SMTP_CAPTURE=true` in `.env.local` to log email content to the console instead of sending:

```bash
# .env.local
SMTP_CAPTURE=true
```

#### Option 3: Real SMTP (Gmail)

For testing actual email delivery, use Gmail with an App Password:

```bash
# .env.local
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

**Note:** Create an App Password at https://myaccount.google.com/apppasswords (requires 2FA enabled).

#### Troubleshooting Email Issues

| Issue | Solution |
|-------|----------|
| Emails not arriving | Check spam folder, verify SMTP credentials |
| "Connection refused" | SMTP server not running or wrong port |
| "[Email] Sent via SMTP" but no email | Check recipient, domain might be blocked |
| Rate limiting | Gmail limits ~500 emails/day |

**Email Debug Logging:** The app logs email send attempts with `[Email]` prefix. Check server logs:
```bash
tail -f /tmp/gather-dev.log | grep Email
```

### Building
```bash
# Production build
npm run build

# Start production server
npm start
```

### Linting
```bash
npm run lint
```

## 🔧 For AI Agents / Contributors

### Before Making Changes

1. **Ensure services are running:**
   ```bash
   docker ps | grep gather  # Should show postgres and redis
   ```

2. **Run the test suite to verify baseline:**
   ```bash
   # Clear rate limits first
   docker exec gather-redis redis-cli KEYS "rl:*" | xargs -r docker exec -i gather-redis redis-cli DEL
   npm test
   ```

3. **Check current git status:**
   ```bash
   git status
   git log --oneline -5
   ```

### Making Changes

1. **Understand the codebase structure:**
   - API routes: `src/app/api/`
   - Core logic: `src/lib/` (auth.ts, api.ts, validations.ts)
   - Database schema: `prisma/schema.prisma`
   - Tests: `tests/`

2. **Key files to understand:**
   - `src/lib/auth.ts` - Magic link creation, verification, JWT handling
   - `src/lib/api.ts` - API middleware, rate limiting, response helpers
   - `src/lib/validations.ts` - Zod schemas for input validation

3. **Validation schemas matter:**
   - Event categories are lowercase: `music`, `sports`, `community`, etc.
   - Location is a nested object: `{ name, address, lat, lng }`
   - Check `src/lib/validations.ts` before creating test data

### After Making Changes

1. **Rebuild if you modified source files:**
   ```bash
   npm run build
   ```

2. **Restart the server:**
   ```bash
   pkill -f "next start"; npm start &
   ```

3. **Run tests to verify nothing broke:**
   ```bash
   docker exec gather-redis redis-cli KEYS "rl:*" | xargs -r docker exec -i gather-redis redis-cli DEL
   npm test
   ```

4. **Commit with descriptive message:**
   ```bash
   git add -A
   git commit -m "Brief description of change"
   ```

### Common Pitfalls

| Pitfall | How to Avoid |
|---------|--------------|
| Server not running during tests | Always start server before running `npm test` |
| Rate limiting blocks requests | Clear Redis rate limit keys before tests |
| Prisma client out of sync | Run `npx prisma generate` after schema changes |
| Build cache issues | Delete `.next/` folder and rebuild |
| Port 3000 already in use | Kill existing process: `lsof -ti:3000 \| xargs kill -9` |

### Architecture Notes

- **Authentication Flow:** Magic link → JWT access token (15m) + refresh token (30d)
- **Rate Limiting:** Uses Redis with key prefix `rl:` 
- **Sessions:** Stored in PostgreSQL, token hash indexed for lookup
- **Events:** Soft delete (deletedAt field), not hard delete

## 🔒 Security

- All API routes validate and sanitize input with Zod
- JWT tokens have short expiry with refresh rotation
- Magic links expire in 15 minutes
- Password-less authentication eliminates password-related vulnerabilities
- Rate limiting via Redis
- CSRF protection for state-changing operations
- Server-side permission checks on all protected routes

## 📝 License

MIT
