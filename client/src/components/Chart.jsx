import { useEffect, useRef, useState } from 'react'
import { createChart, CrosshairMode } from 'lightweight-charts'
import { Plus, Minus, Maximize2, PenTool, Square, Trash2, MousePointer2, Eye, EyeOff } from 'lucide-react'

export default function Chart({ data, patterns = [], height = 420, showPatterns: propShowPatterns, onShowPatternsChange, onChartClick }) {
  const containerRef = useRef(null)
  const chartRef = useRef(null)
  const seriesRef = useRef(null)
  const drawingSeriesRef = useRef([])
  const [drawingMode, setDrawingMode] = useState('view') // 'view', 'line', 'box'
  const [drawings, setDrawings] = useState([]) // { type: 'line', points: [{time, price}] }
  const [isDrawing, setIsDrawing] = useState(false)
  const [localShowPatterns, setLocalShowPatterns] = useState(true)
  const [chartError, setChartError] = useState(null)

  const showPatterns = propShowPatterns !== undefined ? propShowPatterns : localShowPatterns
  const setShowPatterns = onShowPatternsChange !== undefined ? onShowPatternsChange : setLocalShowPatterns

  useEffect(() => {
    if (!containerRef.current) return

    try {
      const chart = createChart(containerRef.current, {
      layout: {
        background: { color: '#0d0d18' },
        textColor: '#64748b',
        fontSize: 11,
        fontFamily: 'JetBrains Mono, monospace',
      },
      grid: {
        vertLines: { color: '#1a1a2e', style: 1 },
        horzLines: { color: '#1a1a2e', style: 1 },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: '#1e40af', width: 1, style: 2, labelBackgroundColor: '#1e40af' },
        horzLine: { color: '#1e40af', width: 1, style: 2, labelBackgroundColor: '#1e40af' },
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: true,
      },
      handleScale: {
        axisPressedMouseMove: {
          time: true,
          price: true,
        },
        mouseWheel: true,
        pinch: true,
      },
      rightPriceScale: {
        borderColor: '#1a1a2e',
        textColor: '#64748b',
        autoScale: true,
        alignLabels: true,
        borderVisible: true,
      },
      timeScale: {
        borderColor: '#1a1a2e',
        timeVisible: true,
        secondsVisible: false,
        barSpacing: 10,
        minBarSpacing: 0.5,
        rightOffset: 12,
        fixLeftEdge: false,
        lockVisibleTimeRangeOnResize: true,
      },
      width: containerRef.current.clientWidth,
      height,
    })

    const series = chart.addCandlestickSeries({
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderVisible: false,
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444',
    })

    chartRef.current = chart
    seriesRef.current = series

    // Drawing Tool Interaction
    chart.subscribeClick((param) => {
      if (!param.time || !param.point) return

      const price = series.coordinateToPrice(param.point.y)
      const time = param.time

      if (onChartClick) {
        onChartClick({ time, price })
      }

      if (drawingMode === 'view') return

      if (!isDrawing) {
        setIsDrawing(true)
        setDrawings(prev => [...prev, { type: drawingMode, points: [{ time, price }] }])
      } else {
        setIsDrawing(false)
        setDrawings(prev => {
          const last = prev[prev.length - 1]
          last.points.push({ time, price })
          return [...prev]
        })
      }
    })

    const resizeObserver = new ResizeObserver(() => {
      if (containerRef.current) {
        chart.applyOptions({ width: containerRef.current.clientWidth })
      }
    })
    resizeObserver.observe(containerRef.current)

    return () => {
      resizeObserver.disconnect()
      chart.remove()
      chartRef.current = null
      seriesRef.current = null
    }
    } catch (error) {
      console.error('Error initializing chart:', error)
      setChartError('Failed to initialize chart')
    }
  }, [height, drawingMode, isDrawing])

  // Update Data and Markers
  useEffect(() => {
    if (!seriesRef.current || !data?.length) return
    try {
      seriesRef.current.setData(data)

      if (showPatterns && patterns.length > 0) {
        const markersMap = new Map()
        patterns.slice(0, 30).forEach(p => {
          p.times.forEach((t, idx) => {
            const isLast = idx === p.times.length - 1
            const newMarker = {
              time: t,
              position: p.signal === 'bullish' ? 'belowBar' : p.signal === 'bearish' ? 'aboveBar' : 'inBar',
              color: p.signal === 'bullish' ? 'rgba(34, 197, 94, 0.8)' : p.signal === 'bearish' ? 'rgba(239, 68, 68, 0.8)' : 'rgba(245, 158, 11, 0.8)',
              shape: isLast 
                ? (p.signal === 'bullish' ? 'arrowUp' : p.signal === 'bearish' ? 'arrowDown' : 'circle')
                : 'square',
              text: isLast ? p.pattern : '',
              size: isLast ? 1.2 : 0.6,
            }
            if (!markersMap.has(t) || isLast) {
              markersMap.set(t, newMarker)
            }
          })
        })
        const allMarkers = Array.from(markersMap.values()).sort((a, b) => a.time - b.time)
        seriesRef.current.setMarkers(allMarkers)
      } else {
        seriesRef.current.setMarkers([])
      }

      if (chartRef.current && data?.length && !chartRef.current._hasFittedOnce) {
        chartRef.current.timeScale().fitContent()
        chartRef.current._hasFittedOnce = true
      }
    } catch (error) {
      console.error('Error updating chart data:', error)
    }
  }, [data, patterns, showPatterns])

  // Render Drawings
  useEffect(() => {
    if (!chartRef.current) return
    
    try {
      // Clear old drawing series
      drawingSeriesRef.current.forEach(s => chartRef.current.removeSeries(s))
      drawingSeriesRef.current = []

      drawings.forEach(d => {
        if (d.points.length < 2) return
        
        const lineSeries = chartRef.current.addLineSeries({
          color: d.type === 'box' ? 'rgba(30, 64, 175, 0.5)' : '#1e40af',
          lineWidth: 2,
          lineStyle: 0,
        })
        
        if (d.type === 'line') {
          // Simple line between 2 points
          lineSeries.setData([
            { time: d.points[0].time, value: d.points[0].price },
            { time: d.points[1].time, value: d.points[1].price }
          ])
        } else if (d.type === 'box') {
          // Boxes are harder in lightweight-charts without custom series,
          // so we draw 4 lines for now to simulate a box
          const p1 = d.points[0]
          const p2 = d.points[1]
          lineSeries.setData([
            { time: p1.time, value: p1.price },
            { time: p2.time, value: p1.price },
            { time: p2.time, value: p2.price },
            { time: p1.time, value: p2.price },
            { time: p1.time, value: p1.price },
          ])
        }
        
        drawingSeriesRef.current.push(lineSeries)
      })
    } catch (error) {
      console.error('Error rendering drawings:', error)
    }
  }, [drawings])

  const zoomIn = () => {
    try {
      chartRef.current?.timeScale().scaleAroundCenter(1.4)
    } catch (error) {
      console.error('Error zooming in:', error)
    }
  }
  const zoomOut = () => {
    try {
      chartRef.current?.timeScale().scaleAroundCenter(0.6)
    } catch (error) {
      console.error('Error zooming out:', error)
    }
  }
  const resetZoom = () => {
    try {
      chartRef.current?.timeScale().fitContent()
    } catch (error) {
      console.error('Error resetting zoom:', error)
    }
  }
  const clearDrawings = () => setDrawings([])

  if (chartError) {
    return (
      <div className="relative rounded-xl overflow-hidden border border-slate-800/60 bg-surface-800 p-8 text-center">
        <p className="text-red-400 font-bold mb-2">Chart Error</p>
        <p className="text-slate-400 text-sm">{chartError}</p>
        <p className="text-slate-500 text-xs mt-4">Candles loaded: {data?.length || 0}</p>
      </div>
    )
  }

  return (
    <div className="relative rounded-xl overflow-hidden border border-slate-800/60 group">
      <div ref={containerRef} className="w-full" />
      
      {/* Drawing Toolbar (Side) */}
      <div className="absolute top-6 left-6 flex flex-col gap-2 z-20">
        <button onClick={() => setDrawingMode('view')} 
                className={`w-10 h-10 rounded-lg backdrop-blur border flex items-center justify-center transition-all shadow-xl
                  ${drawingMode === 'view' ? 'bg-brand-500 text-white border-brand-400' : 'bg-surface-700/80 text-slate-300 border-slate-700'}`}
                title="Cursor">
          <MousePointer2 size={18} />
        </button>
        <button onClick={() => setDrawingMode('line')} 
                className={`w-10 h-10 rounded-lg backdrop-blur border flex items-center justify-center transition-all shadow-xl
                  ${drawingMode === 'line' ? 'bg-brand-500 text-white border-brand-400' : 'bg-surface-700/80 text-slate-300 border-slate-700'}`}
                title="Trendline">
          <PenTool size={18} />
        </button>
        <button onClick={() => setDrawingMode('box')} 
                className={`w-10 h-10 rounded-lg backdrop-blur border flex items-center justify-center transition-all shadow-xl
                  ${drawingMode === 'box' ? 'bg-brand-500 text-white border-brand-400' : 'bg-surface-700/80 text-slate-300 border-slate-700'}`}
                title="Box Tool">
          <Square size={18} />
        </button>
        <button onClick={clearDrawings} 
                className="w-10 h-10 rounded-lg bg-surface-700/80 backdrop-blur border border-slate-700 flex items-center justify-center text-slate-300 hover:text-red-400 transition-all shadow-xl"
                title="Clear All">
          <Trash2 size={18} />
        </button>
      </div>

      {/* Zoom Controls Overlay */}
      <div className="absolute bottom-6 right-6 flex flex-col gap-2 z-20 opacity-40 group-hover:opacity-100 transition-opacity duration-300">
        <button onClick={zoomIn} className="w-10 h-10 rounded-lg bg-surface-700/80 backdrop-blur border border-slate-700 flex items-center justify-center text-slate-300 hover:text-brand-400 transition-all shadow-xl">
          <Plus size={18} />
        </button>
        <button onClick={zoomOut} className="w-10 h-10 rounded-lg bg-surface-700/80 backdrop-blur border border-slate-700 flex items-center justify-center text-slate-300 hover:text-brand-400 transition-all shadow-xl">
          <Minus size={18} />
        </button>
        <button onClick={resetZoom} className="w-10 h-10 rounded-lg bg-surface-700/80 backdrop-blur border border-slate-700 flex items-center justify-center text-slate-300 hover:text-brand-400 transition-all shadow-xl">
          <Maximize2 size={16} />
        </button>
      </div>

      {/* Pattern Toggle Button */}
      <div className="absolute top-6 right-6 z-20">
        <button 
          onClick={() => setShowPatterns(!showPatterns)}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg backdrop-blur border text-xs font-bold uppercase tracking-wider transition-all shadow-xl
            ${showPatterns 
              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/30' 
              : 'bg-surface-700/80 text-slate-300 border-slate-700 hover:text-white'}`}
          title={showPatterns ? "Switch to Normal Chart" : "Show AI Patterns"}
        >
          {showPatterns ? <Eye size={14} /> : <EyeOff size={14} />}
          <span>{showPatterns ? "Patterns On" : "Normal Chart"}</span>
        </button>
      </div>

      {drawingMode !== 'view' && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-brand-500 text-white text-[10px] font-bold px-4 py-2 rounded-full shadow-xl z-30 animate-pulse">
          DRAWING MODE: CLICK TO START/END {drawingMode.toUpperCase()}
        </div>
      )}
    </div>
  )
}
