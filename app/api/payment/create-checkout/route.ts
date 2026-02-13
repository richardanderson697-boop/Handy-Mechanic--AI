import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/database';
import { getUserFromHeaders } from '@/lib/auth';
import { createCheckoutSession, CREDIT_PACKAGES } from '@/lib/stripe';

export async function POST(request: NextRequest) {
  try {
    const tokenPayload = getUserFromHeaders(request.headers);
    if (!tokenPayload) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', tokenPayload.userId)
      .single();

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { packageId } = body;

    if (!packageId || !CREDIT_PACKAGES[packageId as keyof typeof CREDIT_PACKAGES]) {
      return NextResponse.json(
        { success: false, error: 'Invalid package ID' },
        { status: 400 }
      );
    }

    console.log('[v0] Creating checkout session for package:', packageId);

    // Get base URL for redirect
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const successUrl = `${baseUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${baseUrl}/pricing`;

    // Create Stripe checkout session
    const session = await createCheckoutSession(
      user.id,
      packageId,
      user.email,
      successUrl,
      cancelUrl
    );

    console.log('[v0] Checkout session created:', session.id);

    return NextResponse.json(
      {
        success: true,
        sessionId: session.id,
        url: session.url,
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('[v0] Create checkout error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
