import { useState, useEffect } from 'react'
import { Cpu, RefreshCw, CheckCircle } from 'lucide-react'

export default function ScannerControls() {
  const [status, setStatus] = useState({
    last_scan_at: null,
    scan_in_progress: false,
    next_scan_available_in_ms: 0
  })
  const [loading, setLoading] = useState(false)
  const [logs, setLogs] = useState([])

  const fetchStatus = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/suggestions/scan-status')
      const data = await res.json()
      if (data.success) {
        setStatus({
          last_scan_at: data.last_scan_at,
          scan_in_progress: data.scan_in_progress,
          next_scan_available_in_ms: data.next_scan_available_in_ms
        })
      }
    } catch (err) {
      console.error('Error fetching scanner status:', err)
    }
  }

  useEffect(() => {
    fetchStatus()
    const interval = setInterval(fetchStatus, 15000)
    return () => clearInterval(interval)
  }, [])

  const handleScan = async () => {
    setLoading(true)
    setLogs(prev => [`[${new Date().toLocaleTimeString()}] Triggering scan...`, ...prev])
    try {
      const res = await fetch('http://localhost:5000/api/suggestions/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force: true })
      })
      const data = await res.json()
      if (data.success) {
        setLogs(prev => [
          `[${new Date().toLocaleTimeString()}] Scan complete! Found ${data.patterns_found} patterns.`,
          ...prev
        ])
        fetchStatus()
      } else {
        setLogs(prev => [
          `[${new Date().toLocaleTimeString()}] Scan skipped: ${data.reason || 'rate limited'}`,
          ...prev
        ])
      }
    } catch (err) {
      setLogs(prev => [`[${new Date().toLocaleTimeString()}] Scan failed: ${err.message}`, ...prev])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="sidebar-section mt-4 border-t border-slate-800/60 pt-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Cpu size={14} className="text-brand-400" />
          <h3 className="text-white font-semibold text-sm">AI Market Scanner</h3>
        </div>
        {status.scan_in_progress || loading ? (
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-500"></span>
          </span>
        ) : (
          <CheckCircle size={12} className="text-emerald-500" />
        )}
      </div>

      <div className="bg-surface-800/40 border border-slate-800 p-2.5 rounded-xl text-[10px] space-y-1.5 text-slate-300">
        <div className="flex justify-between">
          <span className="text-slate-500">Last Scan:</span>
          <span className="font-mono">
            {status.last_scan_at ? new Date(status.last_scan_at).toLocaleTimeString() : 'Never'}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Status:</span>
          <span>{status.scan_in_progress || loading ? 'Scanning assets...' : 'Idle'}</span>
        </div>
      </div>

      <button 
        onClick={handleScan}
        disabled={status.scan_in_progress || loading}
        className="btn-primary w-full mt-3 py-2 text-xs flex items-center justify-center gap-2 rounded-xl"
      >
        <RefreshCw size={12} className={status.scan_in_progress || loading ? 'animate-spin' : ''} />
        Scan Live Assets
      </button>

      {logs.length > 0 && (
        <div className="mt-3 bg-slate-950/80 border border-slate-800/50 p-2 rounded-xl max-h-[80px] overflow-y-auto font-mono text-[9px] text-brand-400/90 space-y-1">
          {logs.map((log, idx) => (
            <div key={idx} className="truncate">{log}</div>
          ))}
        </div>
      )}
    </div>
  )
}
