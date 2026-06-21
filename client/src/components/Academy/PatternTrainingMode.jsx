import { useState } from 'react'
import Chart from '../Chart'
import { CheckCircle2, XCircle, Info, Sparkles, MapPin, Eye, Zap, HelpCircle, Target } from 'lucide-react'

const PATTERNS_LIST = [
  'Doji',
  'Hammer',
  'Inverted Hammer',
  'Hanging Man',
  'Spinning Top',
  'Bullish Engulfing',
  'Bearish Engulfing',
  'Morning Star',
  'Evening Star'
]

export default function PatternTrainingMode({ userId, chartData, activePatterns = [], onAwardXp }) {
  const [clickedCandle, setClickedCandle] = useState(null)
  const [selectedPattern, setSelectedPattern] = useState('Hammer')
  const [validationResult, setValidationResult] = useState(null)
  const [cheatShow, setCheatShow] = useState(false)

  const handleChartClick = (param) => {
    if (!param.time) return
    setClickedCandle(param)
    setValidationResult(null)
  }

  const handleValidate = async () => {
    if (!clickedCandle) return

    // Geometric check: Find if any true pattern exists at/near the clicked timestamp
    // Since multi-candle patterns cover multiple timestamps (p.times array),
    // check if clicked time is included in p.times.
    const clickedTime = clickedCandle.time

    const matchingPattern = activePatterns.find(p => {
      // Allow exact match or offset by +/- 1 bar
      return p.times.some(t => Math.abs(t - clickedTime) <= 86400) // 86400 represents 1 day/bar timeframe
    })

    if (matchingPattern) {
      // Check if selected pattern type matches the true pattern type
      const isTypeCorrect = matchingPattern.pattern.toLowerCase().includes(selectedPattern.toLowerCase()) || 
                            selectedPattern.toLowerCase().includes(matchingPattern.pattern.toLowerCase())
      
      if (isTypeCorrect) {
        setValidationResult({
          correct: true,
          message: `🎯 Spot On! You detected a ${matchingPattern.pattern} pattern correctly. +100 XP gained!`,
          details: `The pattern had a ${matchingPattern.signal} trend signal with high confidence.`
        })

        // Call backend progress to award 100 XP
        if (userId) {
          try {
            await fetch(`/api/academy/progress/${userId}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ xpToAdd: 100, completeLesson: false })
            })
            if (onAwardXp) onAwardXp()
          } catch (err) {
            console.error('Failed to submit XP:', err)
          }
        }
      } else {
        setValidationResult({
          correct: false,
          message: `⚠️ Close, but not quite! A pattern is there, but it is actually a "${matchingPattern.pattern}".`,
          details: `You selected "${selectedPattern}". Study the differences in shape.`
        })
      }
    } else {
      setValidationResult({
        correct: false,
        message: "❌ No pattern found here. Keep scanning the chart!",
        details: "Look for long wicks (Hammer/Doji) or large candles eclipsing previous ones (Engulfing)."
      })
    }
  }

  const dateStr = clickedCandle 
    ? new Date(clickedCandle.time * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    : ''

  return (
    <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-600/10 border border-emerald-500/25 p-2 rounded-xl text-emerald-400">
            <Target className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-1.5">
              Interactive Pattern Spotting Mode
            </h2>
            <p className="text-xs text-slate-400">Train your eyes to find key setups and earn XP</p>
          </div>
        </div>

        {/* Reveal Toggle */}
        <button
          onClick={() => setCheatShow(!cheatShow)}
          className={`px-3 py-1.5 rounded-lg border text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5 ${
            cheatShow 
              ? 'bg-purple-600/20 text-purple-400 border-purple-500/30' 
              : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
          }`}
        >
          <Eye className="w-3.5 h-3.5" />
          <span>{cheatShow ? "Hide Patterns" : "Reveal Answer"}</span>
        </button>
      </div>

      {/* Candlestick Chart */}
      <div className="relative">
        <Chart 
          data={chartData} 
          patterns={activePatterns} 
          showPatterns={cheatShow}
          onChartClick={handleChartClick}
          height={380} 
        />
        {!clickedCandle && (
          <div className="absolute inset-0 bg-slate-950/20 pointer-events-none flex items-center justify-center">
            <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl text-center shadow-2xl max-w-sm pointer-events-auto">
              <Info className="w-6 h-6 text-purple-400 mx-auto mb-2 animate-bounce" />
              <p className="text-xs font-bold text-slate-200">Interactive Spotting Instructions</p>
              <p className="text-[10px] text-slate-400 mt-1">
                Click on any candlestick bar on the chart where you suspect a pattern, identify the type, and validate.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Control Console */}
      {clickedCandle && (
        <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-5 grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          {/* Coordinates */}
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-slate-400 text-xs">
              <MapPin className="w-3.5 h-3.5 text-purple-400" />
              <span>Selected Candlestick</span>
            </div>
            <p className="text-base font-black text-white">{dateStr}</p>
            <p className="text-xs text-slate-400">Price selected: ${clickedCandle.price.toFixed(2)}</p>
          </div>

          {/* Form Selection */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-300">Identify Pattern Shape</label>
            <select
              value={selectedPattern}
              onChange={(e) => setSelectedPattern(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none"
            >
              {PATTERNS_LIST.map((p, idx) => (
                <option key={idx} value={p}>{p}</option>
              ))}
            </select>
          </div>

          {/* Button Validation */}
          <div className="flex flex-col gap-2">
            <button
              onClick={handleValidate}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold px-6 py-2.5 rounded-xl shadow-lg shadow-emerald-600/10 transition-transform active:scale-[0.98]"
            >
              Validate Spot
            </button>
            <span className="text-[10px] text-slate-500 text-center">Correct spots grant 100 XP</span>
          </div>
        </div>
      )}

      {/* Validation Answer Cards */}
      {validationResult && (
        <div className={`p-5 rounded-xl border flex items-start gap-4 ${
          validationResult.correct 
            ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400' 
            : 'bg-rose-500/5 border-rose-500/20 text-rose-400'
        }`}>
          {validationResult.correct ? (
            <CheckCircle2 className="w-8 h-8 flex-shrink-0 text-emerald-400 fill-emerald-500/5" />
          ) : (
            <XCircle className="w-8 h-8 flex-shrink-0 text-rose-400 fill-rose-500/5" />
          )}
          <div>
            <h4 className="text-sm font-bold text-slate-200 mb-1">{validationResult.message}</h4>
            <p className="text-xs text-slate-400 leading-relaxed">{validationResult.details}</p>
          </div>
        </div>
      )}
    </div>
  )
}
