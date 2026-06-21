import { Router } from 'express'
import { getDb } from '../src/database/init.js'
import { generateAdaptiveLesson, generateTradeReviewQuiz } from '../src/services/huggingFaceIntegration.js'
import { nowTimestamp } from '../src/trading/common/utils.js'

const router = Router()

/**
 * GET /api/academy/progress/:userId
 * Fetch level progress, badges, and XP
 */
router.get('/progress/:userId', (req, res) => {
  try {
    const db = getDb()
    let progress = db.prepare('SELECT * FROM user_progress WHERE user_id = ?').get(req.params.userId)
    
    // Auto initialize if not found
    if (!progress) {
      const now = nowTimestamp()
      db.prepare(`
        INSERT OR IGNORE INTO user_progress (id, user_id, current_level, lessons_completed, xp_points, badges, last_updated)
        VALUES (?, ?, 'BEGINNER', 0, 0, '[]', ?)
      `).run(req.params.userId, req.params.userId, now)
      
      progress = db.prepare('SELECT * FROM user_progress WHERE user_id = ?').get(req.params.userId)
    }

    res.json({
      success: true,
      progress: {
        ...progress,
        badges: JSON.parse(progress.badges || '[]')
      }
    })
  } catch (err) {
    console.error('Error fetching progress:', err.message)
    res.status(500).json({ success: false, error: err.message })
  }
})

/**
 * POST /api/academy/progress/:userId
 * Award XP, complete lessons, and unlock badges
 */
router.post('/progress/:userId', (req, res) => {
  try {
    const db = getDb()
    const { xpToAdd, completeLesson, badgeToUnlock } = req.body || {}
    const now = nowTimestamp()

    let progress = db.prepare('SELECT * FROM user_progress WHERE user_id = ?').get(req.params.userId)
    if (!progress) {
      return res.status(404).json({ success: false, error: 'User progress not found' })
    }

    let xp = progress.xp_points + Number(xpToAdd || 0)
    let lessons = progress.lessons_completed + (completeLesson ? 1 : 0)
    let badges = JSON.parse(progress.badges || '[]')

    if (badgeToUnlock && !badges.includes(badgeToUnlock)) {
      badges.push(badgeToUnlock)
    }

    // Dynamic Level Advancement
    let level = progress.current_level
    if (xp >= 1000) {
      level = 'ADVANCED'
    } else if (xp >= 300) {
      level = 'INTERMEDIATE'
    }

    db.prepare(`
      UPDATE user_progress 
      SET current_level = ?, lessons_completed = ?, xp_points = ?, badges = ?, last_updated = ?
      WHERE user_id = ?
    `).run(level, lessons, xp, JSON.stringify(badges), now, req.params.userId)

    res.json({
      success: true,
      progress: {
        user_id: req.params.userId,
        current_level: level,
        lessons_completed: lessons,
        xp_points: xp,
        badges
      }
    })
  } catch (err) {
    console.error('Error updating progress:', err.message)
    res.status(500).json({ success: false, error: err.message })
  }
})

/**
 * POST /api/academy/next-lesson
 * Generate dynamic custom lessons based on user level and history
 */
router.post('/next-lesson', async (req, res) => {
  try {
    const { topic, userLevel, mistakesPattern } = req.body || {}
    if (!topic) {
      return res.status(400).json({ success: false, error: 'Missing topic parameter' })
    }

    const lesson = await generateAdaptiveLesson(topic, userLevel || 'BEGINNER', mistakesPattern || 'None')
    res.json({ success: true, lesson })
  } catch (err) {
    console.error('Error generating lesson:', err.message)
    res.status(500).json({ success: false, error: err.message })
  }
})

/**
 * POST /api/academy/quiz
 * Generate interactive training quiz reviews based on a trade event
 */
router.post('/quiz', async (req, res) => {
  try {
    const { trade } = req.body || {}
    if (!trade) {
      return res.status(400).json({ success: false, error: 'Missing trade object' })
    }

    const quiz = await generateTradeReviewQuiz(trade)
    res.json({ success: true, quiz })
  } catch (err) {
    console.error('Error generating quiz:', err.message)
    res.status(500).json({ success: false, error: err.message })
  }
})

export default router
