import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/database';
import { constructWebhookEvent } from '@/lib/stripe';
import Stripe from 'stripe';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      return NextResponse.json(
        { error: 'Missing stripe-signature header' },
        { status: 400 }
      );
    }

    // Verify webhook signature
    let event: Stripe.Event;
    try {
      event = constructWebhookEvent(body, signature);
    } catch (err) {
      console.error('[v0] Webhook signature verification failed:', err);
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      );
    }

    console.log('[v0] Webhook received:', event.type);

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;

      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
        break;

      default:
        console.log('[v0] Unhandled webhook event type:', event.type);
    }

    return NextResponse.json({ received: true }, { status: 200 });

  } catch (error) {
    console.error('[v0] Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

/**
 * Handle successful checkout session
 */
async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId;
  const packageId = session.metadata?.packageId;
  const credits = parseInt(session.metadata?.credits || '0');

  if (!userId || !credits) {
    console.error('[v0] Missing metadata in checkout session');
    return;
  }

  console.log('[v0] Processing checkout completion:', { userId, credits });

  // Add credits to user
  const { error: creditError } = await supabaseAdmin.rpc('add_user_credits', {
    user_uuid: userId,
    amount: credits,
  });

  if (creditError) {
    console.error('[v0] Failed to add credits:', creditError);
    return;
  }

  // Update Stripe customer ID if not set
  if (session.customer) {
    await supabaseAdmin
      .from('users')
      .update({ stripe_customer_id: session.customer as string })
      .eq('id', userId);
  }

  // Record payment
  await supabaseAdmin.from('payments').insert([
    {
      user_id: userId,
      stripe_payment_intent_id: session.payment_intent as string,
      amount: session.amount_total || 0,
      currency: session.currency || 'usd',
      status: 'succeeded',
      credits_purchased: credits,
      payment_method: 'card',
      metadata: {
        packageId,
        sessionId: session.id,
      },
    },
  ]);

  console.log('[v0] Credits added successfully:', credits);
}

/**
 * Handle successful payment intent
 */
async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  const userId = paymentIntent.metadata?.userId;
  const credits = parseInt(paymentIntent.metadata?.credits || '0');

  if (!userId || !credits) {
    return;
  }

  console.log('[v0] Payment intent succeeded:', { userId, credits });

  // Check if payment already processed (via checkout session)
  const { data: existingPayment } = await supabaseAdmin
    .from('payments')
    .select('id')
    .eq('stripe_payment_intent_id', paymentIntent.id)
    .single();

  if (existingPayment) {
    console.log('[v0] Payment already processed');
    return;
  }

  // Add credits
  await supabaseAdmin.rpc('add_user_credits', {
    user_uuid: userId,
    amount: credits,
  });

  // Record payment
  await supabaseAdmin.from('payments').insert([
    {
      user_id: userId,
      stripe_payment_intent_id: paymentIntent.id,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      status: 'succeeded',
      credits_purchased: credits,
      payment_method: paymentIntent.payment_method_types[0],
      metadata: paymentIntent.metadata,
    },
  ]);

  console.log('[v0] Payment processed successfully');
}

/**
 * Handle failed payment intent
 */
async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
  const userId = paymentIntent.metadata?.userId;

  if (!userId) {
    return;
  }

  console.log('[v0] Payment intent failed:', paymentIntent.id);

  // Record failed payment
  await supabaseAdmin.from('payments').insert([
    {
      user_id: userId,
      stripe_payment_intent_id: paymentIntent.id,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      status: 'failed',
      credits_purchased: 0,
      payment_method: paymentIntent.payment_method_types[0],
      metadata: paymentIntent.metadata,
    },
  ]);
}
