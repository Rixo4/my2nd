import { useState, useEffect } from 'react'
import { Bell, Trash, Plus } from 'lucide-react'

export default function PriceAlerts({ activeSymbol, currentPrice }) {
  const [alerts, setAlerts] = useState(() => {
    const saved = localStorage.getItem('price_alerts')
    return saved ? JSON.parse(saved) : []
  })
  const [targetPrice, setTargetPrice] = useState('')
  const [alertType, setAlertType] = useState('above')

  useEffect(() => {
    localStorage.setItem('price_alerts', JSON.stringify(alerts))
  }, [alerts])

  // Check alerts against current price
  useEffect(() => {
    if (!currentPrice) return
    const triggered = alerts.filter(a => {
      if (a.symbol !== activeSymbol) return false
      if (a.type === 'above' && currentPrice >= a.price) return true
      if (a.type === 'below' && currentPrice <= a.price) return true
      return false
    })

    if (triggered.length > 0) {
      triggered.forEach(t => {
        alert(`🚨 ALERT: ${t.symbol} has crossed ${t.type} ${t.price}! (Current: ${currentPrice})`)
      })
      // Clear triggered alerts
      setAlerts(prev => prev.filter(a => !triggered.includes(a)))
    }
  }, [currentPrice, activeSymbol, alerts])

  const addAlert = () => {
    const priceNum = parseFloat(targetPrice)
    if (isNaN(priceNum) || priceNum <= 0) return
    const newAlert = {
      id: Math.random().toString(36).slice(2, 9),
      symbol: activeSymbol,
      price: priceNum,
      type: alertType
    }
    setAlerts(prev => [...prev, newAlert])
    setTargetPrice('')
  }

  const removeAlert = (id) => {
    setAlerts(prev => prev.filter(a => a.id !== id))
  }

  const activeSymbolAlerts = alerts.filter(a => a.symbol === activeSymbol)

  return (
    <div className="sidebar-section mt-4 border-t border-slate-800/60 pt-4">
      <div className="flex items-center gap-2 mb-3">
        <Bell size={14} className="text-brand-400" />
        <h3 className="text-white font-semibold text-sm">Price Alerts ({activeSymbol})</h3>
      </div>

      <div className="flex gap-1.5 mb-3">
        <select 
          value={alertType} 
          onChange={e => setAlertType(e.target.value)}
          className="bg-surface-800 text-slate-300 text-xs rounded-xl border border-slate-700 px-2 py-1.5 focus:outline-none"
        >
          <option value="above">Above</option>
          <option value="below">Below</option>
        </select>
        <input 
          type="number" 
          placeholder="Price..." 
          value={targetPrice}
          onChange={e => setTargetPrice(e.target.value)}
          className="input-field text-xs flex-1"
        />
        <button onClick={addAlert} className="btn-primary p-2 rounded-xl shrink-0">
          <Plus size={14} />
        </button>
      </div>

      <div className="space-y-1.5 max-h-[120px] overflow-y-auto">
        {activeSymbolAlerts.length === 0 ? (
          <p className="text-[10px] text-slate-500 italic">No active alerts for {activeSymbol}.</p>
        ) : (
          activeSymbolAlerts.map(a => (
            <div key={a.id} className="flex items-center justify-between bg-surface-800/40 border border-slate-800 px-2.5 py-1.5 rounded-xl">
              <span className="text-[11px] font-mono text-slate-300">
                {a.type === 'above' ? '≥' : '≤'} ${a.price.toFixed(2)}
              </span>
              <button onClick={() => removeAlert(a.id)} className="text-slate-600 hover:text-red-400 transition-colors">
                <Trash size={12} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
