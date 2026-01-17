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

6. **Open [http://localhost:3000](http://localhost:3000)**

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

### Database Commands
```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev

# Open Prisma Studio
npx prisma studio

# Reset database
npx prisma migrate reset
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
