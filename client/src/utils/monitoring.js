import * as Sentry from '@sentry/react'
import posthog from 'posthog-js'

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN || ''
const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY || ''
const POSTHOG_HOST = import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com'

export const isSentryEnabled = !!SENTRY_DSN
export const isPostHogEnabled = !!POSTHOG_KEY

export function initMonitoring() {
  if (isSentryEnabled) {
    try {
      Sentry.init({
        dsn: SENTRY_DSN,
        integrations: [
          Sentry.browserTracingIntegration(),
          Sentry.replayIntegration(),
        ],
        // Performance Monitoring
        tracesSampleRate: 1.0,
        // Session Replay
        replaysSessionSampleRate: 0.1,
        replaysOnErrorSampleRate: 1.0,
        environment: import.meta.env.MODE || 'development'
      })
      console.log('🛡️ Sentry Error Monitoring initialized on Frontend.')
    } catch (err) {
      console.error('Failed to initialize Sentry on Frontend:', err)
    }
  } else {
    console.log('🛡️ Sentry disabled (no DSN provided on Frontend).')
  }

  if (isPostHogEnabled) {
    try {
      posthog.init(POSTHOG_KEY, {
        api_host: POSTHOG_HOST,
        loaded: (ph) => {
          console.log('📊 PostHog User Analytics initialized on Frontend.')
        }
      })
    } catch (err) {
      console.error('Failed to initialize PostHog on Frontend:', err)
    }
  } else {
    console.log('📊 PostHog disabled (no API key provided on Frontend).')
  }
}

export function logErrorToSentry(err, context = {}) {
  if (isSentryEnabled) {
    Sentry.captureException(err, { extra: context })
    console.warn(`[Sentry Report] ${err.message}`, context)
  } else {
    console.error(`[Local Error Log]`, err, context)
  }
}

export function trackEvent(eventName, properties = {}) {
  if (isPostHogEnabled) {
    try {
      posthog.capture(eventName, properties)
      console.log(`[PostHog Track] Event: ${eventName}`, properties)
    } catch (err) {
      console.error('Failed to capture event on PostHog:', err)
    }
  } else {
    console.log(`[Local Analytics Event] Event: ${eventName}`, properties)
  }
}

export function identifyUser(userId, email = '') {
  if (isSentryEnabled && userId) {
    Sentry.setUser({ id: userId, email })
  }
  if (isPostHogEnabled && userId) {
    try {
      posthog.identify(userId, { email })
    } catch (err) {
      console.error('Failed to identify user on PostHog:', err)
    }
  }
}

export function clearUserSession() {
  if (isSentryEnabled) {
    Sentry.setUser(null)
  }
  if (isPostHogEnabled) {
    try {
      posthog.reset()
    } catch (err) {
      console.error('Failed to reset PostHog session:', err)
    }
  }
}
