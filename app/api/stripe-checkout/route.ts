import { NextRequest, NextResponse } from 'next/server'
import { stripe, PRICE_CONFIG } from '@/utils/stripe'
import { createClient } from '@/utils/supabase-server'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  // Define variables outside try block for catch block access
  let cleanPriceId = 'unknown'
  
  try {
    const body = await req.text()
    console.log('Raw request body:', body)
    
    if (!body || body.trim() === '') {
      return NextResponse.json({ error: 'Empty request body' }, { status: 400 })
    }
    
    let parsedBody
    try {
      parsedBody = JSON.parse(body)
    } catch (jsonError) {
      console.error('JSON parse error:', jsonError)
      return NextResponse.json({ 
        error: 'Invalid JSON', 
        details: jsonError instanceof Error ? jsonError.message : 'Unknown JSON error',
        receivedBody: body.substring(0, 100)
      }, { status: 400 })
    }
    
    const { isYearly, userId } = parsedBody
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    // Direct price IDs to avoid environment variable newline issues
    const priceIds = {
      monthly: 'price_1RuzS5PFPtH1j0GzWQtQ2dFX',
      yearly: 'price_1RuzTFPFPtH1j0GzyszyNRM1'
    }
    
    cleanPriceId = isYearly ? priceIds.yearly : priceIds.monthly
    
    const supabase = await createClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()
    let customerEmail = authUser?.email

    if (!customerEmail) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', userId)
        .maybeSingle()
      if (profile?.email) customerEmail = profile.email
    }

    const origin = (process.env.NEXT_PUBLIC_SITE_URL || req.nextUrl.origin).trim()

    console.log('Creating Stripe session with:', {
      cleanPriceId,
      customerEmail,
      userId,
      origin,
      isYearly
    })

    // Test Stripe authentication first
    console.log('🔍 Testing Stripe authentication...')
    console.log('Environment:', {
      NODE_ENV: process.env.NODE_ENV,
      hasSecret: Boolean(process.env.STRIPE_SECRET_KEY),
      secretPrefix: process.env.STRIPE_SECRET_KEY?.substring(0, 15),
      cleanPriceId
    })
    
    try {
      // Test 1: Simple account retrieval (requires valid auth)
      console.log('🔍 Step 1: Testing account access...')
      const account = await stripe.accounts.retrieve()
      console.log('✅ Account access successful:', {
        id: account.id,
        country: account.country,
        default_currency: account.default_currency,
        business_type: account.business_type
      })
      
      // Test 2: Price retrieval
      console.log('🔍 Step 2: Testing price retrieval...')
      const priceTest = await stripe.prices.retrieve(cleanPriceId)
      console.log('✅ Price retrieval successful:', {
        id: priceTest.id,
        active: priceTest.active,
        currency: priceTest.currency,
        unit_amount: priceTest.unit_amount
      })
      
    } catch (connectionError) {
      console.error('❌ Stripe test failed:', connectionError)
      
      // Enhanced error analysis
      if (connectionError && typeof connectionError === 'object') {
        console.error('Detailed error analysis:', {
          name: connectionError.name,
          type: connectionError.type,
          code: connectionError.code,
          message: connectionError.message,
          status: connectionError.status || connectionError.statusCode,
          headers: connectionError.headers,
          request_id: connectionError.request_id
        })
      }
      
      throw connectionError
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: cleanPriceId, quantity: 1 }],
      metadata: { userId, plan: isYearly ? 'yearly' : 'monthly' },
      customer_email: customerEmail,
      success_url: `${origin}/plans?payment=success`,
      cancel_url: `${origin}/plans?payment=cancelled`,
      billing_address_collection: 'required',
      allow_promotion_codes: true,
    })
    
    console.log('Stripe session created successfully:', session.id)

    return NextResponse.json({ sessionId: session.id, url: session.url })
  } catch (error) {
    console.error('Error creating checkout session:', error)
    
    // Enhanced Stripe error details
    let stripeError = {}
    if (error && typeof error === 'object' && 'type' in error) {
      stripeError = {
        type: error.type,
        code: error.code,
        param: error.param,
        message: error.message,
        decline_code: error.decline_code,
        request_id: error.request_id
      }
    }
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ 
      error: 'Failed to create checkout session', 
      details: errorMessage,
      stripeError,
      debug: {
        hasStripe: Boolean(stripe),
        hasSecret: Boolean(process.env.STRIPE_SECRET_KEY),
        priceIds: {
          monthly: 'price_1RuzS5PFPtH1j0GzWQtQ2dFX',
          yearly: 'price_1RuzTFPFPtH1j0GzyszyNRM1'
        },
        cleanPriceIdUsed: cleanPriceId
      }
    }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const health = req.nextUrl.searchParams.get('ping')
  if (health) {
    return NextResponse.json({ 
      ok: true, 
      hasSecret: Boolean(process.env.STRIPE_SECRET_KEY),
      hasPrices: Boolean(process.env.STRIPE_MONTHLY_PRICE_ID && process.env.STRIPE_YEARLY_PRICE_ID)
    })
  }
  return NextResponse.json({ error: 'Use POST method for checkout creation' }, { status: 405 })
}
