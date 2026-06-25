import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Landing from './pages/Landing'
import Dashboard from './pages/Dashboard'
import PatternLibrary from './pages/PatternLibrary'
import PatternDetailPage from './pages/PatternDetailPage'
import Login from './pages/Login'
import HowItWorksPage from './pages/HowItWorksPage'
import LearningHubPage from './pages/LearningHubPage'
import ScrollToTop from './components/ScrollToTop'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <ScrollToTop />
        <Routes>
          <Route path="/" element={
            <ProtectedRoute>
              <Landing />
            </ProtectedRoute>
          } />
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />
          <Route path="/patterns" element={
            <ProtectedRoute>
              <PatternLibrary />
            </ProtectedRoute>
          } />
          <Route path="/patterns/:id" element={
            <ProtectedRoute>
              <PatternDetailPage />
            </ProtectedRoute>
          } />
          <Route path="/login" element={<Login />} />
          <Route path="/how-it-works" element={
            <ProtectedRoute>
              <HowItWorksPage />
            </ProtectedRoute>
          } />
          <Route path="/learning-hub" element={
            <ProtectedRoute>
              <LearningHubPage />
            </ProtectedRoute>
          } />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
