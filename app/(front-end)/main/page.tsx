"use client"

import { useSession, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

export default function MainPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [scrollY, setScrollY] = useState(0)
  const [activeTab, setActiveTab] = useState<"timeline" | "achievements" | "legacy">("timeline")
  const [stars] = useState(() =>
    [...Array(100)].map(() => ({
      top: Math.random() * 100,
      left: Math.random() * 100,
      delay: Math.random() * 3,
      duration: 2 + Math.random() * 3,
    }))
  )

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
    }
  }, [status, router])

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY)
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900">
        <div className="text-center">
          <div className="w-20 h-20 border-4 border-t-yellow-400 border-r-yellow-400 border-b-transparent border-l-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-xl font-bold text-yellow-300 animate-pulse">Great Park에 입장하는 중...</div>
        </div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  // Great Park 정보
  const greatFigure = {
    name: "Great Park",
    title: "위대함의 성지",
    subtitle: "모든 꿈과 영감이 시작되는 곳",
    era: "2024-∞",
    birthPlace: "디지털 세상",
    fullDescription: "Great Park는 단순한 공간이 아닙니다. 이곳은 위대함을 꿈꾸는 모든 이들의 성지이자, 영감과 창의성이 샘솟는 영원한 낙원입니다. 시간과 공간을 초월하여, 과거의 영웅들과 미래의 개척자들이 만나는 특별한 장소입니다.",
    timeline: [
      { year: "2024", event: "Great Park의 탄생", icon: "🌟", description: "위대함을 기리는 특별한 공간이 디지털 세상에 탄생하다" },
      { year: "현재", event: "영감의 중심지로 성장", icon: "🎨", description: "수많은 방문자들에게 꿈과 영감을 선사하며" },
      { year: "진행중", event: "창의성의 폭발", icon: "💡", description: "매일매일 새로운 아이디어와 혁신이 꽃피우는 곳" },
      { year: "계속", event: "무한한 가능성 탐험", icon: "🚀", description: "한계 없는 상상력으로 미래를 향해 나아가다" },
      { year: "영원", event: "레거시의 전승", icon: "👑", description: "과거의 위대함을 기억하고 미래의 전설을 만들다" },
      { year: "미래", event: "새로운 시대의 시작", icon: "✨", description: "Great Park는 계속해서 진화하며 더 큰 꿈을 향해" },
      { year: "∞", event: "끝없는 여정", icon: "🌈", description: "위대함은 멈추지 않습니다. 우리의 여정은 계속됩니다" },
    ],
    achievements: [
      {
        title: "영감의 성지",
        category: "비전",
        icon: "💫",
        description: "모든 방문자에게 무한한 영감과 동기부여를 제공하는 특별한 공간",
        impact: "수많은 꿈이 시작되는 곳"
      },
      {
        title: "창의성의 폭발",
        category: "혁신",
        icon: "🎨",
        description: "상상력의 한계를 뛰어넘어 새로운 아이디어가 끊임없이 탄생하는 곳",
        impact: "혁신의 중심지"
      },
      {
        title: "위대함의 기록",
        category: "레거시",
        icon: "📜",
        description: "역사 속 위인들의 업적을 기리고 미래 세대에게 전승하는 박물관",
        impact: "과거와 미래를 잇는 다리"
      },
      {
        title: "커뮤니티의 힘",
        category: "연결",
        icon: "🤝",
        description: "같은 꿈을 가진 사람들이 만나고 협력하며 함께 성장하는 플랫폼",
        impact: "집단 지성의 힘"
      },
      {
        title: "무한한 가능성",
        category: "미래",
        icon: "🚀",
        description: "한계 없는 잠재력을 발견하고 실현할 수 있는 기회의 땅",
        impact: "미래를 만드는 곳"
      },
      {
        title: "영원한 진화",
        category: "성장",
        icon: "🌱",
        description: "멈추지 않고 계속 발전하며 더 나은 버전으로 성장하는 살아있는 공간",
        impact: "끝없는 진화의 여정"
      },
    ],
    quotes: [
      "위대함은 태어나는 것이 아니라, 만들어지는 것입니다.",
      "Great Park에서는 모든 꿈이 현실이 됩니다.",
      "과거의 영웅을 기억하고, 미래의 전설을 만듭니다.",
      "여기는 단순한 공간이 아닙니다. 이곳은 가능성 그 자체입니다.",
    ],
    stats: {
      artworks: "∞",
      notebooks: "∞",
      years: "영원",
      fields: "무한",
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
      {/* Animated Background Stars */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {stars.map((star, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-white rounded-full animate-pulse"
            style={{
              top: `${star.top}%`,
              left: `${star.left}%`,
              animationDelay: `${star.delay}s`,
              animationDuration: `${star.duration}s`,
            }}
          />
        ))}
      </div>

      {/* Navigation */}
      <nav className="bg-gradient-to-r from-purple-900/90 to-indigo-900/90 backdrop-blur-lg border-b border-purple-500/30 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20 items-center">
            <div className="flex items-center space-x-4">
              <div className="w-14 h-14 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg shadow-yellow-500/50 animate-pulse">
                <span className="text-white font-bold text-2xl">🌟</span>
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-yellow-400 via-orange-400 to-pink-500 bg-clip-text text-transparent">
                  Great Park
                </h1>
                <p className="text-purple-200 text-xs sm:text-sm hidden sm:block">위대함이 시작되는 곳</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
             
              <button
                onClick={() => signOut()}
                className="px-3 py-2 sm:px-5 sm:py-2.5 bg-gradient-to-r from-red-500 to-pink-600 text-white rounded-xl hover:from-red-600 hover:to-pink-700 transition-all font-semibold text-xs sm:text-sm shadow-lg hover:shadow-red-500/50 transform hover:scale-105"
              >
                나가기
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative py-12 sm:py-20 overflow-hidden">
        <div
          className="absolute inset-0 bg-gradient-to-b from-purple-600/20 to-transparent"
          style={{
            transform: `translateY(${scrollY * 0.5}px)`,
          }}
        />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          {/* Main Hero */}
          <div className="text-center mb-12 sm:mb-16 animate-fade-in">
            <div className="mb-6 sm:mb-8">
              <div className="inline-block px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 backdrop-blur-sm rounded-full border border-yellow-500/30 mb-4 sm:mb-6">
                <span className="text-yellow-300 font-semibold text-xs sm:text-sm">{greatFigure.era} · {greatFigure.birthPlace}</span>
              </div>
            </div>
            <h2 className="text-5xl sm:text-6xl md:text-8xl font-black mb-4 sm:mb-6 bg-gradient-to-r from-yellow-300 via-pink-400 to-purple-400 bg-clip-text text-transparent drop-shadow-2xl">
              {greatFigure.name}
            </h2>
            <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-300 to-pink-300 mb-4 sm:mb-6">
              {greatFigure.title}
            </p>
            <p className="text-lg sm:text-xl md:text-2xl text-purple-100 max-w-4xl mx-auto leading-relaxed mb-8 sm:mb-12 px-4">
              {greatFigure.subtitle}
            </p>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-8 max-w-4xl mx-auto">
              <div className="bg-gradient-to-br from-purple-900/50 to-indigo-900/50 backdrop-blur-lg rounded-2xl p-4 sm:p-6 border border-purple-500/30 hover:scale-105 transition-transform">
                <div className="text-3xl sm:text-5xl font-bold text-yellow-400 mb-2">{greatFigure.stats.artworks}</div>
                <div className="text-purple-300 text-xs sm:text-sm">영감</div>
              </div>
              <div className="bg-gradient-to-br from-purple-900/50 to-indigo-900/50 backdrop-blur-lg rounded-2xl p-4 sm:p-6 border border-purple-500/30 hover:scale-105 transition-transform">
                <div className="text-3xl sm:text-5xl font-bold text-yellow-400 mb-2">{greatFigure.stats.notebooks}</div>
                <div className="text-purple-300 text-xs sm:text-sm">가능성</div>
              </div>
              <div className="bg-gradient-to-br from-purple-900/50 to-indigo-900/50 backdrop-blur-lg rounded-2xl p-4 sm:p-6 border border-purple-500/30 hover:scale-105 transition-transform">
                <div className="text-3xl sm:text-5xl font-bold text-yellow-400 mb-2">{greatFigure.stats.years}</div>
                <div className="text-purple-300 text-xs sm:text-sm">시간</div>
              </div>
              <div className="bg-gradient-to-br from-purple-900/50 to-indigo-900/50 backdrop-blur-lg rounded-2xl p-4 sm:p-6 border border-purple-500/30 hover:scale-105 transition-transform">
                <div className="text-3xl sm:text-5xl font-bold text-yellow-400 mb-2">{greatFigure.stats.fields}</div>
                <div className="text-purple-300 text-xs sm:text-sm">기회</div>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="max-w-5xl mx-auto mb-12 sm:mb-16">
            <div className="bg-gradient-to-br from-white/10 to-purple-500/10 backdrop-blur-xl rounded-3xl p-6 sm:p-10 border border-white/20 shadow-2xl">
              <div className="text-5xl sm:text-6xl mb-4 sm:mb-6 text-center">🏛️</div>
              <p className="text-purple-100 text-base sm:text-lg md:text-xl leading-relaxed text-center">
                {greatFigure.fullDescription}
              </p>
            </div>
          </div>

          {/* Tabs */}
          <div className="max-w-5xl mx-auto mb-8">
            <div className="flex flex-wrap justify-center gap-2 sm:gap-4 bg-gradient-to-r from-purple-900/50 to-indigo-900/50 backdrop-blur-lg rounded-2xl p-2 border border-purple-500/30">
              <button
                onClick={() => setActiveTab("timeline")}
                className={`flex-1 min-w-[100px] sm:min-w-0 px-4 sm:px-8 py-3 sm:py-4 rounded-xl font-bold transition-all text-sm sm:text-base ${
                  activeTab === "timeline"
                    ? "bg-gradient-to-r from-yellow-400 to-orange-500 text-white shadow-lg scale-105"
                    : "text-purple-300 hover:text-white hover:bg-white/10"
                }`}
              >
                📜 타임라인
              </button>
              <button
                onClick={() => setActiveTab("achievements")}
                className={`flex-1 min-w-[100px] sm:min-w-0 px-4 sm:px-8 py-3 sm:py-4 rounded-xl font-bold transition-all text-sm sm:text-base ${
                  activeTab === "achievements"
                    ? "bg-gradient-to-r from-yellow-400 to-orange-500 text-white shadow-lg scale-105"
                    : "text-purple-300 hover:text-white hover:bg-white/10"
                }`}
              >
                🏆 업적
              </button>
              <button
                onClick={() => setActiveTab("legacy")}
                className={`flex-1 min-w-[100px] sm:min-w-0 px-4 sm:px-8 py-3 sm:py-4 rounded-xl font-bold transition-all text-sm sm:text-base ${
                  activeTab === "legacy"
                    ? "bg-gradient-to-r from-yellow-400 to-orange-500 text-white shadow-lg scale-105"
                    : "text-purple-300 hover:text-white hover:bg-white/10"
                }`}
              >
                💭 명언
              </button>
            </div>
          </div>

          {/* Timeline Tab */}
          {activeTab === "timeline" && (
            <div className="max-w-5xl mx-auto space-y-4 sm:space-y-6 animate-fade-in">
              {greatFigure.timeline.map((item, idx) => (
                <div
                  key={idx}
                  className="group relative"
                  style={{
                    animation: `slideInUp 0.6s ease-out ${idx * 0.1}s both`,
                  }}
                >
                  <div className="absolute -inset-1 bg-gradient-to-r from-yellow-400 via-orange-500 to-pink-500 rounded-2xl blur-xl opacity-20 group-hover:opacity-40 transition-opacity"></div>
                  <div className="relative bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-4 sm:p-6 shadow-xl border border-orange-200">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                      <div className="flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center text-3xl sm:text-4xl shadow-lg transform group-hover:rotate-12 group-hover:scale-110 transition-transform">
                        {item.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 sm:gap-4 mb-2">
                          <span className="px-3 sm:px-4 py-1 sm:py-1.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-full font-bold text-xs sm:text-sm">
                            {item.year}
                          </span>
                          <h3 className="text-lg sm:text-xl font-bold text-gray-900">{item.event}</h3>
                        </div>
                        <p className="text-sm sm:text-base text-gray-700">{item.description}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Achievements Tab */}
          {activeTab === "achievements" && (
            <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 animate-fade-in">
              {greatFigure.achievements.map((achievement, idx) => (
                <div
                  key={idx}
                  className="group relative"
                  style={{
                    animation: `slideInUp 0.6s ease-out ${idx * 0.1}s both`,
                  }}
                >
                  <div className="absolute -inset-1 bg-gradient-to-r from-purple-400 via-pink-500 to-orange-500 rounded-2xl blur-xl opacity-20 group-hover:opacity-40 transition-opacity"></div>
                  <div className="relative bg-gradient-to-br from-white/10 to-purple-500/10 backdrop-blur-xl rounded-2xl p-6 sm:p-8 border border-white/20 shadow-xl hover:scale-105 transition-transform h-full">
                    <div className="text-5xl sm:text-6xl mb-4 text-center">{achievement.icon}</div>
                    <div className="mb-3">
                      <span className="px-3 py-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full text-xs font-bold">
                        {achievement.category}
                      </span>
                    </div>
                    <h3 className="text-xl sm:text-2xl font-bold text-white mb-3">{achievement.title}</h3>
                    <p className="text-sm sm:text-base text-purple-200 mb-4">{achievement.description}</p>
                    <div className="pt-4 border-t border-white/20">
                      <p className="text-xs sm:text-sm text-yellow-300 font-semibold">💫 {achievement.impact}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Legacy Tab */}
          {activeTab === "legacy" && (
            <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8 animate-fade-in">
              {greatFigure.quotes.map((quote, idx) => (
                <div
                  key={idx}
                  className="group relative"
                  style={{
                    animation: `slideInUp 0.6s ease-out ${idx * 0.15}s both`,
                  }}
                >
                  <div className="absolute -inset-1 bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-600 rounded-3xl blur-xl opacity-20 group-hover:opacity-40 transition-opacity"></div>
                  <div className="relative bg-gradient-to-br from-purple-900/50 to-indigo-900/50 backdrop-blur-xl rounded-3xl p-6 sm:p-10 border border-purple-500/30 shadow-2xl">
                    <div className="text-5xl sm:text-6xl mb-4 sm:mb-6 text-yellow-400">&ldquo;</div>
                    <p className="text-xl sm:text-2xl md:text-3xl font-serif italic text-white leading-relaxed mb-4 sm:mb-6">
                      {quote}
                    </p>
                    <div className="text-right text-purple-300 font-semibold text-sm sm:text-base">
                      — {greatFigure.name}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Footer Message */}
          <div className="mt-16 sm:mt-20 text-center">
            <div className="bg-gradient-to-r from-purple-900/50 to-indigo-900/50 backdrop-blur-lg rounded-3xl p-8 sm:p-12 border border-purple-500/30">
              <div className="text-4xl sm:text-6xl mb-4 sm:mb-6">✨</div>
              <h3 className="text-2xl sm:text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-pink-400 mb-4 sm:mb-6">
                Great Park
              </h3>
              <p className="text-base sm:text-xl text-purple-200 max-w-2xl mx-auto">
                {greatFigure.name}의 위대한 업적과 유산을 기리며,<br className="hidden sm:block" />
                우리 모두가 더 나은 미래를 만들어갈 수 있기를 바랍니다.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CSS Animations */}
      <style jsx>{`
        @keyframes slideInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        .animate-fade-in {
          animation: fade-in 0.8s ease-out;
        }
      `}</style>
    </div>
  )
}
