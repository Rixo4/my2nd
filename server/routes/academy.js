import { Router } from 'express'
import { getDb } from '../src/database/init.js'
import { generateAdaptiveLesson, generateTradeReviewQuiz } from '../src/services/huggingFaceIntegration.js'
import { nowTimestamp } from '../src/trading/common/utils.js'
import { v4 as uuidv4 } from 'uuid'
import { isSupabaseConfigured, getSupabase } from '../src/database/supabase.js'
import { createPortfolio } from '../src/trading/paper_trading/models.js'

const router = Router()

/**
 * GET /api/academy/progress/:userId
 * Fetch level progress, badges, and XP
 */
router.get('/progress/:userId', async (req, res) => {
  const userId = req.params.userId
  try {
    if (isSupabaseConfigured) {
      const supabase = getSupabase()
      
      // Fetch progress from Supabase
      let { data: progress, error } = await supabase
        .from('academy_progress')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle()

      if (error) throw error

      // Auto initialize if not found
      if (!progress) {
        // Ensure portfolio exists first (which also inserts into profiles and academy_progress)
        await createPortfolio({ id: userId })

        // Refetch progress
        const refetch = await supabase
          .from('academy_progress')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle()

        if (refetch.error) throw refetch.error
        progress = refetch.data
      }

      let badges = []
      if (progress && progress.badges) {
        badges = Array.isArray(progress.badges) ? progress.badges : JSON.parse(progress.badges)
      }

      res.json({
        success: true,
        progress: {
          ...progress,
          badges
        }
      })
    } else {
      // SQLite fallback
      const db = getDb()
      
      // Ensure portfolio exists first to avoid FOREIGN KEY constraint failure in user_progress
      const portfolio = db.prepare('SELECT * FROM user_portfolios WHERE user_id = ?').get(userId)
      if (!portfolio) {
        await createPortfolio({ id: userId })
      }

      let progress = db.prepare('SELECT * FROM user_progress WHERE user_id = ?').get(userId)
      
      // Auto initialize if not found
      if (!progress) {
        const now = nowTimestamp()
        db.prepare(`
          INSERT OR IGNORE INTO user_progress (id, user_id, current_level, lessons_completed, xp_points, badges, last_updated)
          VALUES (?, ?, 'BEGINNER', 0, 0, '[]', ?)
        `).run(uuidv4(), userId, now)
        
        progress = db.prepare('SELECT * FROM user_progress WHERE user_id = ?').get(userId)
      }

      res.json({
        success: true,
        progress: {
          ...progress,
          badges: JSON.parse(progress.badges || '[]')
        }
      })
    }
  } catch (err) {
    console.error('Error fetching progress:', err.message)
    res.status(500).json({ success: false, error: err.message })
  }
})

/**
 * POST /api/academy/progress/:userId
 * Award XP, complete lessons, and unlock badges
 */
router.post('/progress/:userId', async (req, res) => {
  const userId = req.params.userId
  try {
    const { xpToAdd, completeLesson, badgeToUnlock } = req.body || {}
    
    if (isSupabaseConfigured) {
      const supabase = getSupabase()
      
      let { data: progress, error } = await supabase
        .from('academy_progress')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle()

      if (error) throw error
      if (!progress) {
        return res.status(404).json({ success: false, error: 'User progress not found' })
      }

      let xp = progress.xp_points + Number(xpToAdd || 0)
      let lessons = progress.lessons_completed + (completeLesson ? 1 : 0)
      let badges = Array.isArray(progress.badges) ? progress.badges : JSON.parse(progress.badges || '[]')

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

      const { error: updateError } = await supabase
        .from('academy_progress')
        .update({
          current_level: level,
          lessons_completed: lessons,
          xp_points: xp,
          badges,
          last_updated: new Date().toISOString()
        })
        .eq('user_id', userId)

      if (updateError) throw updateError

      res.json({
        success: true,
        progress: {
          user_id: userId,
          current_level: level,
          lessons_completed: lessons,
          xp_points: xp,
          badges
        }
      })
    } else {
      // SQLite fallback
      const db = getDb()
      const now = nowTimestamp()

      let progress = db.prepare('SELECT * FROM user_progress WHERE user_id = ?').get(userId)
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
      `).run(level, lessons, xp, JSON.stringify(badges), now, userId)

      res.json({
        success: true,
        progress: {
          user_id: userId,
          current_level: level,
          lessons_completed: lessons,
          xp_points: xp,
          badges
        }
      })
    }
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
