# Testing Your Stripe Integration

## Local Testing Steps:

### 1. Start your development server:
```bash
npm run dev
```

### 2. Test with Stripe CLI (optional but recommended):
```bash
# Install Stripe CLI first: https://stripe.com/docs/stripe-cli
stripe login
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

### 3. Test the upgrade flow:
1. Go to `/plans` page
2. Click "Upgrade to Pro" button
3. Use test card: `4242 4242 4242 4242`
4. Complete the checkout
5. Verify user gets redirected to `/dashboard?payment=success`
6. Check that user's quota increased from 20 to 200 tokens

### 4. Verify in database:
```sql
-- Check user's subscription status
SELECT user_id, billing_plan, subscription_tier, monthly_limit, tokens_used
FROM user_ai_usage 
WHERE user_id = 'your-user-id';

-- Should show:
-- billing_plan: 'pro'
-- subscription_tier: 'pro' 
-- monthly_limit: 200
```

## Test Cards:
- **Success**: 4242 4242 4242 4242
- **Decline**: 4000 0000 0000 0002
- **3D Secure**: 4000 0027 6000 3184

## What to verify:
✅ Checkout session creates successfully  
✅ Payment completes in Stripe Dashboard  
✅ Webhook fires and updates database  
✅ User sees increased quota in UI  
✅ Pro features are unlocked  

## Troubleshooting:
- Check browser console for errors
- Check server logs for webhook events
- Verify webhook secret matches
- Ensure Stripe keys are correct
- Test webhook with Stripe CLI

