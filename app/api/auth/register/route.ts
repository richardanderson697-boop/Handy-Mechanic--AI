import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/database';
import { hashPassword, generateToken, isValidEmail, isValidPassword, sanitizeUser } from '@/lib/auth';
import type { AuthResponse } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, name, phone } = body;

    // Validate input
    if (!email || !password) {
      return NextResponse.json<AuthResponse>(
        { success: false, error: 'Email and password are required' },
        { status: 400 }
      );
    }

    if (!isValidEmail(email)) {
      return NextResponse.json<AuthResponse>(
        { success: false, error: 'Invalid email format' },
        { status: 400 }
      );
    }

    const passwordValidation = isValidPassword(password);
    if (!passwordValidation.valid) {
      return NextResponse.json<AuthResponse>(
        { success: false, error: passwordValidation.message },
        { status: 400 }
      );
    }

    // Check if user already exists
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase())
      .single();

    if (existingUser) {
      return NextResponse.json<AuthResponse>(
        { success: false, error: 'Email already registered' },
        { status: 409 }
      );
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const { data: newUser, error: createError } = await supabaseAdmin
      .from('users')
      .insert([
        {
          email: email.toLowerCase(),
          password_hash: passwordHash,
          name: name || null,
          phone: phone || null,
          credits: 0, // Start with 0 credits
        },
      ])
      .select()
      .single();

    if (createError || !newUser) {
      console.error('[v0] User creation error:', createError);
      return NextResponse.json<AuthResponse>(
        { success: false, error: 'Failed to create user' },
        { status: 500 }
      );
    }

    // Generate JWT token
    const token = generateToken(newUser);

    // Return user data and token
    return NextResponse.json<AuthResponse>(
      {
        success: true,
        token,
        user: sanitizeUser(newUser),
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('[v0] Registration error:', error);
    return NextResponse.json<AuthResponse>(
      { success: false, error: 'Registration failed' },
      { status: 500 }
    );
  }
}
