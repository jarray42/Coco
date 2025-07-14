import { Resend } from 'resend'

// Only initialize Resend if API key is available
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

interface EmailNotification {
  userEmail: string
  coinSymbol: string
  coinName: string
  alertType: string
  message: string
  currentValue: number
  thresholdValue: number
}

export async function sendNotificationEmail(notification: EmailNotification): Promise<boolean> {
  try {
    if (!resend) {
      console.log('⚠️ RESEND_API_KEY not configured, skipping email')
      return false
    }

    const subject = getEmailSubject(notification)
    const html = generateEmailHTML(notification)

    const { data, error } = await resend.emails.send({
      from: process.env.FROM_EMAIL || 'notifications@cocoricoin.com',
      to: [notification.userEmail],
      subject,
      html,
    })

    if (error) {
      console.error('❌ Email sending failed:', error)
      return false
    }

    console.log('✅ Email sent successfully:', data?.id)
    return true

  } catch (error) {
    console.error('❌ Email service error:', error)
    return false
  }
}

function getEmailSubject(notification: EmailNotification): string {
  const { coinSymbol, alertType } = notification
  
  switch (alertType) {
    case 'health_score':
      return `🚨 ${coinSymbol} Health Alert - Low Activity Detected`
    case 'consistency_score':
      return `⚠️ ${coinSymbol} Consistency Alert - High Volatility`
    case 'price_drop':
      return `📉 ${coinSymbol} Price Alert - Significant Drop`
    case 'migration':
      return `🔄 ${coinSymbol} Migration Alert - Action Required`
    case 'delisting':
      return `🚫 ${coinSymbol} Delisting Alert - Urgent Action Required`
    default:
      return `🔔 ${coinSymbol} Alert Notification`
  }
}

function generateEmailHTML(notification: EmailNotification): string {
  const { coinSymbol, coinName, alertType, message, currentValue, thresholdValue } = notification
  
  const alertTypeDisplay = {
    health_score: 'Health Score',
    consistency_score: 'Consistency Score', 
    price_drop: 'Price Drop',
    migration: 'Migration',
    delisting: 'Delisting'
  }[alertType] || 'Alert'

  const urgencyColor = {
    health_score: '#f59e0b',
    consistency_score: '#f59e0b',
    price_drop: '#ef4444', 
    migration: '#8b5cf6',
    delisting: '#dc2626'
  }[alertType] || '#6b7280'

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>CocoriCoin Alert</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc;">
      <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); overflow: hidden;">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 32px 24px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px; font-weight: bold;">🐔 CocoriCoin Alert</h1>
          <p style="color: rgba(255, 255, 255, 0.9); margin: 8px 0 0 0; font-size: 16px;">${alertTypeDisplay} Notification</p>
        </div>

        <!-- Content -->
        <div style="padding: 32px 24px;">
          
          <!-- Alert Badge -->
          <div style="text-align: center; margin-bottom: 24px;">
            <span style="display: inline-block; background-color: ${urgencyColor}; color: white; padding: 8px 16px; border-radius: 20px; font-size: 14px; font-weight: 600;">
              ${alertTypeDisplay} Alert
            </span>
          </div>

          <!-- Coin Info -->
          <div style="background-color: #f8fafc; border-radius: 12px; padding: 24px; margin-bottom: 24px; border-left: 4px solid ${urgencyColor};">
            <h2 style="margin: 0 0 12px 0; color: #1f2937; font-size: 20px; font-weight: bold;">
              ${coinName} (${coinSymbol})
            </h2>
            <p style="margin: 0; color: #6b7280; font-size: 16px; line-height: 1.5;">
              ${message}
            </p>
          </div>

          <!-- Alert Details -->
          <div style="background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
            <h3 style="margin: 0 0 16px 0; color: #374151; font-size: 16px; font-weight: 600;">Alert Details</h3>
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span style="color: #6b7280; font-size: 14px;">Current Value:</span>
              <span style="color: #1f2937; font-size: 14px; font-weight: 600;">${currentValue}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span style="color: #6b7280; font-size: 14px;">Alert Threshold:</span>
              <span style="color: #1f2937; font-size: 14px; font-weight: 600;">${thresholdValue}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #6b7280; font-size: 14px;">Alert Type:</span>
              <span style="color: #1f2937; font-size: 14px; font-weight: 600;">${alertTypeDisplay}</span>
            </div>
          </div>

          <!-- Action Button -->
          <div style="text-align: center; margin-bottom: 24px;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://your-app.vercel.app'}/coin/${notification.coinSymbol.toLowerCase()}" 
               style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 16px;">
              View ${coinSymbol} Details
            </a>
          </div>

          <!-- Manage Alerts -->
          <div style="text-align: center; padding-top: 16px; border-top: 1px solid #e5e7eb;">
            <p style="margin: 0 0 12px 0; color: #6b7280; font-size: 14px;">
              Want to modify your alerts?
            </p>
            <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://your-app.vercel.app'}/notifications" 
               style="color: #667eea; text-decoration: none; font-size: 14px; font-weight: 600;">
              Manage Alert Settings
            </a>
          </div>
        </div>

        <!-- Footer -->
        <div style="background-color: #f8fafc; padding: 20px 24px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="margin: 0; color: #9ca3af; font-size: 12px; line-height: 1.5;">
            This email was sent because you have active alerts set up for ${coinSymbol}.<br>
            You can manage your notification preferences in your account settings.
          </p>
          <p style="margin: 8px 0 0 0; color: #9ca3af; font-size: 12px;">
            © 2024 CocoriCoin. All rights reserved.
          </p>
        </div>
      </div>
    </body>
    </html>
  `
}

// Alternative: Simple text-based email for basic setup
export async function sendSimpleNotificationEmail(
  userEmail: string, 
  coinSymbol: string, 
  message: string
): Promise<boolean> {
  try {
    if (!resend) {
      console.log('⚠️ RESEND_API_KEY not configured, skipping email')
      return false
    }

    const { data, error } = await resend.emails.send({
      from: process.env.FROM_EMAIL || 'notifications@cocoricoin.com',
      to: [userEmail],
      subject: `🔔 ${coinSymbol} Alert`,
      text: `${message}\n\nView details: ${process.env.NEXT_PUBLIC_APP_URL}/notifications`,
    })

    if (error) {
      console.error('❌ Simple email failed:', error)
      return false
    }

    console.log('✅ Simple email sent:', data?.id)
    return true

  } catch (error) {
    console.error('❌ Simple email service error:', error)
    return false
  }
} 