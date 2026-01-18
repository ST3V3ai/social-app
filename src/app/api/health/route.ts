import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { redis } from '@/lib/redis';

export async function GET() {
  const checks: Record<string, { status: 'ok' | 'error'; message?: string }> = {};
  let healthy = true;

  // Check database
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = { status: 'ok' };
  } catch (error) {
    checks.database = { 
      status: 'error', 
      message: error instanceof Error ? error.message : 'Database connection failed' 
    };
    healthy = false;
  }

  // Check Redis
  try {
    await redis.ping();
    checks.redis = { status: 'ok' };
  } catch (error) {
    checks.redis = { 
      status: 'error', 
      message: error instanceof Error ? error.message : 'Redis connection failed' 
    };
    healthy = false;
  }

  const response = {
    status: healthy ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '0.1.0',
    checks,
  };

  return NextResponse.json(response, { 
    status: healthy ? 200 : 503 
  });
}
