import logger from './logger.js'
import * as Sentry from '@sentry/node'
import { PostHog } from 'posthog-node'

const SENTRY_DSN = process.env.SENTRY_DSN || ''
const POSTHOG_API_KEY = process.env.POSTHOG_API_KEY || ''
const BETTERSTACK_TOKEN = process.env.BETTERSTACK_TOKEN || ''

export const isSentryEnabled = !!SENTRY_DSN
export const isPostHogEnabled = !!POSTHOG_API_KEY
export const isBetterStackEnabled = !!BETTERSTACK_TOKEN

let posthogClient = null

export function initMonitoring() {
  if (isSentryEnabled) {
    try {
      Sentry.init({
        dsn: SENTRY_DSN,
        environment: process.env.NODE_ENV || 'development',
        tracesSampleRate: 1.0,
      })
      logger.info('🛡️ Sentry Error Monitoring initialized.')
    } catch (err) {
      logger.error('Failed to initialize Sentry: ' + err.message)
    }
  } else {
    logger.info('🛡️ Sentry disabled (no DSN provided).')
  }

  if (isPostHogEnabled) {
    try {
      posthogClient = new PostHog(POSTHOG_API_KEY, {
        host: process.env.POSTHOG_HOST || 'https://us.i.posthog.com',
        flushAt: 1,
        flushInterval: 0
      })
      logger.info('📊 PostHog User Analytics initialized.')
    } catch (err) {
      logger.error('Failed to initialize PostHog: ' + err.message)
    }
  } else {
    logger.info('📊 PostHog disabled (no API key provided).')
  }

  if (isBetterStackEnabled) {
    logger.info('🩺 BetterStack Health Monitoring endpoints enabled.')
  }
}

export function logErrorToSentry(err, context = {}) {
  if (isSentryEnabled) {
    Sentry.captureException(err, { extra: context })
    logger.info(`[SENTRY ERROR REPORT] ${err.message}`, context)
  } else {
    logger.error(`[Local Error Log] ${err.stack}`, context)
  }
}

export function trackEvent(userId, eventName, properties = {}) {
  if (isPostHogEnabled && posthogClient) {
    try {
      posthogClient.capture({
        distinctId: userId || 'anonymous',
        event: eventName,
        properties: properties
      })
      logger.info(`[POSTHOG TRACK] User: ${userId} - Event: ${eventName}`, properties)
    } catch (err) {
      logger.error(`Failed to track event on PostHog: ${err.message}`)
    }
  } else {
    logger.info(`[Local Analytics Event] User: ${userId} - Event: ${eventName}`, properties)
  }
}

export function setupSentryErrorHandler(app) {
  if (isSentryEnabled) {
    Sentry.setupExpressErrorHandler(app)
  }
}

