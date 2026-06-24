import { Resend } from 'resend'
import logger from './logger.js'

const RESEND_API_KEY = process.env.RESEND_API_KEY || ''
export const isResendConfigured = !!RESEND_API_KEY

let resend = null
if (isResendConfigured) {
  resend = new Resend(RESEND_API_KEY)
  logger.info('📧 Resend Email Infrastructure initialized.')
} else {
  logger.warn('⚠️ RESEND_API_KEY is not set. All outbound emails will be routed to local logger.')
}

/**
 * Sends a generic HTML email via Resend or logs it locally if unconfigured.
 */
export async function sendEmail({ to, subject, html }) {
  try {
    if (isResendConfigured && resend) {
      const data = await resend.emails.send({
        from: 'TradeWise Alerts <alerts@tradewise-app.com>',
        to,
        subject,
        html
      })
      logger.info(`📧 Outbound Email sent successfully to ${to}. Message ID: ${data.id}`)
      return { success: true, id: data.id }
    } else {
      logger.info(`[LOCAL EMAIL SANDBOX]
To: ${to}
Subject: ${subject}
Content:
------------------------------------------
${html}
------------------------------------------`)
      return { success: true, sandbox: true }
    }
  } catch (err) {
    logger.error(`❌ Email send failed to ${to}: ${err.message}`)
    return { success: false, error: err.message }
  }
}

/**
 * Sends a price alert crossing notification email.
 */
export async function sendPriceAlertEmail({ email, symbol, condition, targetPrice, currentPrice }) {
  const subject = `🚨 Price Alert: ${symbol} crossed ${condition} $${targetPrice}!`
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #1e293b; border-radius: 8px; background-color: #0f172a; color: #f1f5f9;">
      <h2 style="color: #38bdf8; border-bottom: 1px solid #334155; padding-bottom: 10px;">TradeWise Price Alert</h2>
      <p>Hello,</p>
      <p>Your price alert for <strong>${symbol}</strong> has been triggered!</p>
      <div style="background-color: #1e293b; padding: 15px; border-radius: 6px; margin: 20px 0; font-family: monospace;">
        <strong>Asset:</strong> ${symbol}<br/>
        <strong>Condition:</strong> Crossed ${condition.toUpperCase()} $${targetPrice}<br/>
        <strong>Trigger Price:</strong> $${currentPrice.toFixed(4)}
      </div>
      <p style="color: #94a3b8; font-size: 12px; margin-top: 30px;">
        This alert was generated automatically by TradeWise. Log in to adjust your alert thresholds.
      </p>
    </div>
  `
  return await sendEmail({ to: email, subject, html })
}

/**
 * Sends a weekly portfolio health evaluation report email.
 */
export async function sendWeeklyReportEmail({ email, name, totalValue, cash, returnPct, openPositions }) {
  const subject = `📊 Your Weekly TradeWise Portfolio Summary`
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #1e293b; border-radius: 8px; background-color: #0f172a; color: #f1f5f9;">
      <h2 style="color: #38bdf8; border-bottom: 1px solid #334155; padding-bottom: 10px;">Weekly Portfolio Report</h2>
      <p>Hello ${name || 'Trader'},</p>
      <p>Here is your weekly TradeWise paper trading account progress evaluation summary:</p>
      
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 20px 0;">
        <div style="background-color: #1e293b; padding: 15px; border-radius: 6px; text-align: center;">
          <span style="color: #94a3b8; font-size: 11px; text-transform: uppercase;">Total Valuation</span>
          <h3 style="margin: 5px 0 0 0; color: #f8fafc; font-size: 20px;">$${totalValue.toFixed(2)}</h3>
        </div>
        <div style="background-color: #1e293b; padding: 15px; border-radius: 6px; text-align: center;">
          <span style="color: #94a3b8; font-size: 11px; text-transform: uppercase;">Cumulative Return</span>
          <h3 style="margin: 5px 0 0 0; color: ${returnPct >= 0 ? '#4ade80' : '#f87171'}; font-size: 20px;">${returnPct >= 0 ? '+' : ''}${returnPct.toFixed(2)}%</h3>
        </div>
      </div>

      <div style="background-color: #1e293b; padding: 15px; border-radius: 6px; margin-bottom: 20px;">
        <h4 style="margin: 0 0 10px 0; color: #38bdf8;">Asset Allocation</h4>
        <strong>Cash Balance:</strong> $${cash.toFixed(2)}<br/>
        <strong>Active Holdings:</strong> ${openPositions} positions
      </div>

      <p>Keep refining your execution rules and learning chart patterns to optimize results.</p>
      <p style="color: #94a3b8; font-size: 12px; margin-top: 30px;">
        Disclaimer: All values represent mock paper-trading metrics. No real currencies are stored or traded.
      </p>
    </div>
  `
  return await sendEmail({ to: email, subject, html })
}

/**
 * Sends a watchlist pattern trigger alert email.
 */
export async function sendWatchlistAlertEmail({ email, symbol, pattern, confidence, signal }) {
  const subject = `🎯 Watchlist Alert: ${pattern} detected on ${symbol}!`
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #1e293b; border-radius: 8px; background-color: #0f172a; color: #f1f5f9;">
      <h2 style="color: #38bdf8; border-bottom: 1px solid #334155; padding-bottom: 10px;">TradeWise Pattern Alert</h2>
      <p>Hello,</p>
      <p>A new technical pattern has been detected on a symbol from your watchlist: <strong>${symbol}</strong>!</p>
      <div style="background-color: #1e293b; padding: 15px; border-radius: 6px; margin: 20px 0; font-family: monospace;">
        <strong>Asset:</strong> ${symbol}<br/>
        <strong>Detected Pattern:</strong> ${pattern}<br/>
        <strong>Confidence:</strong> ${(confidence * 100).toFixed(0)}%<br/>
        <strong>Market Signal:</strong> <span style="color: ${signal === 'BUY' ? '#4ade80' : signal === 'SELL' ? '#f87171' : '#94a3b8'}; font-weight: bold;">${signal}</span>
      </div>
      <p>Log in to view the chart and run the AI Market Copilot technical breakdown on this asset.</p>
      <p style="color: #94a3b8; font-size: 12px; margin-top: 30px;">
        This alert was generated automatically by TradeWise based on your watchlist settings.
      </p>
    </div>
  `
  return await sendEmail({ to: email, subject, html })
}
