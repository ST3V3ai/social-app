import { NextRequest, NextResponse } from 'next/server';
import { refreshSession } from '@/lib/auth';
import { unauthorizedError, internalError, getIpAddress } from '@/lib/api';

export async function POST(req: NextRequest) {
  try {
    // Get refresh token from cookie
    const refreshToken = req.cookies.get('refresh_token')?.value;

    if (!refreshToken) {
      return unauthorizedError('No refresh token provided');
    }

    // Refresh the session
    const session = await refreshSession(refreshToken);
    if (!session) {
      // Clear invalid cookie
      const response = unauthorizedError('Invalid or expired refresh token');
      response.cookies.delete('refresh_token');
      return response;
    }

    // Set new refresh token cookie
    const response = NextResponse.json({
      data: {
        accessToken: session.accessToken,
        expiresIn: 900, // 15 minutes
      },
    });

    response.cookies.set('refresh_token', session.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });

    return response;
  } catch (error) {
    console.error('[Auth] Refresh error:', error);
    return internalError();
  }
}
