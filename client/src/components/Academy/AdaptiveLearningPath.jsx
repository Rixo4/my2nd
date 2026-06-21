import { useState, useEffect } from 'react'
import { Award, BookOpen, CheckCircle, HelpCircle, GraduationCap, ArrowRight, Zap, Target } from 'lucide-react'

const TOPICS = [
  { id: 'doji_spinning', title: 'Doji & Spinning Tops', minXP: 0 },
  { id: 'engulfing_reversals', title: 'Engulfing Breakouts', minXP: 100 },
  { id: 'morning_evening_stars', title: 'Star Pattern Reversals', minXP: 250 },
  { id: 'position_sizing_atr', title: 'Position Sizing & ATR', minXP: 400 },
  { id: 'news_sentiment_correlations', title: 'Sentiment & Technicals', minXP: 600 }
]

const BADGES = {
  doji_master: { name: 'Doji Master', icon: '🕯️', desc: 'Completed the Doji & Spinning Tops Module' },
  risk_manager: { name: 'Risk Manager', icon: '🛡️', desc: 'Completed the Position Sizing Module' },
  sentiment_analyst: { name: 'Sentiment Pro', icon: '📰', desc: 'Completed the Sentiment & Correlation Module' }
}

export default function AdaptiveLearningPath({ userId }) {
  const [progress, setProgress] = useState(null)
  const [selectedTopic, setSelectedTopic] = useState(null)
  const [lesson, setLesson] = useState(null)
  const [quizAnswer, setQuizAnswer] = useState(null)
  const [quizSubmitted, setQuizSubmitted] = useState(false)
  const [selectedOption, setSelectedOption] = useState(null)
  const [loading, setLoading] = useState(false)
  const [quizScoreAwarded, setQuizScoreAwarded] = useState(false)

  const fetchProgress = async () => {
    if (!userId) return
    try {
      const res = await fetch(`/api/academy/progress/${userId}`)
      const data = await res.json()
      if (data.success) {
        setProgress(data.progress)
      }
    } catch (err) {
      console.error('Failed to load academy progress:', err)
    }
  }

  const loadLesson = async (topicId, topicTitle) => {
    setLoading(true)
    setLesson(null)
    setQuizAnswer(null)
    setQuizSubmitted(false)
    setSelectedOption(null)
    setQuizScoreAwarded(false)
    setSelectedTopic(topicId)
    
    try {
      const res = await fetch('/api/academy/next-lesson', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topicTitle,
          userLevel: progress?.current_level || 'BEGINNER',
          mistakesPattern: 'Doji timing mismatches'
        })
      })
      const data = await res.json()
      if (data.success) {
        setLesson(data.lesson)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleQuizSubmit = async () => {
    if (selectedOption === null || !lesson || !lesson.quiz) return
    
    const activeQuiz = lesson.quiz[0] // Check the first question for simplicity
    const isCorrect = selectedOption === activeQuiz.answer
    setQuizSubmitted(true)

    if (isCorrect && !quizScoreAwarded) {
      setQuizScoreAwarded(true)
      // Award XP & complete lesson
      try {
        let badgeToUnlock = null
        if (selectedTopic === 'doji_spinning') badgeToUnlock = 'doji_master'
        if (selectedTopic === 'position_sizing_atr') badgeToUnlock = 'risk_manager'
        if (selectedTopic === 'news_sentiment_correlations') badgeToUnlock = 'sentiment_analyst'

        const res = await fetch(`/api/academy/progress/${userId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            xpToAdd: 50,
            completeLesson: true,
            badgeToUnlock
          })
        })
        const data = await res.json()
        if (data.success) {
          setProgress(data.progress)
        }
      } catch (err) {
        console.error(err)
      }
    }
  }

  useEffect(() => {
    fetchProgress()
  }, [userId])

  if (!progress) return null

  // XP Progress Calculation
  const nextLevelXP = progress.current_level === 'BEGINNER' ? 300 : (progress.current_level === 'INTERMEDIATE' ? 1000 : 2500)
  const prevLevelXP = progress.current_level === 'BEGINNER' ? 0 : (progress.current_level === 'INTERMEDIATE' ? 300 : 1000)
  const xpPct = Math.min(100, ((progress.xp_points - prevLevelXP) / (nextLevelXP - prevLevelXP)) * 100)

  return (
    <div className="space-y-6">
      {/* Gamification Level Dashboard */}
      <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 shadow-xl grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <span className="text-[10px] text-purple-400 font-extrabold uppercase tracking-widest block mb-1">Trader Tier</span>
          <h2 className="text-2xl font-black text-white flex items-center gap-2">
            <GraduationCap className="w-6 h-6 text-purple-400" />
            {progress.current_level}
          </h2>
          <div className="flex items-center gap-2 mt-2">
            <Zap className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
            <span className="text-xs font-bold text-slate-300">{progress.xp_points} Total XP</span>
            <span className="text-[10px] text-slate-500">• {progress.lessons_completed} lessons completed</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="flex flex-col justify-center">
          <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold mb-1.5">
            <span>Progress to Next Tier</span>
            <span>{Math.round(xpPct)}%</span>
          </div>
          <div className="w-full bg-slate-950 rounded-full h-3 border border-slate-800 p-0.5 overflow-hidden">
            <div 
              className="bg-gradient-to-r from-purple-500 to-indigo-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${xpPct}%` }}
            ></div>
          </div>
        </div>

        {/* Badges Grid */}
        <div>
          <span className="text-[10px] text-purple-400 font-extrabold uppercase tracking-widest block mb-2">Unlocked Badges</span>
          <div className="flex gap-2">
            {Object.keys(BADGES).map(key => {
              const unlocked = progress.badges?.includes(key)
              return (
                <div 
                  key={key} 
                  title={`${BADGES[key].name}: ${BADGES[key].desc}`}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg border relative group transition-all cursor-help ${
                    unlocked 
                      ? 'bg-purple-500/10 border-purple-500/30 grayscale-0 opacity-100 shadow-md shadow-purple-500/5' 
                      : 'bg-slate-950 border-slate-900 grayscale opacity-20'
                  }`}
                >
                  {BADGES[key].icon}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Adaptive Syllabus & Lessons */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Sidebar Topics */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-3">
          <span className="text-xs font-bold text-slate-400 block mb-2">Academy Syllabus</span>
          
          {TOPICS.map(topic => {
            const locked = progress.xp_points < topic.minXP
            const active = selectedTopic === topic.id
            
            return (
              <button
                key={topic.id}
                disabled={locked}
                onClick={() => loadLesson(topic.id, topic.title)}
                className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-center justify-between ${
                  locked 
                    ? 'opacity-40 bg-slate-950 border-slate-900 cursor-not-allowed' 
                    : (active 
                      ? 'bg-purple-600/10 border-purple-500 text-white shadow-md' 
                      : 'bg-slate-950/40 hover:bg-slate-950 border-slate-800/80 hover:border-slate-700 text-slate-300'
                    )
                }`}
              >
                <div className="flex items-center gap-3">
                  <BookOpen className={`w-4 h-4 ${active ? 'text-purple-400' : 'text-slate-500'}`} />
                  <span className="text-xs font-bold">{topic.title}</span>
                </div>
                {locked ? (
                  <span className="text-[9px] bg-slate-900 text-slate-500 border border-slate-800 px-2 py-0.5 rounded">
                    Lock: {topic.minXP} XP
                  </span>
                ) : (
                  <ArrowRight className="w-3.5 h-3.5 opacity-60" />
                )}
              </button>
            )
          })}
        </div>

        {/* Dynamic Lesson Display Panel */}
        <div className="lg:col-span-2 bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-xl min-h-[400px]">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-[350px] gap-3">
              <div className="w-8 h-8 border-4 border-purple-500/25 border-t-purple-400 rounded-full animate-spin"></div>
              <span className="text-xs text-slate-400 font-medium">Assembling adaptive learning models...</span>
            </div>
          ) : lesson ? (
            <div className="space-y-6">
              {/* Lesson Headers */}
              <div>
                <span className="text-[10px] text-purple-400 font-extrabold uppercase tracking-widest block mb-1">Lesson Material</span>
                <h3 className="text-xl font-extrabold text-white leading-tight">{lesson.title}</h3>
              </div>

              {/* Lesson Text */}
              <div className="space-y-4 text-xs text-slate-350 leading-relaxed">
                <p className="bg-slate-950/20 p-4 border border-slate-850 rounded-xl">
                  {lesson.explanation}
                </p>
                <div className="bg-purple-500/5 p-4 border border-purple-500/10 rounded-xl">
                  <span className="text-[10px] font-black text-purple-400 uppercase tracking-widest block mb-1">Scenario Application</span>
                  <p>{lesson.example}</p>
                </div>
              </div>

              {/* Interactive Quiz Module */}
              {lesson.quiz && lesson.quiz[0] && (
                <div className="border-t border-slate-800/80 pt-6 mt-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Target className="w-4 h-4 text-purple-400" />
                    <span className="text-xs font-bold text-slate-200">Personalized Challenge Quiz</span>
                  </div>

                  <p className="text-xs text-slate-300 font-semibold mb-3">
                    {lesson.quiz[0].question}
                  </p>

                  <div className="space-y-2">
                    {lesson.quiz[0].options.map((opt, oIdx) => {
                      const selected = selectedOption === oIdx
                      const isCorrect = oIdx === lesson.quiz[0].answer
                      
                      let optionStyle = 'bg-slate-950/40 border-slate-850 hover:border-slate-700 text-slate-300'
                      if (selected) {
                        optionStyle = 'bg-purple-600/15 border-purple-500 text-white font-semibold'
                      }
                      if (quizSubmitted) {
                        if (isCorrect) {
                          optionStyle = 'bg-emerald-500/10 border-emerald-500 text-emerald-400 font-bold'
                        } else if (selected) {
                          optionStyle = 'bg-rose-500/10 border-rose-500 text-rose-400 font-bold'
                        } else {
                          optionStyle = 'opacity-40 bg-slate-950/20 border-slate-900 text-slate-500'
                        }
                      }

                      return (
                        <button
                          key={oIdx}
                          disabled={quizSubmitted}
                          onClick={() => setSelectedOption(oIdx)}
                          className={`w-full text-left p-3.5 rounded-xl border text-xs transition-all ${optionStyle}`}
                        >
                          {opt}
                        </button>
                      )
                    })}
                  </div>

                  {!quizSubmitted ? (
                    <button
                      disabled={selectedOption === null}
                      onClick={handleQuizSubmit}
                      className="mt-4 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:hover:bg-purple-600 text-white text-xs px-5 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-purple-600/15"
                    >
                      Submit Response
                    </button>
                  ) : (
                    <div className="mt-4 p-4 bg-slate-950/40 border border-slate-850 rounded-xl space-y-2">
                      <div className="flex items-center gap-2">
                        {selectedOption === lesson.quiz[0].answer ? (
                          <span className="text-xs text-emerald-400 font-bold flex items-center gap-1">
                            <CheckCircle className="w-4 h-4 fill-emerald-500/10" /> Correct Choice (+50 XP Awarded!)
                          </span>
                        ) : (
                          <span className="text-xs text-rose-400 font-bold">Incorrect Selection</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        {lesson.quiz[0].rationale}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-[350px] gap-4 text-center">
              <GraduationCap className="w-12 h-12 text-slate-700 animate-bounce" />
              <div>
                <p className="text-sm font-bold text-slate-300">Start Your Academy Journey</p>
                <p className="text-xs text-slate-500 mt-1 max-w-[320px]">
                  Select a syllabus module on the sidebar to generate your personalized AI lesson.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
