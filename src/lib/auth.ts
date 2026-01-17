import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { prisma } from './db';
import { Prisma } from '@prisma/client';

// Define types that match our Prisma schema
type UserRole = 'USER' | 'ADMIN' | 'MODERATOR';
type UserStatus = 'ACTIVE' | 'SUSPENDED' | 'BANNED';

interface User {
  id: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  emailVerified: boolean;
}

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-change-in-production-minimum-32-chars';
const MAGIC_LINK_EXPIRY_MINUTES = 15;
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY_DAYS = 30;

export interface JWTPayload {
  sub: string;
  email: string;
  role: UserRole;
  type: 'access' | 'refresh';
  iat?: number;
  exp?: number;
}

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  emailVerified: boolean;
}

// ============ Token Generation ============

export function generateRandomToken(bytes: number = 32): string {
  return crypto.randomBytes(bytes).toString('hex');
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// ============ Password Utilities ============

export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}

export function validatePassword(password: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }
  
  return { isValid: errors.length === 0, errors };
}

// ============ Token Generation ============

export function generateAccessToken(user: Pick<User, 'id' | 'email' | 'role'>): string {
  const payload: JWTPayload = {
    sub: user.id,
    email: user.email,
    role: user.role,
    type: 'access',
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
}

export function generateRefreshToken(user: Pick<User, 'id' | 'email' | 'role'>): string {
  const payload: JWTPayload = {
    sub: user.id,
    email: user.email,
    role: user.role,
    type: 'refresh',
  };
  // Add jti (JWT ID) for uniqueness to prevent hash collisions when tokens are generated in same second
  return jwt.sign(payload, JWT_SECRET, { 
    expiresIn: `${REFRESH_TOKEN_EXPIRY_DAYS}d`,
    jwtid: crypto.randomBytes(16).toString('hex'),
  });
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    return decoded;
  } catch {
    return null;
  }
}

// ============ Magic Link ============

export async function createMagicLink(email: string): Promise<{ token: string; expiresAt: Date }> {
  const token = generateRandomToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + MAGIC_LINK_EXPIRY_MINUTES * 60 * 1000);

  // Find existing user or null
  const existingUser = await prisma.user.findUnique({ where: { email } });

  await prisma.magicLinkToken.create({
    data: {
      email,
      tokenHash,
      expiresAt,
      userId: existingUser?.id,
    },
  });

  return { token, expiresAt };
}

export async function verifyMagicLink(token: string): Promise<{
  user: User;
  isNewUser: boolean;
} | null> {
  const tokenHash = hashToken(token);

  const magicLink = await prisma.magicLinkToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!magicLink) {
    return null;
  }

  // Check if expired
  if (magicLink.expiresAt < new Date()) {
    await prisma.magicLinkToken.delete({ where: { id: magicLink.id } });
    return null;
  }

  // Check if already used
  if (magicLink.usedAt) {
    return null;
  }

  // Mark as used
  await prisma.magicLinkToken.update({
    where: { id: magicLink.id },
    data: { usedAt: new Date() },
  });

  // If user exists, update email verified and return
  if (magicLink.user) {
    const user = await prisma.user.update({
      where: { id: magicLink.user.id },
      data: { emailVerified: true },
    });
    return { user, isNewUser: false };
  }

  // Check if user already exists with this email (in case userId wasn't linked)
  const existingUser = await prisma.user.findUnique({
    where: { email: magicLink.email },
  });

  if (existingUser) {
    const user = await prisma.user.update({
      where: { id: existingUser.id },
      data: { emailVerified: true },
    });
    return { user, isNewUser: false };
  }

  // Create new user with display name from email prefix
  const emailPrefix = magicLink.email.split('@')[0];
  // Clean up the prefix: replace dots/underscores with spaces, capitalize words
  const displayName = emailPrefix
    .replace(/[._-]/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');

  const newUser = await prisma.user.create({
    data: {
      email: magicLink.email,
      emailVerified: true,
      profile: {
        create: {
          displayName,
        },
      },
    },
  });

  return { user: newUser, isNewUser: true };
}

// ============ Password Reset ============

export async function createPasswordResetToken(userId: string): Promise<string> {
  const token = generateRandomToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + MAGIC_LINK_EXPIRY_MINUTES * 60 * 1000); // Same expiry as magic links

  await prisma.passwordResetToken.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
    },
  });

  return token;
}

export async function verifyPasswordResetToken(token: string): Promise<{ userId: string } | null> {
  const tokenHash = hashToken(token);

  const resetToken = await prisma.passwordResetToken.findFirst({
    where: {
      tokenHash,
      expiresAt: { gt: new Date() },
      usedAt: null,
    },
  });

  if (!resetToken) {
    return null;
  }

  // Mark token as used
  await prisma.passwordResetToken.update({
    where: { id: resetToken.id },
    data: { usedAt: new Date() },
  });

  return { userId: resetToken.userId };
}

// ============ Sessions ============

export async function createSession(
  userId: string,
  deviceInfo?: Prisma.JsonValue,
  ipAddress?: string
): Promise<{ accessToken: string; refreshToken: string; expiresAt: Date }> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new Error('User not found');
  }

  const refreshToken = generateRefreshToken(user);
  const accessToken = generateAccessToken(user);
  const tokenHash = hashToken(refreshToken);
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

  await prisma.session.create({
    data: {
      userId,
      tokenHash,
      deviceInfo: deviceInfo || undefined,
      ipAddress,
      expiresAt,
    },
  });

  return { accessToken, refreshToken, expiresAt };
}

export async function refreshSession(refreshToken: string): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
} | null> {
  const payload = verifyToken(refreshToken);
  if (!payload || payload.type !== 'refresh') {
    return null;
  }

  const tokenHash = hashToken(refreshToken);
  const session = await prisma.session.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!session || session.expiresAt < new Date()) {
    if (session) {
      await prisma.session.delete({ where: { id: session.id } });
    }
    return null;
  }

  // Check user status
  if (session.user.status !== 'ACTIVE') {
    await prisma.session.delete({ where: { id: session.id } });
    return null;
  }

  // Delete old session
  await prisma.session.delete({ where: { id: session.id } });

  // Create new session
  return createSession(session.userId, session.deviceInfo ?? undefined, session.ipAddress || undefined);
}

export async function invalidateSession(refreshToken: string): Promise<boolean> {
  const tokenHash = hashToken(refreshToken);
  try {
    await prisma.session.delete({ where: { tokenHash } });
    return true;
  } catch {
    return false;
  }
}

export async function invalidateAllSessions(userId: string): Promise<void> {
  await prisma.session.deleteMany({ where: { userId } });
}

// ============ Auth Helpers ============

export async function getUserFromToken(accessToken: string): Promise<AuthUser | null> {
  const payload = verifyToken(accessToken);
  if (!payload || payload.type !== 'access') {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: {
      id: true,
      email: true,
      role: true,
      status: true,
      emailVerified: true,
    },
  });

  if (!user || user.status !== 'ACTIVE') {
    return null;
  }

  // Verify user has at least one active session (security: sessions can be invalidated)
  const activeSession = await prisma.session.findFirst({
    where: {
      userId: user.id,
      expiresAt: { gt: new Date() },
    },
  });

  if (!activeSession) {
    return null;
  }

  return user;
}

export function extractTokenFromHeader(authHeader: string | null): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.slice(7);
}
