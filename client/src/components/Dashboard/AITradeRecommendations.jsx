import { useState, useEffect, useCallback } from 'react'
import { Sparkles, ArrowUpRight, ArrowDownRight, ChevronRight, Settings, AlertTriangle, RefreshCw, Zap, TrendingUp, TrendingDown, Minus } from 'lucide-react'

const STYLE_LABELS = {
  day_trading:  'Day Trading',
  swing_trading:'Swing Trading',
  conservative: 'Conservative'
}

const signalColor = (side) =>
  side === 'BUY'
    ? { pill: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25', dot: 'bg-emerald-400', glow: 'shadow-emerald-500/10' }
    : { pill: 'bg-rose-500/15 text-rose-400 border-rose-500/25', dot: 'bg-rose-400', glow: 'shadow-rose-500/10' }

const confidenceColor = (rate) => {
  if (rate >= 70) return 'text-emerald-400'
  if (rate >= 55) return 'text-amber-400'
  return 'text-rose-400'
}

function ScannerCard({ sug, onQuickSelect }) {
  const sc = signalColor(sug.side)

  return (
    <div className="flex flex-col bg-slate-950/50 border border-slate-800/70 hover:border-purple-500/40 rounded-2xl p-5 gap-4 transition-all duration-300 group hover:bg-slate-950/80 hover:shadow-xl hover:shadow-purple-500/5 relative overflow-hidden">
      {/* Subtle gradient accent on hover */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-purple-500/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      {/* ── Header ─────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-1.5 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xl font-black text-white tracking-tight">{sug.symbol}</span>
            <span className={`flex items-center gap-1 text-[11px] font-black px-2.5 py-0.5 rounded-full border whitespace-nowrap ${sc.pill}`}>
              {sug.side === 'BUY'
                ? <ArrowUpRight className="w-3 h-3 flex-shrink-0" />
                : <ArrowDownRight className="w-3 h-3 flex-shrink-0" />
              }
              {sug.side}
            </span>
          </div>
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded self-start whitespace-nowrap">
            {sug.pattern}
          </span>
        </div>
        {/* Win Rate */}
        <div className="flex-shrink-0 flex flex-col items-center min-w-[40px]">
          <span className={`text-lg font-black leading-none ${confidenceColor(sug.win_rate)}`}>{sug.win_rate}%</span>
          <span className="text-[9px] text-slate-600 uppercase tracking-widest mt-0.5 whitespace-nowrap">Win</span>
        </div>
      </div>

      {/* ── Reason ─────────────────────────────────────── */}
      <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-2 min-h-[32px]">
        {sug.reason}
      </p>

      <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 overflow-hidden text-xs font-mono">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-800/60">
          <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 font-sans whitespace-nowrap">Entry</span>
          <span className="text-sm font-black text-white ml-2">${sug.entry.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-800/60 bg-rose-950/10">
          <span className="text-[9px] font-black uppercase tracking-widest text-rose-500/80 font-sans whitespace-nowrap">SL</span>
          <span className="text-sm font-black text-rose-400 ml-2">${sug.stop_loss.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
        <div className="flex items-center justify-between px-4 py-2.5 bg-emerald-950/10">
          <span className="text-[9px] font-black uppercase tracking-widest text-emerald-500/80 font-sans whitespace-nowrap">Target</span>
          <span className="text-sm font-black text-emerald-400 ml-2">${sug.take_profit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
      </div>

      {/* ── Risk/Reward + Button ────────────────────────── */}
      <div className="flex items-center justify-between gap-2 pt-0.5">
        {(() => {
          const rr = ((sug.take_profit - sug.entry) / (sug.entry - sug.stop_loss))
          const rrSafe = isFinite(rr) && rr > 0 ? rr.toFixed(1) : '—'
          return (
            <span className="text-[10px] text-slate-500 font-bold">
              R:R <span className="text-slate-300">{rrSafe}x</span>
            </span>
          )
        })()}

        {onQuickSelect && (
          <button
            onClick={() => onQuickSelect(sug)}
            className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-500 active:scale-[0.97] text-white text-[11px] font-black px-3.5 py-2 rounded-xl shadow-lg shadow-purple-600/20 transition-all duration-200 whitespace-nowrap"
          >
            Apply setup
            <ChevronRight className="w-3.5 h-3.5 flex-shrink-0" />
          </button>
        )}
      </div>
    </div>
  )
}

function ScannerSkeleton() {
  return (
    <div className="flex flex-col bg-slate-950/30 border border-slate-800/40 rounded-2xl p-5 gap-4 animate-pulse">
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <div className="h-7 w-12 bg-slate-800 rounded-lg" />
            <div className="h-6 w-14 bg-slate-800 rounded-full" />
          </div>
          <div className="h-4 w-24 bg-slate-800 rounded" />
        </div>
        <div className="h-8 w-10 bg-slate-800 rounded" />
      </div>
      <div className="h-8 w-full bg-slate-800 rounded" />
      <div className="rounded-xl border border-slate-800/50 overflow-hidden">
        {[1,2,3].map(i => <div key={i} className="h-10 bg-slate-800/40 border-b border-slate-800/50 last:border-0" />)}
      </div>
      <div className="flex justify-between">
        <div className="h-4 w-16 bg-slate-800 rounded" />
        <div className="h-8 w-28 bg-slate-800 rounded-xl" />
      </div>
    </div>
  )
}

export default function AITradeRecommendations({ portfolioId, onQuickSelect }) {
  const [suggestions, setSuggestions]   = useState([])
  const [style, setStyle]               = useState('swing_trading')
  const [loading, setLoading]           = useState(false)
  const [scanning, setScanning]         = useState(false)
  const [error, setError]               = useState(null)
  const [scanStatus, setScanStatus]     = useState(null)
  const [lastUpdated, setLastUpdated]   = useState(null)

  const fetchSuggestions = useCallback(async (selectedStyle) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/suggestions/daily', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userStyle: selectedStyle })
      })
      const data = await res.json()
      if (data.success) {
        setSuggestions(data.suggestions || [])
        setLastUpdated(new Date())
      } else {
        setError(data.error || 'Failed to load suggestions')
      }
    } catch {
      setError('Cannot connect to the backend server')
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchScanStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/suggestions/scan-status')
      const data = await res.json()
      if (data.success) setScanStatus(data)
    } catch { /* ignore */ }
  }, [])

  const triggerScan = async () => {
    setScanning(true)
    setError(null)
    try {
      const res = await fetch('/api/suggestions/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force: true })
      })
      const data = await res.json()
      if (data.success && !data.skipped) {
        // Refresh suggestions after fresh scan
        await fetchSuggestions(style)
        await fetchScanStatus()
      } else if (data.skipped) {
        setError(`Scan skipped: ${data.reason}. Try again in a moment.`)
      }
    } catch {
      setError('Market scan failed. Check server connection.')
    } finally {
      setScanning(false)
    }
  }

  useEffect(() => {
    fetchSuggestions(style)
    fetchScanStatus()
  }, [style, fetchSuggestions, fetchScanStatus])

  return (
    <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-6 shadow-2xl">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex-shrink-0 bg-gradient-to-br from-purple-500 to-indigo-600 p-2.5 rounded-xl text-white shadow-lg shadow-purple-500/20">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-black text-white leading-tight">AI Trade Scanner</h2>
            <p className="text-[11px] text-slate-500 mt-0.5 truncate">
              {scanStatus?.last_scan_at
                ? `Last scan: ${new Date(scanStatus.last_scan_at).toLocaleTimeString()}`
                : 'Pre-market pattern correlation entries'
              }
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Scan button */}
          <button
            onClick={triggerScan}
            disabled={scanning}
            title="Run fresh market scan"
            className="flex items-center gap-1.5 text-[11px] font-bold px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-3.5 h-3.5 flex-shrink-0 ${scanning ? 'animate-spin' : ''}`} />
            {scanning ? 'Scanning…' : 'Scan Now'}
          </button>

          {/* Style selector */}
          <div className="flex items-center gap-2 bg-slate-950/80 px-3 py-2 rounded-xl border border-slate-800">
            <Settings className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
            <select
              value={style}
              onChange={e => setStyle(e.target.value)}
              className="bg-transparent border-none text-[11px] text-slate-200 focus:ring-0 cursor-pointer outline-none"
            >
              {Object.entries(STYLE_LABELS).map(([k, v]) => (
                <option key={k} value={k} className="bg-slate-950">{v}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ── Error banner ───────────────────────────────────────────── */}
      {error && (
        <div className="flex items-start gap-3 p-3.5 mb-5 bg-rose-950/30 border border-rose-900/50 rounded-xl text-rose-400 text-xs">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* ── Cards grid ─────────────────────────────────────────────── */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          <ScannerSkeleton /><ScannerSkeleton /><ScannerSkeleton />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {suggestions.length > 0 ? suggestions.map((sug, idx) => (
            <ScannerCard key={idx} sug={sug} onQuickSelect={onQuickSelect} />
          )) : !error && (
            <div className="col-span-3 flex flex-col items-center justify-center py-12 gap-3 text-center">
              <Zap className="w-8 h-8 text-slate-700" />
              <p className="text-sm text-slate-500 font-semibold">No suggestions loaded yet</p>
              <button
                onClick={() => fetchSuggestions(style)}
                className="text-xs text-purple-400 hover:text-purple-300 underline underline-offset-2"
              >
                Retry
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Footer ─────────────────────────────────────────────────── */}
      {lastUpdated && !loading && (
        <p className="text-[10px] text-slate-600 mt-4 text-right">
          Prices last refreshed at {lastUpdated.toLocaleTimeString()}
        </p>
      )}
    </div>
  )
}
