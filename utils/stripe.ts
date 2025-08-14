import Stripe from 'stripe'

// Clean and validate the Stripe secret key
const cleanStripeKey = process.env.STRIPE_SECRET_KEY?.trim().replace(/[\r\n\t]/g, '') || ''

// Server-side Stripe instance
export const stripe = new Stripe(cleanStripeKey, {
  apiVersion: '2024-06-20', // Compatible API version for Stripe v16
  timeout: 20000, // 20 seconds timeout
  maxNetworkRetries: 3, // Standard retries
})

// Client-side Stripe publishable key
export const getStripePublishableKey = () => {
  return process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
}

// Price configuration for your plans
export const PRICE_CONFIG = {
  monthly: {
    priceId: process.env.STRIPE_MONTHLY_PRICE_ID!.trim(),
    amount: 1999, // $19.99 in cents
    interval: 'month' as const,
  },
  yearly: {
    priceId: process.env.STRIPE_YEARLY_PRICE_ID!.trim(),
    amount: 19190, // $191.90 in cents (20% discount)
    interval: 'year' as const,
  }
}

