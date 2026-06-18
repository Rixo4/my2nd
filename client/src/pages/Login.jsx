import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { BarChart2, Github, Mail, Lock, ArrowRight, Zap } from 'lucide-react'

export default function Login() {
  const [isLogin, setIsLogin] = useState(true)
  const navigate = useNavigate()

  const handleSubmit = (e) => {
    e.preventDefault()
    // Mock login
    navigate('/dashboard')
  }

  return (
    <div className="min-h-screen bg-surface-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-brand-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-brand-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute inset-0 bg-grid-pattern opacity-20 pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full relative z-10"
      >
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 justify-center mb-8 group">
          <div className="w-10 h-10 bg-brand-500 rounded-xl flex items-center justify-center
                          group-hover:shadow-[0_0_20px_rgba(30, 64, 175, 0.6)] transition-all duration-300">
            <BarChart2 size={24} className="text-white" />
          </div>
          <span className="text-white font-bold text-2xl tracking-tight">
            CHART<span className="text-brand-500">IFY</span>
          </span>
        </Link>

        {/* Card */}
        <div className="card p-8 shadow-2xl border-slate-800/50 bg-surface-800/80 backdrop-blur-xl">
          <h2 className="text-2xl font-bold text-white mb-2">
            {isLogin ? 'Welcome back' : 'Create account'}
          </h2>
          <p className="text-slate-400 text-sm mb-8">
            {isLogin 
              ? 'Enter your credentials to access your dashboard.' 
              : 'Start your 14-day free trial. No credit card required.'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Full Name</label>
                <div className="relative">
                  <input 
                    type="text" 
                    placeholder="John Doe"
                    className="input-field pl-10"
                    required
                  />
                  <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                </div>
              </div>
            )}
            
            <div>
              <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Email Address</label>
              <div className="relative">
                <input 
                  type="email" 
                  placeholder="name@company.com"
                  className="input-field pl-10"
                  required
                />
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider">Password</label>
                {isLogin && <a href="#" className="text-brand-500 text-[10px] hover:underline font-bold">Forgot?</a>}
              </div>
              <div className="relative">
                <input 
                  type="password" 
                  placeholder="••••••••"
                  className="input-field pl-10"
                  required
                />
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              </div>
            </div>

            <button type="submit" className="btn-primary w-full justify-center py-3.5 mt-2">
              {isLogin ? 'Sign In' : 'Get Started'}
              <ArrowRight size={18} />
            </button>
          </form>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-800"></div></div>
            <div className="relative flex justify-center text-xs uppercase"><span className="bg-surface-800 px-2 text-slate-500">Or continue with</span></div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button className="btn-secondary py-3 justify-center text-xs">
              <Github size={16} /> GitHub
            </button>
            <button className="btn-secondary py-3 justify-center text-xs">
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="currentColor" d="M12.48 10.92v3.28h7.84c-.24 1.84-.908 3.152-1.808 4.056-1.144 1.144-2.936 2.4-6.032 2.4-4.824 0-8.624-3.904-8.624-8.736s3.8-8.736 8.624-8.736c2.6 0 4.504 1.024 5.904 2.344l2.304-2.304C18.592 1.024 15.9 0 12.48 0 5.584 0 0 5.584 0 12.48s5.584 12.48 12.48 12.48c3.744 0 6.56-1.232 8.776-3.536 2.256-2.256 2.968-5.416 2.968-8.152 0-.792-.072-1.544-.216-2.312H12.48z"/>
              </svg>
              Google
            </button>
          </div>

          <p className="text-center text-slate-500 text-sm mt-8">
            {isLogin ? "Don't have an account?" : "Already have an account?"}{' '}
            <button 
              onClick={() => setIsLogin(!isLogin)}
              className="text-brand-500 font-bold hover:underline"
            >
              {isLogin ? 'Sign up' : 'Log in'}
            </button>
          </p>
        </div>

        {/* Footer info */}
        <p className="text-center text-slate-600 text-[10px] mt-8 uppercase tracking-widest">
          Secure encryption • 256-bit SSL • PCI DSS Compliant
        </p>
      </motion.div>
    </div>
  )
}
