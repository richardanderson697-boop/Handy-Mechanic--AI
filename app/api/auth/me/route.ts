import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/database';
import { getUserFromHeaders, sanitizeUser } from '@/lib/auth';
import type { AuthResponse } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    // Get user from token
    const tokenPayload = getUserFromHeaders(request.headers);

    if (!tokenPayload) {
      return NextResponse.json<AuthResponse>(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Fetch user from database
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', tokenPayload.userId)
      .single();

    if (error || !user) {
      return NextResponse.json<AuthResponse>(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json<AuthResponse>(
      {
        success: true,
        user: sanitizeUser(user),
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('[v0] Get user error:', error);
    return NextResponse.json<AuthResponse>(
      { success: false, error: 'Failed to fetch user' },
      { status: 500 }
    );
  }
}
