import { Queue, Worker } from 'bullmq'
import { getRedisClient, isRedisConfigured } from './redis.js'
import { runMarketScan } from './marketScanner.js'
import { getSymbolNews } from './newsAPI.js'

const QUEUE_NAME = 'tradewise-background-jobs'

let backgroundQueue = null
let backgroundWorker = null

// Simple job runner routing
async function processJob(jobName, data) {
  console.log(`[worker] Processing job "${jobName}" with data:`, data)
  try {
    switch (jobName) {
      case 'hourly-scan':
        await runMarketScan(true)
        break
      case 'fetch-news':
        if (data && data.symbol) {
          await getSymbolNews(data.symbol)
        } else {
          // fetch news for default assets
          const defaults = ['AAPL', 'MSFT', 'GOOGL', 'BTC', 'ETH']
          for (const s of defaults) {
            await getSymbolNews(s)
          }
        }
        break
      default:
        console.warn(`[worker] Unknown job type: ${jobName}`)
    }
  } catch (err) {
    console.error(`[worker] Job error on "${jobName}":`, err.message)
  }
}

if (isRedisConfigured) {
  const connection = getRedisClient()

  backgroundQueue = new Queue(QUEUE_NAME, { connection })
  console.log('📦 BullMQ background queue initialized.')

  backgroundWorker = new Worker(QUEUE_NAME, async (job) => {
    await processJob(job.name, job.data)
  }, { connection })

  backgroundWorker.on('completed', (job) => {
    console.log(`✅ Background job "${job.name}" completed.`)
  })

  backgroundWorker.on('failed', (job, err) => {
    console.error(`❌ Background job "${job.name}" failed:`, err.message)
  })
} else {
  console.warn('⚠️ BullMQ bypass: running jobs in-memory without Redis.')
}

/**
 * Add a job to the background queue.
 * @param {string} name - Name of the job
 * @param {object} data - Data to pass to job
 */
export async function addBackgroundJob(name, data = {}) {
  if (isRedisConfigured && backgroundQueue) {
    await backgroundQueue.add(name, data, {
      removeOnComplete: true,
      removeOnFail: false
    })
    console.log(`[queue] Job "${name}" added to Redis queue.`)
  } else {
    // Local fallback: execute task asynchronously using setTimeout
    console.log(`[queue] (Bypass) Scheduling job "${name}" for immediate execution.`)
    setTimeout(() => {
      processJob(name, data)
    }, 100)
  }
}
