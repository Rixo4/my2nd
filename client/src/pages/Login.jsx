import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { BarChart2, Github, Mail, Lock, ArrowRight, ShieldCheck, RefreshCw, AlertCircle, HelpCircle, Key } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  
  // Instructions panel toggle
  const [showConfigHelp, setShowConfigHelp] = useState(false)
  
  const { loginWithOAuth, loginWithEmail, registerWithEmail, isAuthenticated, isFirebaseConfigured } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  // Redirect if already logged in
  useEffect(() => {
    if (isAuthenticated) {
      const from = location.state?.from?.pathname || '/dashboard'
      navigate(from, { replace: true })
    }
  }, [isAuthenticated, navigate, location])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      if (isLogin) {
        await loginWithEmail(email, password)
      } else {
        await registerWithEmail(email, password)
      }
    } catch (err) {
      console.error('Login submission error:', err)
      if (err.code === 'auth/configuration-not-found') {
        setError("Email/Password sign-in provider is disabled in your Firebase Console. Please go to: Firebase Console > Authentication > Sign-in method, and enable 'Email/Password'.")
      } else if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setError('Invalid email address or password.')
      } else if (err.code === 'auth/email-already-in-use') {
        setError('An account already exists with this email address.')
      } else if (err.code === 'auth/weak-password') {
        setError('Password must be at least 6 characters long.')
      } else {
        setError(err.message || 'Authentication failed. Please verify credentials.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleOAuthLogin = async (provider) => {
    setLoading(true)
    setError(null)
    try {
      await loginWithOAuth(provider)
    } catch (err) {
      console.error('OAuth sign-in error:', err)
      if (err.code === 'auth/popup-blocked') {
        setError('Popup was blocked by your browser. Please enable popups for this site.')
      } else if (err.code === 'auth/popup-closed-by-user') {
        setError('Login popup closed before completion.')
      } else {
        setError(err.message || 'OAuth authentication failed.')
      }
    } finally {
      setLoading(false)
    }
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
        className="max-w-md w-full relative z-10 my-10"
      >
        {/* Logo */}
        <div className="flex items-center gap-2.5 justify-center mb-6">
          <div className="w-10 h-10 bg-brand-500 rounded-xl flex items-center justify-center">
            <BarChart2 size={24} className="text-white" />
          </div>
          <span className="text-white font-bold text-2xl tracking-tight">
            Trade<span className="text-brand-500">Wise</span>
          </span>
        </div>

        {/* Configuration Status Banner */}
        <div className="mb-4">
          {isFirebaseConfigured ? (
            <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-3.5 rounded-2xl flex items-center justify-between text-xs gap-3">
              <div className="flex items-center gap-2">
                <ShieldCheck size={16} className="text-emerald-400 shrink-0" />
                <span>Verified Cloud Authentication is Active (Firebase)</span>
              </div>
            </div>
          ) : (
            <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 p-3.5 rounded-2xl flex flex-col gap-2 text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle size={16} className="text-amber-400 shrink-0 animate-pulse" />
                  <span>Sandbox Demo Mode (Mock OAuth Enabled)</span>
                </div>
                <button 
                  onClick={() => setShowConfigHelp(!showConfigHelp)}
                  className="text-amber-400 underline font-bold hover:text-amber-300 transition-colors"
                >
                  Configure Cloud
                </button>
              </div>

              {showConfigHelp && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mt-2 pt-2 border-t border-amber-500/10 text-[10px] text-slate-400 flex flex-col gap-2 leading-relaxed"
                >
                  <p>To connect verified Google/GitHub login, add these variables to your client <code className="text-amber-300">.env</code> file:</p>
                  <pre className="bg-slate-950 p-2.5 rounded-lg text-slate-300 font-mono text-[9px] overflow-x-auto whitespace-pre-wrap select-all">
                    VITE_FIREBASE_API_KEY=your_key_here{"\n"}
                    VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com{"\n"}
                    VITE_FIREBASE_PROJECT_ID=your_project_id{"\n"}
                    VITE_FIREBASE_APP_ID=your_app_id
                  </pre>
                  <p className="flex items-start gap-1">
                    <HelpCircle size={10} className="mt-0.5 shrink-0" />
                    <span>Enable Google and GitHub OAuth providers under Build &gt; Authentication in the Firebase console.</span>
                  </p>
                </motion.div>
              )}
            </div>
          )}
        </div>

        {/* Card */}
        <div className="card p-8 shadow-2xl border-slate-800/50 bg-surface-800/80 backdrop-blur-xl">
          <h2 className="text-2xl font-bold text-white mb-2">
            {isLogin ? 'Welcome back' : 'Create account'}
          </h2>
          <p className="text-slate-400 text-sm mb-8">
            {isLogin 
              ? 'Enter your credentials to access your dashboard.' 
              : 'Create an account to start simulating trades.'}
          </p>

          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs flex items-start gap-2">
              <AlertCircle size={14} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

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
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider">Password</label>
                {isLogin && <span className="text-brand-500 text-[10px] hover:underline font-bold cursor-pointer">Forgot?</span>}
              </div>
              <div className="relative">
                <input 
                  type="password" 
                  placeholder="••••••••"
                  className="input-field pl-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="btn-primary w-full justify-center py-3.5 mt-2 disabled:opacity-50"
            >
              {loading ? (
                <RefreshCw size={18} className="animate-spin" />
              ) : (
                <>
                  {isLogin ? 'Sign In' : 'Get Started'}
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-800"></div></div>
            <div className="relative flex justify-center text-xs uppercase"><span className="bg-surface-800 px-2 text-slate-500">Or continue with</span></div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button 
              onClick={() => handleOAuthLogin('github')}
              disabled={loading}
              className="btn-secondary py-3 justify-center text-xs disabled:opacity-50"
            >
              <Github size={16} /> GitHub
            </button>
            <button 
              onClick={() => handleOAuthLogin('google')}
              disabled={loading}
              className="btn-secondary py-3 justify-center text-xs disabled:opacity-50"
            >
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
