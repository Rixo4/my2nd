import { Link } from 'react-router-dom'
import { BarChart2, Twitter, Github, Linkedin } from 'lucide-react'

const LINKS = {
  Product: [
    { label: 'Features', href: '/#features' },
    { label: 'How It Works', href: '/how-it-works' },
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Pattern Library', href: '/patterns' },
  ],
  Resources: [
    { label: 'Documentation', href: '#' },
    { label: 'Trading Glossary', href: '#' },
    { label: 'Blog', href: '#' },
    { label: 'Changelog', href: '#' },
  ],
  Company: [
    { label: 'About', href: '#' },
    { label: 'Careers', href: '#' },
    { label: 'Contact', href: '#' },
    { label: 'Privacy Policy', href: '#' },
  ],
}

export default function Footer() {
  return (
    <footer className="border-t border-slate-800/60 py-16 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 mb-12">
          {/* Brand */}
          <div className="lg:col-span-2">
            <Link to="/" className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center">
                <BarChart2 size={18} className="text-white" />
              </div>
              <span className="text-white font-bold text-lg tracking-tight">
                Trade<span className="text-brand-500">Wise</span>
              </span>
            </Link>
            <p className="text-slate-500 text-sm leading-relaxed max-w-xs mb-6">
              The intelligent candlestick pattern detection platform for modern traders.
              Built to automate analysis, eliminate guesswork, and give every trader a sharper edge.
            </p>
            <div className="flex items-center gap-3">
              {[Twitter, Linkedin, Github].map((Icon, i) => (
                <a key={i} href="#"
                   className="w-9 h-9 rounded-lg bg-surface-700 border border-slate-700/60
                              flex items-center justify-center text-slate-400 hover:text-brand-400
                              hover:border-brand-500/40 transition-all duration-200">
                  <Icon size={16} />
                </a>
              ))}
            </div>
          </div>

          {/* Links */}
          {Object.entries(LINKS).map(([cat, links]) => (
            <div key={cat}>
              <h4 className="text-white font-semibold text-sm mb-4">{cat}</h4>
              <ul className="space-y-3">
                {links.map(link => (
                  <li key={link.label}>
                    <Link to={link.href}
                          className="text-slate-500 hover:text-slate-300 text-sm transition-colors duration-200">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom */}
        <div className="border-t border-slate-800/60 pt-8 space-y-4">
          <p className="text-slate-600 text-xs leading-relaxed max-w-4xl">
            <span className="text-slate-500 font-semibold">⚠ Trading Risk Disclaimer:</span>{' '}
            TradeWise is a technical analysis tool designed to assist in identifying candlestick patterns.
            It does not provide financial advice, investment recommendations, or guaranteed trading signals.
            All trading involves substantial risk of loss. Past pattern performance does not guarantee future results.
            Always conduct your own due diligence and consult a licensed financial advisor before making investment decisions.
          </p>
          <p className="text-slate-700 text-xs">
            © {new Date().getFullYear()} TradeWise Technologies. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
