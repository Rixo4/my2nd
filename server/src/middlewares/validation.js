import { z } from 'zod'

export const portfolioSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1).max(100).optional(),
  startingBalance: z.number().min(100).max(10000000).optional()
})

export const positionSchema = z.object({
  portfolioId: z.string().min(1),
  symbol: z.string().min(1).max(10),
  quantity: z.number().positive()
})

export const resetSchema = z.object({
  newBalance: z.number().min(100).max(10000000).optional()
})

export const chatSchema = z.object({
  prompt: z.string().min(1),
  portfolioId: z.string().optional(),
  history: z.array(z.any()).optional()
})

export const portfolioHealthSchema = z.object({
  portfolioId: z.string().min(1)
})

export const tradeJournalSchema = z.object({
  portfolioId: z.string().min(1),
  tradeId: z.string().optional(),
  notes: z.string().min(1)
})

export function validateBody(schema) {
  return (req, res, next) => {
    try {
      req.body = schema.parse(req.body)
      next()
    } catch (err) {
      res.status(400).json({ success: false, error: 'Validation Error', details: err.errors })
    }
  }
}
