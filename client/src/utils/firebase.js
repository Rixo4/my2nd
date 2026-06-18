import { initializeApp, getApps, getApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider, GithubAuthProvider } from 'firebase/auth'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
}

// Check if credentials are set
export const isFirebaseConfigured = !!(firebaseConfig.apiKey && firebaseConfig.authDomain)

let app = null
let auth = null
const googleProvider = new GoogleAuthProvider()
const githubProvider = new GithubAuthProvider()

// Configure permissions scopes if needed
googleProvider.addScope('profile')
googleProvider.addScope('email')
githubProvider.addScope('read:user')
githubProvider.addScope('user:email')

if (isFirebaseConfigured) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp()
    auth = getAuth(app)
  } catch (err) {
    console.error('Firebase initialization failed:', err)
  }
}

export { auth, googleProvider, githubProvider }
