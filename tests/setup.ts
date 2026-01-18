// Test setup and utilities
import { prisma } from '@/lib/db';
import { redis } from '@/lib/redis';

// Base URL for API tests
export const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:32300';

// Clear rate limits from Redis to prevent 429 errors during tests
export async function clearRateLimits() {
  try {
    const keys = await redis.keys('rl:*');
    if (keys.length > 0) {
      await redis.del(...keys);
      console.log(`Cleared ${keys.length} rate limit keys`);
    }
  } catch (error) {
    console.warn('Could not clear rate limits:', error instanceof Error ? error.message : String(error));
  }
}

// Clean up database before/after tests if needed
export async function cleanupTestData() {
  // Only clean up test-specific data, not all data
  // Be careful in production
  if (process.env.NODE_ENV !== 'test') {
    console.warn('Warning: Running cleanup outside of test environment');
  }
}

// Helper to make API requests
export async function apiRequest(
  method: string,
  path: string,
  body?: object,
  token?: string
) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await response.json().catch(() => null);
  
  return {
    status: response.status,
    ok: response.ok,
    data,
  };
}

// Generate unique test email
export function testEmail(prefix: string = 'test') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}@test.gather.app`;
}

// Export prisma for direct database access in tests
export { prisma };
