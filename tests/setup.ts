// Test setup and utilities
import { prisma } from '@/lib/db';

// Base URL for API tests
export const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

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
