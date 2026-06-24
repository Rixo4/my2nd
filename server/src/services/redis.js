import Redis from 'ioredis'

const redisUrl = process.env.REDIS_URL || ''
export const isRedisConfigured = !!redisUrl

let redis = null

class MemoryRedisMock {
  constructor() {
    this.store = new Map()
  }
  async get(key) {
    return this.store.get(key) || null
  }
  async set(key, value, mode, duration) {
    this.store.set(key, value)
    if (mode === 'EX' && duration) {
      setTimeout(() => {
        this.store.delete(key)
      }, duration * 1000)
    }
    return 'OK'
  }
  async del(key) {
    const existed = this.store.has(key)
    this.store.delete(key)
    return existed ? 1 : 0
  }
  async keys(pattern) {
    const results = []
    const regexPattern = pattern.replace(/\*/g, '.*')
    const regex = new RegExp(`^${regexPattern}$`)
    for (const key of this.store.keys()) {
      if (regex.test(key)) {
        results.push(key)
      }
    }
    return results
  }
  async incr(key) {
    const val = Number(this.store.get(key) || 0) + 1
    this.store.set(key, String(val))
    return val
  }
  on(event, handler) {
    // No-op for events in mock
    return this
  }
  duplicate() {
    return this
  }
}

if (isRedisConfigured) {
  try {
    redis = new Redis(redisUrl, {
      maxRetriesPerRequest: null, // Required for BullMQ
    })
    redis.on('error', (err) => {
      console.error('❌ Redis Connection Error:', err.message)
    })
    redis.on('connect', () => {
      console.log('🔌 Redis Client connected successfully.')
    })
  } catch (err) {
    console.error('❌ Failed to initialize Redis client:', err.message)
    redis = new MemoryRedisMock()
  }
} else {
  console.warn('⚠️ REDIS_URL is not set. Caching will use in-memory fallback.')
  redis = new MemoryRedisMock()
}

export function getRedisClient() {
  return redis
}
