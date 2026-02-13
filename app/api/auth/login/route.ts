import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/database';
import { comparePassword, generateToken, sanitizeUser } from '@/lib/auth';
import type { AuthResponse } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    // Validate input
    if (!email || !password) {
      return NextResponse.json<AuthResponse>(
        { success: false, error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Find user by email
    const { data: user, error: fetchError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase())
      .single();

    if (fetchError || !user) {
      return NextResponse.json<AuthResponse>(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Verify password
    const passwordMatch = await comparePassword(password, user.password_hash);
    
    if (!passwordMatch) {
      return NextResponse.json<AuthResponse>(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Generate JWT token
    const token = generateToken(user);

    // Return user data and token
    return NextResponse.json<AuthResponse>(
      {
        success: true,
        token,
        user: sanitizeUser(user),
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('[v0] Login error:', error);
    return NextResponse.json<AuthResponse>(
      { success: false, error: 'Login failed' },
      { status: 500 }
    );
  }
}
