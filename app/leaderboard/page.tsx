'use client'

import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'

export default function LeaderboardPage() {
  const leaderboard = useQuery(api.bots.leaderboard, { limit: 100 }) ?? []

  return (
    <div className="min-h-screen bg-[#0a0a1a] p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <a href="/" className="pixel-font text-sm text-gray-500 hover:text-cyan-400">
            ← BACK TO ARENA
          </a>
          <h1 className="pixel-font text-3xl mt-4">
            <span className="text-yellow-400">🏆</span>{' '}
            <span className="text-cyan-400">LEADERBOARD</span>
          </h1>
          <p className="text-gray-500 mt-2">Top warriors in the arena</p>
        </div>

        {/* Leaderboard Table */}
        <div className="bg-gray-900/50 rounded-xl overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-12 gap-4 p-4 border-b border-gray-800 text-xs text-gray-500">
            <div className="col-span-1">RANK</div>
            <div className="col-span-4">WARRIOR</div>
            <div className="col-span-2 text-right">ELO</div>
            <div className="col-span-2 text-right">W/L</div>
            <div className="col-span-2 text-right">KILLS</div>
            <div className="col-span-1 text-right">WIN%</div>
          </div>

          {/* Rows */}
          {leaderboard.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <p className="pixel-font text-sm">NO WARRIORS YET</p>
              <p className="text-xs mt-2">Be the first to enter the arena!</p>
            </div>
          ) : (
            leaderboard.map((bot, index) => (
              <div
                key={bot.name}
                className={`grid grid-cols-12 gap-4 p-4 items-center border-b border-gray-800/50
                  ${index === 0 ? 'bg-yellow-500/10' : ''}
                  ${index === 1 ? 'bg-gray-400/10' : ''}
                  ${index === 2 ? 'bg-orange-500/10' : ''}
                  hover:bg-gray-800/30 transition-colors
                `}
              >
                <div className="col-span-1">
                  <span
                    className={`pixel-font text-lg ${
                      index === 0
                        ? 'text-yellow-400'
                        : index === 1
                        ? 'text-gray-300'
                        : index === 2
                        ? 'text-orange-400'
                        : 'text-gray-600'
                    }`}
                  >
                    #{bot.rank}
                  </span>
                </div>
                <div className="col-span-4">
                  <p className="text-white font-bold">{bot.name}</p>
                  <p className="text-gray-500 text-xs">{bot.twitter}</p>
                </div>
                <div className="col-span-2 text-right">
                  <span className="text-cyan-400 font-bold text-lg">{bot.elo}</span>
                </div>
                <div className="col-span-2 text-right">
                  <span className="text-green-400">{bot.wins}W</span>
                  <span className="text-gray-600 mx-1">/</span>
                  <span className="text-red-400">{bot.losses}L</span>
                </div>
                <div className="col-span-2 text-right">
                  <span className="text-yellow-400">💀 {bot.kills}</span>
                </div>
                <div className="col-span-1 text-right">
                  <span className={`${bot.winRate > 50 ? 'text-green-400' : 'text-gray-500'}`}>
                    {bot.winRate}%
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-gray-600 text-sm">
          <p>Rankings update in real-time after each match</p>
          <p className="mt-2">
            <a href="/" className="text-cyan-400 hover:underline">
              Enter the arena →
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
