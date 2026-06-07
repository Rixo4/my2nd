import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { BarChart2, Menu, X, Zap } from 'lucide-react'

const NAV_LINKS = [
  { label: 'Features',   href: '/#features' },
  { label: 'How It Works', href: '/how-it-works' },
  { label: 'Patterns',   href: '/patterns' },
  { label: 'Dashboard',  href: '/dashboard' },
]

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { pathname } = useLocation()
  const isDashboard = pathname === '/dashboard' || pathname === '/patterns'

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-slate-800/50"
         style={{ background: 'rgba(8,8,15,0.85)', backdropFilter: 'blur(20px)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center
                            group-hover:shadow-[0_0_16px_rgba(249,115,22,0.5)] transition-shadow duration-300">
              <BarChart2 size={18} className="text-white" />
            </div>
            <span className="text-white font-bold text-lg tracking-tight">
              Trade<span className="text-brand-500">Wise</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            {NAV_LINKS.map(link => (
              <Link key={link.label} to={link.href}
                    className="text-slate-400 hover:text-white text-sm font-medium transition-colors duration-200">
                {link.label}
              </Link>
            ))}
          </div>

          {/* CTA */}
          <div className="hidden md:flex items-center gap-3">
            <Link to="/login" className="btn-secondary text-sm py-2 px-4">
              Sign In
            </Link>
            <Link to="/login" className="btn-primary text-sm py-2 px-4">
              <Zap size={14} /> Start Free
            </Link>
          </div>

          {/* Mobile toggle */}
          <button className="md:hidden text-slate-400 hover:text-white"
                  onClick={() => setMobileOpen(v => !v)}>
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="md:hidden border-t border-slate-800/50 px-4 py-4 space-y-3"
                      style={{ background: 'rgba(8,8,15,0.98)' }}>
            {NAV_LINKS.map(link => (
              <Link key={link.label} to={link.href} onClick={() => setMobileOpen(false)}
                    className="block text-slate-300 hover:text-white py-2 text-sm font-medium">
                {link.label}
              </Link>
            ))}
            <Link to="/dashboard" onClick={() => setMobileOpen(false)}
                  className="btn-primary text-sm py-2.5 w-full justify-center mt-2">
              <Zap size={14} /> Start Scanning Free
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  )
}
