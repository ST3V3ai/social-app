import { NextRequest, NextResponse } from 'next/server';
import { invalidateSession } from '@/lib/auth';
import { successResponse, internalError } from '@/lib/api';

export async function POST(req: NextRequest) {
  try {
    // Get refresh token from cookie
    const refreshToken = req.cookies.get('refresh_token')?.value;

    if (refreshToken) {
      await invalidateSession(refreshToken);
    }

    // Clear the cookie
    const response = NextResponse.json({
      data: { message: 'Logged out successfully' },
    });

    response.cookies.delete('refresh_token');

    return response;
  } catch (error) {
    console.error('[Auth] Logout error:', error);
    return internalError();
  }
}
