import { createContext, useContext, useState, useEffect } from 'react'
import { 
  signInWithPopup, signOut, onAuthStateChanged, 
  signInWithEmailAndPassword, createUserWithEmailAndPassword 
} from 'firebase/auth'
import { auth, googleProvider, githubProvider, isFirebaseConfigured } from '../utils/firebase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // Listen for Firebase auth state changes
  useEffect(() => {
    if (!isFirebaseConfigured) {
      const saved = localStorage.getItem('tradewise_auth_user')
      if (saved) {
        setUser(JSON.parse(saved))
      }
      setLoading(false)
      return
    }

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        // Map user data
        const mappedUser = {
          uid: firebaseUser.uid,
          name: firebaseUser.displayName || 'Firebase User',
          email: firebaseUser.email,
          avatar: firebaseUser.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
          provider: firebaseUser.providerData?.[0]?.providerId === 'google.com' ? 'Google' : 'GitHub'
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

    return () => unsubscribe()
  }, [])

  const loginWithOAuth = async (providerName) => {
    if (!isFirebaseConfigured) {
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
      const provider = providerName === 'google' ? googleProvider : githubProvider
      const result = await signInWithPopup(auth, provider)
      return { success: true, user: result.user }
    } catch (err) {
      console.error('Firebase OAuth Error:', err)
      throw err
    }
  }

  const loginWithEmail = async (email, password) => {
    if (!isFirebaseConfigured) {
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
      const result = await signInWithEmailAndPassword(auth, email, password)
      return { success: true, user: result.user }
    } catch (err) {
      console.error('Firebase Email Login Error:', err)
      throw err
    }
  }

  const registerWithEmail = async (email, password) => {
    if (!isFirebaseConfigured) {
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
      const result = await createUserWithEmailAndPassword(auth, email, password)
      return { success: true, user: result.user }
    } catch (err) {
      console.error('Firebase Email Register Error:', err)
      throw err
    }
  }

  const logout = async () => {
    localStorage.removeItem('tradewise_auth_user')
    localStorage.removeItem('tradewise_paper_portfolio_id')
    setUser(null)

    if (isFirebaseConfigured) {
      try {
        await signOut(auth)
      } catch (err) {
        console.error('Firebase SignOut Error:', err)
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
      isFirebaseConfigured 
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
