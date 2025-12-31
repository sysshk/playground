'use client'

import { signOut } from "next-auth/react"

export default function FrontTopbar() {
  return (
    <nav className="bg-slate-900 border-b border-emerald-800/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-12 items-center">
          <div className="flex items-center space-x-3">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-300">
                Great Park
              </h1>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => signOut()}
              className="px-4 py-2 text-gray-400 hover:text-white transition-colors font-semibold text-sm"
            >
              나가기
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}
