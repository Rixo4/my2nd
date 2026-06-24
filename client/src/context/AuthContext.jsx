import { createContext, useContext, useState, useEffect } from 'react'
import { supabase, isSupabaseConfigured } from '../utils/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // Listen for Supabase auth state changes
  useEffect(() => {
    if (!isSupabaseConfigured) {
      const saved = localStorage.getItem('tradewise_auth_user')
      if (saved) {
        setUser(JSON.parse(saved))
      }
      setLoading(false)
      return
    }

    // Get active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const mappedUser = {
          uid: session.user.id,
          name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'Trader',
          email: session.user.email,
          avatar: session.user.user_metadata?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
          provider: session.user.app_metadata?.provider || 'Email Credentials'
        }
        localStorage.setItem('tradewise_auth_user', JSON.stringify(mappedUser))
        setUser(mappedUser)
      } else {
        setUser(null)
      }
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        const mappedUser = {
          uid: session.user.id,
          name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'Trader',
          email: session.user.email,
          avatar: session.user.user_metadata?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
          provider: session.user.app_metadata?.provider || 'Email Credentials'
        }
        localStorage.setItem('tradewise_auth_user', JSON.stringify(mappedUser))
        setUser(mappedUser)
      } else {
        localStorage.removeItem('tradewise_auth_user')
        localStorage.removeItem('tradewise_paper_portfolio_id')
        setUser(null)
      }
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const loginWithOAuth = async (providerName) => {
    if (!isSupabaseConfigured) {
      let mockUser = {}
      if (providerName === 'google') {
        mockUser = {
          uid: 'mock-google-uid-12345',
          name: 'Google Trader',
          email: 'trader.wise@gmail.com',
          avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80',
          provider: 'Google'
        }
      } else {
        mockUser = {
          uid: 'mock-github-uid-67890',
          name: 'Octo Developer',
          email: 'developer@github.com',
          avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=120&auto=format&fit=crop&q=80',
          provider: 'GitHub'
        }
      }
      localStorage.setItem('tradewise_auth_user', JSON.stringify(mockUser))
      setUser(mockUser)
      return { success: true, user: mockUser }
    }

    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: providerName,
        options: {
          redirectTo: window.location.origin
        }
      })
      if (error) throw error
      return { success: true, data }
    } catch (err) {
      console.error('Supabase OAuth Error:', err)
      throw err
    }
  }

  const loginWithEmail = async (email, password) => {
    if (!isSupabaseConfigured) {
      const mockUser = {
        uid: 'mock-cred-uid-99999',
        name: email.split('@')[0] || 'Wise Trader',
        email: email,
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
        provider: 'Email Credentials'
      }
      localStorage.setItem('tradewise_auth_user', JSON.stringify(mockUser))
      setUser(mockUser)
      return { success: true, user: mockUser }
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      return { success: true, user: data.user }
    } catch (err) {
      console.error('Supabase Email Login Error:', err)
      throw err
    }
  }

  const registerWithEmail = async (email, password) => {
    if (!isSupabaseConfigured) {
      const mockUser = {
        uid: 'mock-cred-uid-99999',
        name: email.split('@')[0] || 'Wise Trader',
        email: email,
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
        provider: 'Email Credentials'
      }
      localStorage.setItem('tradewise_auth_user', JSON.stringify(mockUser))
      setUser(mockUser)
      return { success: true, user: mockUser }
    }

    try {
      const { data, error } = await supabase.auth.signUp({ email, password })
      if (error) throw error
      return { success: true, user: data.user }
    } catch (err) {
      console.error('Supabase Email Register Error:', err)
      throw err
    }
  }

  const logout = async () => {
    localStorage.removeItem('tradewise_auth_user')
    localStorage.removeItem('tradewise_paper_portfolio_id')
    setUser(null)

    if (isSupabaseConfigured) {
      try {
        await supabase.auth.signOut()
      } catch (err) {
        console.error('Supabase SignOut Error:', err)
      }
    }
  }

  const isAuthenticated = !!user

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      isAuthenticated, 
      loginWithOAuth, 
      loginWithEmail, 
      registerWithEmail, 
      logout,
      isSupabaseConfigured 
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
