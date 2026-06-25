import { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  BookOpen, Activity, Bitcoin, TrendingUp, Shield, 
  Check, Play, ChevronRight 
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import AdaptiveLearningPath from './Academy/AdaptiveLearningPath'
import PatternTrainingMode from './Academy/PatternTrainingMode'
import { ACADEMY_TRACKS } from '../data/academyData'
import { CANDLE_DATA } from '../data/mockData'
import { detectPatterns } from '../utils/patternDetection'

const IconMap = { BookOpen, Activity, Bitcoin, TrendingUp, Shield }

export default function LearningHubSection() {
  const { user } = useAuth()
  const portfolioId = user?.uid || localStorage.getItem('tradewise_paper_portfolio_id')

  const [learningSubTab, setLearningSubTab] = useState('adaptive')
  const [academyTracks, setAcademyTracks] = useState(ACADEMY_TRACKS)
  const [activeTrackId, setActiveTrackId] = useState('beginner')

  // Load default BTC candles and patterns for Pattern Training mode
  const candles = CANDLE_DATA['BTC'] || []
  const patterns = detectPatterns(candles)

  const handleModuleAction = (trackId, moduleId) => {
    // Mark as completed if not already
    setAcademyTracks(prevTracks => 
      prevTracks.map(track => {
        if (track.id !== trackId) return track
        return {
          ...track,
          modules: track.modules.map(mod => {
            if (mod.id !== moduleId) return mod
            return { ...mod, completed: true }
          })
        }
      })
    )
  }

  const totalModules = academyTracks.reduce((sum, track) => sum + track.modules.length, 0)
  const completedModules = academyTracks.reduce((sum, track) => sum + track.modules.filter(m => m.completed).length, 0)
  const remainingModules = totalModules - completedModules
  const completionPercentage = totalModules > 0 ? Math.round((completedModules / totalModules) * 100) : 0
  const activeTrack = academyTracks.find(t => t.id === activeTrackId) || academyTracks[0]

  return (
    <section id="learning-hub" className="py-24 px-4 bg-surface-900 border-t border-slate-800/40">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="flex flex-col gap-6 w-full"
        >
          {/* Header Section */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
            <div>
              <p className="section-label mb-2 text-brand-400">TRADER ACADEMY</p>
              <h2 className="text-white text-3xl font-extrabold tracking-tight mb-1">Learning Hub</h2>
              <p className="text-slate-400 text-sm">Master investing with AI-guided lessons · Chart explanations</p>
            </div>

            <div className="self-start sm:self-center border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 px-4 py-1.5 rounded-full flex items-center gap-2 text-xs font-semibold shadow-sm">
              <Check size={14} className="text-emerald-400 shrink-0" />
              <span>{completedModules}/{totalModules} modules completed</span>
            </div>
          </div>

          {/* Sub-tab selection */}
          <div className="flex border-b border-slate-800 gap-4 mb-2">
            <button 
              onClick={() => setLearningSubTab('adaptive')} 
              className={`pb-2 px-1 text-xs font-bold transition-all border-b-2 ${
                learningSubTab === 'adaptive' ? 'text-brand-400 border-brand-500' : 'text-slate-500 border-transparent hover:text-white'
              }`}
            >
              AI Lessons & Quizzes
            </button>
            <button 
              onClick={() => setLearningSubTab('spotter')} 
              className={`pb-2 px-1 text-xs font-bold transition-all border-b-2 ${
                learningSubTab === 'spotter' ? 'text-brand-400 border-brand-500' : 'text-slate-500 border-transparent hover:text-white'
              }`}
            >
              Pattern Spotter game
            </button>
            <button 
              onClick={() => setLearningSubTab('traditional')} 
              className={`pb-2 px-1 text-xs font-bold transition-all border-b-2 ${
                learningSubTab === 'traditional' ? 'text-brand-400 border-brand-500' : 'text-slate-500 border-transparent hover:text-white'
              }`}
            >
              Video Courses
            </button>
          </div>

          {learningSubTab === 'adaptive' && (
            <AdaptiveLearningPath userId={portfolioId} />
          )}

          {learningSubTab === 'spotter' && (
            <PatternTrainingMode userId={portfolioId} chartData={candles} activePatterns={patterns} onAwardXp={() => {}} />
          )}

          {learningSubTab === 'traditional' && (
            <>
              {/* Learning Progress Panel */}
              <div className="bg-slate-900/40 border border-slate-800/80 p-6 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex-1 flex flex-col gap-2">
                  <span className="text-white font-bold text-sm">Your Learning Progress</span>
                  <div className="w-full bg-slate-800/60 h-3 rounded-full overflow-hidden">
                    <div 
                      className="bg-gradient-to-r from-cyan-500 to-blue-500 h-full rounded-full transition-all duration-500 ease-out" 
                      style={{ width: `${completionPercentage}%` }}
                    />
                  </div>
                  <span className="text-slate-400 text-xs font-medium">{completionPercentage}% complete</span>
                </div>

                <div className="flex gap-8 items-center">
                  <div className="text-center">
                    <p className="text-white font-bold text-2xl leading-none">{completedModules}</p>
                    <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mt-1">Done</p>
                  </div>
                  <div className="text-center">
                    <p className="text-white font-bold text-2xl leading-none">{remainingModules}</p>
                    <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mt-1">Remaining</p>
                  </div>
                  <div className="text-center">
                    <p className="text-white font-bold text-2xl leading-none">{academyTracks.length}</p>
                    <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mt-1">Tracks</p>
                  </div>
                </div>
              </div>

              {/* Workspace Two-Column Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
                
                {/* Left Column: Sidebar Tracks */}
                <div className="flex flex-col gap-3 lg:col-span-1">
                  {academyTracks.map(track => {
                    const IconComponent = IconMap[track.icon] || BookOpen
                    const isActive = track.id === activeTrackId
                    const completedCount = track.modules.filter(m => m.completed).length
                    const totalCount = track.modules.length

                    return (
                      <button
                        key={track.id}
                        onClick={() => setActiveTrackId(track.id)}
                        className={`flex items-center justify-between p-3.5 rounded-xl border text-left transition-all duration-300 group
                          ${isActive 
                            ? 'border-brand-500/60 bg-brand-500/5 shadow-md shadow-brand-500/5' 
                            : 'border-slate-800/60 bg-slate-900/20 hover:border-slate-700/80 hover:bg-slate-900/40'}`}
                      >
                        <div className="flex items-center gap-3.5">
                          <div className={`p-2.5 rounded-xl border transition-all duration-300
                            ${isActive
                              ? 'border-brand-500/30 bg-brand-500/10 text-brand-400'
                              : 'border-slate-800 bg-slate-900/55 text-slate-400 group-hover:text-slate-300'}`}
                          >
                            <IconComponent size={18} />
                          </div>
                          <div className="flex flex-col">
                            <span className={`text-sm font-bold tracking-wide transition-colors
                              ${isActive ? 'text-white' : 'text-slate-300 group-hover:text-white'}`}>
                              {track.name}
                            </span>
                            <span className="text-[10px] text-slate-500 font-semibold mt-0.5">
                              {completedCount}/{totalCount}
                            </span>
                          </div>
                        </div>
                        <ChevronRight 
                          size={16} 
                          className={`transition-all duration-300
                            ${isActive 
                              ? 'text-brand-400 translate-x-0.5' 
                              : 'text-slate-600 group-hover:text-slate-400'}`} 
                        />
                      </button>
                    )
                  })}
                </div>

                {/* Right Column: Modules List */}
                <div className="lg:col-span-3 bg-slate-900/20 border border-slate-800/60 rounded-2xl p-6 flex flex-col gap-6">
                  
                  {/* Active Track Header */}
                  <div className="flex items-center gap-4 pb-4 border-b border-slate-800/60">
                    <div className="p-3 rounded-xl border border-brand-500/20 bg-brand-500/10 text-brand-400">
                      {(() => {
                        const ActiveIcon = IconMap[activeTrack.icon] || BookOpen
                        return <ActiveIcon size={22} />
                      })()}
                    </div>
                    <div className="flex flex-col">
                      <h3 className="text-white text-xl font-bold">{activeTrack.name}</h3>
                      <p className="text-slate-400 text-xs mt-0.5">
                        {activeTrack.modules.filter(m => m.completed).length} of {activeTrack.modules.length} completed
                      </p>
                    </div>
                  </div>

                  {/* Active Track Modules List */}
                  <div className="flex flex-col gap-3">
                    {activeTrack.modules.map((mod, index) => (
                      <div
                        key={mod.id}
                        className="flex items-center justify-between p-4 rounded-xl border border-slate-800/40 bg-slate-900/30 hover:border-slate-800 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          {/* Completion Indicator Circle */}
                          <div className={`w-6 h-6 rounded-full border flex items-center justify-center shrink-0 text-[11px] font-bold
                            ${mod.completed 
                              ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400' 
                              : 'border-emerald-500/30 text-emerald-400/80 bg-emerald-500/5'}`}
                          >
                            {mod.completed ? (
                              <Check size={12} className="text-emerald-400" />
                            ) : (
                              <span>{index + 1}</span>
                            )}
                          </div>

                          <div className="flex flex-col gap-1">
                            <span className="text-white text-sm font-semibold tracking-wide">
                              {mod.title}
                            </span>
                            <div className="flex items-center gap-1.5 text-slate-500">
                              <span className="text-[10px] font-medium">{mod.duration}</span>
                            </div>
                          </div>
                        </div>

                        {/* Action Button */}
                        <a
                          href={mod.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => handleModuleAction(activeTrack.id, mod.id)}
                          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-300 flex items-center gap-1.5 border shadow-sm
                            ${mod.completed
                              ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-500/30'
                              : 'border-brand-500/80 bg-brand-500/10 text-brand-400 hover:bg-brand-500 hover:text-slate-950 hover:border-brand-500'}`}
                        >
                          <Play size={12} fill="currentColor" className="shrink-0" />
                          <span>{mod.completed ? 'Rewatch' : 'Start'}</span>
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </motion.div>
      </div>
    </section>
  )
}
