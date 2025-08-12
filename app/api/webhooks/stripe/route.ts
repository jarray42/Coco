import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/utils/stripe'
import { createClient } from '@/utils/supabase-server'
import Stripe from 'stripe'

// Force dynamic rendering - prevent static analysis during build
export const dynamic = 'force-dynamic'


const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(req: NextRequest) {
  const body = await req.text()
  const signature = req.headers.get('stripe-signature')!

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session)
        break
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription)
        break
      case 'customer.subscription.deleted':
        await handleSubscriptionCanceled(event.data.object as Stripe.Subscription)
        break
      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.Invoice)
        break
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Invoice)
        break
      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Error handling webhook:', error)
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId
  const plan = session.metadata?.plan
  
  if (!userId) {
    console.error('No user ID in checkout session metadata')
    return
  }

  const supabase = await createClient()
  
  // Update or create user quota with pro limits
  const { data: existingQuota } = await supabase
    .from('user_ai_usage')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (existingQuota) {
    // Update existing quota
    await supabase
      .from('user_ai_usage')
      .update({
        billing_plan: 'pro',
        subscription_tier: 'pro',
        monthly_limit: 200,
        smart_alerts_limit: 200,
        subscription_date: new Date().toISOString().split('T')[0],
        updated_at: new Date(),
      })
      .eq('user_id', userId)
  } else {
    // Create new quota record
    await supabase
      .from('user_ai_usage')
      .insert({
        user_id: userId,
        model_provider: 'groq',
        tokens_used: 0,
        monthly_limit: 200,
        smart_alerts_limit: 200,
        billing_plan: 'pro',
        subscription_tier: 'pro',
        subscription_date: new Date().toISOString().split('T')[0],
        eggs: 10,
        daily_usage: 0,
        monthly_usage: 0,
        token_balance: 0,
      })
  }

  console.log(`Successfully upgraded user ${userId} to pro plan`)
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  // Handle subscription updates (like plan changes)
  console.log('Subscription updated:', subscription.id)
}

async function handleSubscriptionCanceled(subscription: Stripe.Subscription) {
  // Handle subscription cancellation
  const customerId = subscription.customer as string
  
  // Find user by Stripe customer ID (you might need to store this relationship)
  // For now, we'll handle this case when implementing customer management
  console.log('Subscription canceled:', subscription.id)
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  // Handle successful recurring payments
  console.log('Payment succeeded for invoice:', invoice.id)
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  // Handle failed payments
  console.log('Payment failed for invoice:', invoice.id)
  
  // You might want to notify the user or downgrade their plan after a certain number of failures
}
