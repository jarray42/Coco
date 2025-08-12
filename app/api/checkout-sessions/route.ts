import { NextRequest, NextResponse } from 'next/server'
import { stripe, PRICE_CONFIG } from '@/utils/stripe'
import { createClient } from '@/utils/supabase-server'
import { headers } from 'next/headers'

export async function POST(req: NextRequest) {
  try {
    const { isYearly, userId } = await req.json()
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    // Get the price configuration
    const priceConfig = isYearly ? PRICE_CONFIG.yearly : PRICE_CONFIG.monthly
    
    // Get user email from Supabase
    const supabase = await createClient()
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', userId)
      .single()

    if (error || !profile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get the origin for redirect URLs
    const headersList = await headers()
    const origin = headersList.get('origin') || 'http://localhost:3000'

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceConfig.priceId,
          quantity: 1,
        },
      ],
      metadata: {
        userId,
        plan: isYearly ? 'yearly' : 'monthly',
      },
      customer_email: profile.email,
      success_url: `${origin}/dashboard?payment=success`,
      cancel_url: `${origin}/plans?payment=cancelled`,
      billing_address_collection: 'required',
      allow_promotion_codes: true,
    })

    return NextResponse.json({ sessionId: session.id, url: session.url })
  } catch (error) {
    console.error('Error creating checkout session:', error)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}

