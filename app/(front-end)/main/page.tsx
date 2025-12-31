"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState, useCallback } from "react"

interface Idea {
  id: string
  text: string
  author: string
  likes: number
  isLiked: boolean
  date: string
}

export default function MainPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<"timeline" | "achievements" | "legacy" | "ideas">("timeline")
  const [newIdea, setNewIdea] = useState("")
  const [ideas, setIdeas] = useState<Idea[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // 아이디어 목록 불러오기
  const fetchIdeas = useCallback(async () => {
    try {
      const res = await fetch("/api/ideas")
      if (res.ok) {
        const data = await res.json()
        setIdeas(data)
      }
    } catch (error) {
      console.error("Failed to fetch ideas:", error)
    }
  }, [])

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
    }
  }, [status, router])

  useEffect(() => {
    if (status === "authenticated") {
      fetchIdeas()
    }
  }, [status, fetchIdeas])

  const handleAddIdea = async () => {
    if (!newIdea.trim() || isLoading) return
    setIsLoading(true)
    try {
      const res = await fetch("/api/ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: newIdea }),
      })
      if (res.ok) {
        const idea = await res.json()
        setIdeas([idea, ...ideas])
        setNewIdea("")
      }
    } catch (error) {
      console.error("Failed to add idea:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleLike = async (id: string) => {
    try {
      const res = await fetch(`/playground/api/ideas/${id}/like`, { method: "POST" })
      if (res.ok) {
        const { liked } = await res.json()
        setIdeas(ideas.map(idea =>
          idea.id === id
            ? { ...idea, likes: liked ? idea.likes + 1 : idea.likes - 1, isLiked: liked }
            : idea
        ))
      }
    } catch (error) {
      console.error("Failed to toggle like:", error)
    }
  }

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-950 via-slate-900 to-slate-950">
        <div className="text-center">
          <div className="w-20 h-20 border-4 border-t-amber-400 border-r-amber-400 border-b-transparent border-l-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-xl font-bold text-amber-300 animate-pulse">Great Park에 입장하는 중...</div>
        </div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  // Great Park 정보
  const greatFigure = {
    timeline: [
      { year: "5살", event: "동생 탄생으로 인한 인생에서의 소외", description: "인생의 첫 시련, 그러나 이것이 독립심과 강인함의 시작이 되다" },
      { year: "1996", event: "Great Park의 탄생", description: "위대함을 기리는 특별함이 세상에 탄생하다" },
    ],
    achievements: [
      {
        title: "GMP 경시대회 3관왕",
        category: "학업",
        icon: "🏆",
        description: "경시대회에서 3관왕을 차지하며 탁월한 실력을 입증하다",
        impact: "노력과 재능의 완벽한 조화"
      },
      {
        title: "영감의 성지",
        category: "비전",
        icon: "💫",
        description: "모든 방문자에게 무한한 영감과 동기부여를 제공하는 특별한 공간",
        impact: "수많은 꿈이 시작되는 곳"
      },
    ],
    quotes: [
      "나는 언제 일해? 난 빨리 일하고 싶단 말이야",
      "오늘도 배웠다 - Great Park",
    ],
  }

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-emerald-950 via-slate-900 to-slate-950">
      {/* Tabs - 스크롤 고정 */}
      <div className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur-sm border-b border-emerald-800/30">
        <div className="max-w-5xl mx-auto">
          <div className="flex justify-center gap-1 sm:gap-2 p-2">
            <button
              onClick={() => setActiveTab("timeline")}
              className={`px-3 sm:px-5 py-2 rounded-lg font-semibold transition-all text-xs sm:text-sm whitespace-nowrap ${
                activeTab === "timeline"
                  ? "bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-900 shadow-lg shadow-amber-500/30"
                  : "text-slate-400 hover:text-amber-300"
              }`}
            >
              📜 타임라인
            </button>
            <button
              onClick={() => setActiveTab("achievements")}
              className={`px-3 sm:px-5 py-2 rounded-lg font-semibold transition-all text-xs sm:text-sm whitespace-nowrap ${
                activeTab === "achievements"
                  ? "bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-900 shadow-lg shadow-amber-500/30"
                  : "text-slate-400 hover:text-amber-300"
              }`}
            >
              🏆 업적
            </button>
            <button
              onClick={() => setActiveTab("legacy")}
              className={`px-3 sm:px-5 py-2 rounded-lg font-semibold transition-all text-xs sm:text-sm whitespace-nowrap ${
                activeTab === "legacy"
                  ? "bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-900 shadow-lg shadow-amber-500/30"
                  : "text-slate-400 hover:text-amber-300"
              }`}
            >
              💭 명언
            </button>
            <button
              onClick={() => setActiveTab("ideas")}
              className={`px-3 sm:px-5 py-2 rounded-lg font-semibold transition-all text-xs sm:text-sm whitespace-nowrap ${
                activeTab === "ideas"
                  ? "bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-900 shadow-lg shadow-amber-500/30"
                  : "text-slate-400 hover:text-amber-300"
              }`}
            >
              💡 아이디어
            </button>
          </div>
        </div>
      </div>

      {/* Content - 스크롤 영역 */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-4 py-6">

          {/* 크리스마스 트리 */}
          <div className="flex justify-center mb-8">
            <div className="tree-container">
              {/* 별 */}
              <div className="tree-star">★</div>
              {/* 트리 레이어들 */}
              <div className="tree-layer layer-1">
                {[...Array(5)].map((_, i) => <span key={i} className="star">✦</span>)}
              </div>
              <div className="tree-layer layer-2">
                {[...Array(9)].map((_, i) => <span key={i} className="star">✦</span>)}
              </div>
              <div className="tree-layer layer-3">
                {[...Array(13)].map((_, i) => <span key={i} className="star">✦</span>)}
              </div>
              <div className="tree-layer layer-4">
                {[...Array(17)].map((_, i) => <span key={i} className="star">✦</span>)}
              </div>
              <div className="tree-layer layer-5">
                {[...Array(21)].map((_, i) => <span key={i} className="star">✦</span>)}
              </div>
              {/* 트렁크 */}
              <div className="tree-trunk">
                <span className="star">✦</span>
                <span className="star">✦</span>
              </div>
            </div>
          </div>

          {/* Timeline Tab */}
          {activeTab === "timeline" && (
            <div className="space-y-4 animate-fade-in">
              {greatFigure.timeline.map((item, idx) => (
                <div
                  key={idx}
                  className="group relative"
                  style={{ animation: `slideInUp 0.6s ease-out ${idx * 0.1}s both` }}
                >
                  <div className="bg-slate-800/60 backdrop-blur-sm rounded-xl p-4 sm:p-6 border border-emerald-700/30 hover:border-amber-500/50 transition-all hover:shadow-lg hover:shadow-amber-500/10">
                    <div className="flex flex-col gap-2">
                      <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                        <span className="px-3 py-1 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white rounded-full font-bold text-xs sm:text-sm">
                          {item.year}
                        </span>
                        <h3 className="text-base sm:text-xl font-bold text-white">{item.event}</h3>
                      </div>
                      <p className="text-sm text-slate-400">{item.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Achievements Tab */}
          {activeTab === "achievements" && (
            <div className="space-y-4 animate-fade-in">
              {greatFigure.achievements.map((achievement, idx) => (
                <div
                  key={idx}
                  className="group relative"
                  style={{ animation: `slideInUp 0.6s ease-out ${idx * 0.1}s both` }}
                >
                  <div className="bg-slate-800/60 backdrop-blur-sm rounded-xl p-4 sm:p-5 border border-emerald-700/30 hover:border-amber-500/50 transition-all hover:shadow-lg hover:shadow-amber-500/10">
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">{achievement.icon}</span>
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="px-2 py-0.5 bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-900 rounded-full text-xs font-bold">
                            {achievement.category}
                          </span>
                          <h3 className="text-base sm:text-lg font-bold text-white">{achievement.title}</h3>
                        </div>
                        <p className="text-sm text-slate-400">{achievement.description}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Legacy Tab */}
          {activeTab === "legacy" && (
            <div className="space-y-4 animate-fade-in">
              {greatFigure.quotes.map((quote, idx) => (
                <div
                  key={idx}
                  className="group relative"
                  style={{ animation: `slideInUp 0.6s ease-out ${idx * 0.1}s both` }}
                >
                  <div className="bg-slate-800/60 backdrop-blur-sm rounded-xl p-4 sm:p-5 border border-emerald-700/30 hover:border-amber-500/50 transition-all hover:shadow-lg hover:shadow-amber-500/10">
                    <div className="flex items-start gap-3">
                      <span className="text-xl text-amber-400">&ldquo;</span>
                      <p className="text-sm sm:text-base text-white italic leading-relaxed">
                        {quote}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Ideas Tab - 게시판 */}
          {activeTab === "ideas" && (
            <div className="space-y-3 animate-fade-in">
              {/* 아이디어 입력 */}
              <div className="bg-slate-800/60 backdrop-blur-sm rounded-lg p-3 border border-emerald-700/30">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newIdea}
                    onChange={(e) => setNewIdea(e.target.value)}
                    placeholder="아이디어 입력..."
                    className="flex-1 bg-slate-700/50 text-white placeholder-slate-500 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500/50 border border-slate-600"
                    onKeyDown={(e) => e.key === 'Enter' && handleAddIdea()}
                  />
                  <button
                    onClick={handleAddIdea}
                    className="px-3 py-2 bg-amber-500 text-slate-900 rounded-md font-medium text-xs hover:bg-amber-400 transition-colors"
                  >
                    등록
                  </button>
                </div>
              </div>

              {/* 아이디어 목록 */}
              <div className="space-y-2">
                {ideas.map((idea, idx) => (
                  <div
                    key={idea.id}
                    className="bg-slate-800/60 rounded-lg p-3 border border-emerald-700/30 hover:border-amber-500/50 transition-all"
                    style={{ animation: `slideInUp 0.3s ease-out ${idx * 0.05}s both` }}
                  >
                    <p className="text-white text-sm mb-2">{idea.text}</p>
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <div className="flex items-center gap-2">
                        <span className="text-amber-400">{idea.author}</span>
                        <span>{idea.date}</span>
                      </div>
                      <button
                        onClick={() => handleLike(idea.id)}
                        className="flex items-center gap-1 hover:text-amber-300 transition-colors"
                      >
                        <span className="text-[10px]">❤️</span>
                        <span>{idea.likes}</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* CSS Animations */}
      <style jsx>{`
        @keyframes slideInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fade-in {
          animation: fade-in 0.5s ease-out;
        }

        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        /* 크리스마스 트리 스타일 */
        .tree-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          perspective: 500px;
          transform-style: preserve-3d;
          animation: treeFloat 4s ease-in-out infinite;
        }

        @keyframes treeFloat {
          0%, 100% { transform: translateY(0) rotateY(-5deg); }
          50% { transform: translateY(-5px) rotateY(5deg); }
        }

        .tree-star {
          font-size: 1.5rem;
          color: #fbbf24;
          text-shadow: 0 0 20px #fbbf24, 0 0 40px #fbbf24;
          animation: starPulse 1s ease-in-out infinite;
        }

        @keyframes starPulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.3); opacity: 0.8; }
        }

        .tree-layer {
          display: flex;
          justify-content: center;
          gap: 2px;
          margin-top: -2px;
        }

        .tree-trunk {
          display: flex;
          justify-content: center;
          gap: 4px;
          margin-top: 2px;
        }

        .tree-trunk .star {
          color: #92400e !important;
          text-shadow: 0 0 5px #b45309 !important;
          animation: none !important;
          opacity: 0.8;
        }

        .star {
          font-size: 0.6rem;
          animation: twinkle 2s ease-in-out infinite;
          color: #4ade80;
          text-shadow: 0 0 8px currentColor;
        }

        .star:nth-child(odd) {
          animation-delay: 0.5s;
          color: #fbbf24;
        }

        .star:nth-child(3n) {
          animation-delay: 1s;
          color: #f87171;
        }

        .star:nth-child(5n) {
          animation-delay: 0.3s;
          color: #60a5fa;
        }

        .star:nth-child(7n) {
          color: #c084fc;
        }

        @keyframes twinkle {
          0%, 100% {
            opacity: 0.4;
            transform: scale(0.8);
          }
          50% {
            opacity: 1;
            transform: scale(1.2);
          }
        }

        .layer-1 .star { font-size: 0.5rem; }
        .layer-2 .star { font-size: 0.55rem; }
        .layer-3 .star { font-size: 0.6rem; }
        .layer-4 .star { font-size: 0.65rem; }
        .layer-5 .star { font-size: 0.7rem; }

        @media (min-width: 640px) {
          .tree-star { font-size: 2rem; }
          .star { font-size: 0.8rem; }
          .layer-1 .star { font-size: 0.7rem; }
          .layer-2 .star { font-size: 0.75rem; }
          .layer-3 .star { font-size: 0.8rem; }
          .layer-4 .star { font-size: 0.85rem; }
          .layer-5 .star { font-size: 0.9rem; }
          .tree-layer { gap: 3px; }
        }
      `}</style>
    </div>
  )
}
