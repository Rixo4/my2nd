import Navbar from '../components/Navbar'
import Hero from '../components/Hero'
import FeatureCards from '../components/FeatureCards'
import HowItWorks from '../components/HowItWorks'
import PatternShowcase from '../components/PatternShowcase'
import FinalCTA from '../components/FinalCTA'
import Footer from '../components/Footer'

export default function Landing() {
  return (
    <div className="min-h-screen bg-surface-900">
      <Navbar />
      <Hero />
      <FeatureCards />
      <HowItWorks />
      <PatternShowcase />
      <FinalCTA />
      <Footer />
    </div>
  )
}
