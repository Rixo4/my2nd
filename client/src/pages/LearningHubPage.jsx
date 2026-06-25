import Navbar from '../components/Navbar'
import LearningHubSection from '../components/LearningHubSection'
import Footer from '../components/Footer'

export default function LearningHubPage() {
  return (
    <div className="min-h-screen bg-surface-900">
      <Navbar />
      <main className="pt-16">
        <LearningHubSection />
      </main>
      <Footer />
    </div>
  )
}
