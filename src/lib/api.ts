import { NextRequest, NextResponse } from 'next/server';
import { getUserFromToken, extractTokenFromHeader, AuthUser } from '@/lib/auth';
import { redis } from '@/lib/redis';

export interface AuthenticatedRequest extends NextRequest {
  user: AuthUser;
}

export type ApiHandler<T = unknown> = (
  req: NextRequest,
  context?: { params: Promise<Record<string, string>> }
) => Promise<NextResponse<T>>;

export type AuthenticatedApiHandler<T = unknown> = (
  req: AuthenticatedRequest,
  context?: { params: Promise<Record<string, string>> }
) => Promise<NextResponse<T>>;

// ============ Response Helpers ============

export function successResponse<T>(data: T, status = 200): NextResponse {
  return NextResponse.json({ data }, { status });
}

export function errorResponse(
  code: string,
  message: string,
  status = 400,
  details?: unknown
): NextResponse {
  return NextResponse.json(
    {
      error: {
        code,
        message,
        details,
      },
    },
    { status }
  );
}

export function validationError(details: { field: string; message: string }[]): NextResponse {
  return errorResponse('VALIDATION_ERROR', 'Validation failed', 400, details);
}

export function unauthorizedError(message = 'Unauthorized'): NextResponse {
  return errorResponse('UNAUTHORIZED', message, 401);
}

export function forbiddenError(message = 'Forbidden'): NextResponse {
  return errorResponse('FORBIDDEN', message, 403);
}

export function notFoundError(message = 'Not found'): NextResponse {
  return errorResponse('NOT_FOUND', message, 404);
}

export function badRequestError(message = 'Bad request'): NextResponse {
  return errorResponse('BAD_REQUEST', message, 400);
}

export function conflictError(message: string, field?: string): NextResponse {
  return errorResponse('CONFLICT', message, 409, field ? { field } : undefined);
}

export function rateLimitError(retryAfter: number): NextResponse {
  const response = errorResponse('RATE_LIMITED', 'Too many requests', 429, { retryAfter });
  response.headers.set('Retry-After', String(retryAfter));
  return response;
}

export function internalError(message = 'Internal server error'): NextResponse {
  return errorResponse('INTERNAL_ERROR', message, 500);
}

// ============ Auth Middleware ============

export function withAuth(handler: AuthenticatedApiHandler): ApiHandler {
  return async (req: NextRequest, context) => {
    const authHeader = req.headers.get('authorization');
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      return unauthorizedError('Missing authorization token');
    }

    let user;
    try {
      user = await getUserFromToken(token);
    } catch (error) {
      console.error('[Auth] getUserFromToken error:', error);
      return internalError('Authentication service unavailable');
    }

    if (!user) {
      return unauthorizedError('Invalid or expired token');
    }

    (req as AuthenticatedRequest).user = user;
    return handler(req as AuthenticatedRequest, context);
  };
}

export function withOptionalAuth(handler: ApiHandler): ApiHandler {
  return async (req: NextRequest, context) => {
    const authHeader = req.headers.get('authorization');
    const token = extractTokenFromHeader(authHeader);

    if (token) {
      try {
        const user = await getUserFromToken(token);
        if (user) {
          (req as AuthenticatedRequest).user = user;
        }
      } catch (error) {
        console.error('[Auth] getUserFromToken error (optional):', error);
        // Don't block the request; proceed without auth if token check fails
      }
    }

    return handler(req, context);
  };
}

export function withAdmin(handler: AuthenticatedApiHandler): ApiHandler {
  return withAuth(async (req, context) => {
    if (req.user.role !== 'ADMIN') {
      return forbiddenError('Admin access required');
    }
    return handler(req, context);
  });
}

export function withModerator(handler: AuthenticatedApiHandler): ApiHandler {
  return withAuth(async (req, context) => {
    if (req.user.role !== 'ADMIN' && req.user.role !== 'MODERATOR') {
      return forbiddenError('Moderator access required');
    }
    return handler(req, context);
  });
}

// ============ Rate Limiting ============

interface RateLimitConfig {
  requests: number;
  window: number; // seconds
  keyPrefix?: string;
}

export async function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): Promise<{ allowed: boolean; remaining: number; resetIn: number }> {
  const { requests, window, keyPrefix = 'rl' } = config;
  const key = `${keyPrefix}:${identifier}`;

  try {
    const current = await redis.incr(key);
    
    if (current === 1) {
      await redis.expire(key, window);
    }

    const ttl = await redis.ttl(key);
    const remaining = Math.max(0, requests - current);
    const allowed = current <= requests;

    return { allowed, remaining, resetIn: ttl > 0 ? ttl : window };
  } catch (error) {
    // If Redis fails, allow the request but log the error
    console.error('[RateLimit] Redis error:', error);
    return { allowed: true, remaining: requests, resetIn: window };
  }
}

export function withRateLimit(
  config: RateLimitConfig,
  getIdentifier?: (req: NextRequest) => string
): (handler: ApiHandler) => ApiHandler {
  return (handler: ApiHandler) => {
    return async (req: NextRequest, context) => {
      const identifier = getIdentifier
        ? getIdentifier(req)
        : req.headers.get('x-forwarded-for') || 'anonymous';

      const { allowed, remaining, resetIn } = await checkRateLimit(identifier, config);

      if (!allowed) {
        return rateLimitError(resetIn);
      }

      const response = await handler(req, context);
      response.headers.set('X-RateLimit-Limit', String(config.requests));
      response.headers.set('X-RateLimit-Remaining', String(remaining));
      response.headers.set('X-RateLimit-Reset', String(resetIn));

      return response;
    };
  };
}

// ============ Request Helpers ============

export async function parseBody<T>(req: NextRequest): Promise<T | null> {
  try {
    return await req.json();
  } catch {
    return null;
  }
}

export function getSearchParams(req: NextRequest): Record<string, string> {
  const params: Record<string, string> = {};
  req.nextUrl.searchParams.forEach((value, key) => {
    params[key] = value;
  });
  return params;
}

export function getIpAddress(req: NextRequest): string | undefined {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    undefined
  );
}
