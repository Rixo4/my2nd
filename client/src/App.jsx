import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Landing from './pages/Landing'
import Dashboard from './pages/Dashboard'
import PatternLibrary from './pages/PatternLibrary'
import PatternDetailPage from './pages/PatternDetailPage'
import Login from './pages/Login'
import HowItWorksPage from './pages/HowItWorksPage'
import ScrollToTop from './components/ScrollToTop'

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/patterns" element={<PatternLibrary />} />
        <Route path="/patterns/:id" element={<PatternDetailPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/how-it-works" element={<HowItWorksPage />} />
      </Routes>
    </BrowserRouter>
  )
}
