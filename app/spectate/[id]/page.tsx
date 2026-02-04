'use client'

import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
import { useParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import Link from 'next/link'

// Bot colors
const BOT_COLORS = [
  { bg: '#00f5ff', glow: '0 0 12px #00f5ff' }, // Cyan
  { bg: '#ff00ff', glow: '0 0 12px #ff00ff' }, // Magenta
  { bg: '#ffff00', glow: '0 0 12px #ffff00' }, // Yellow
  { bg: '#00ff00', glow: '0 0 12px #00ff00' }, // Green
  { bg: '#ff6600', glow: '0 0 12px #ff6600' }, // Orange
  { bg: '#ff0066', glow: '0 0 12px #ff0066' }, // Pink
  { bg: '#6600ff', glow: '0 0 12px #6600ff' }, // Purple
  { bg: '#00ff99', glow: '0 0 12px #00ff99' }, // Teal
]

export default function SpectatePage() {
  const params = useParams()
  const matchId = params.id as Id<'gridMatches'>
  
  const match = useQuery(api.gridRoyale.spectateMatch, { matchId })
  const [showEvents, setShowEvents] = useState(true)
  
  if (!match) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-pulse">⚔️</div>
          <div className="text-xl text-cyan-400 animate-pulse">Loading match...</div>
        </div>
      </div>
    )
  }
  
  const gridSize = match.grid_size || 15
  const zone = match.zone || { min: 0, max: 14 }
  
  // Assign colors to players
  const playerColors: Record<string, typeof BOT_COLORS[0]> = {}
  match.players.forEach((p, i) => {
    playerColors[p.id] = BOT_COLORS[i % BOT_COLORS.length]
  })

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Header */}
      <div className="border-b border-gray-800 bg-gray-900/50">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="text-gray-400 hover:text-white text-sm">
              ← Back to BotRoyale
            </Link>
            <div className="flex items-center gap-4">
              {match.status === 'active' && (
                <span className="flex items-center gap-2 px-3 py-1 bg-red-500/20 border border-red-500/50 rounded-full">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                  <span className="text-red-400 text-sm font-bold">LIVE</span>
                </span>
              )}
              {match.status === 'completed' && (
                <span className="px-3 py-1 bg-gray-800 border border-gray-700 rounded-full text-gray-400 text-sm">
                  COMPLETED
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Match Title */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold mb-2">
            {match.players.map((p, i) => (
              <span key={p.id}>
                <span style={{ color: playerColors[p.id]?.bg }}>{p.name}</span>
                {i < match.players.length - 1 && <span className="text-gray-600 mx-3">vs</span>}
              </span>
            ))}
          </h1>
          {match.winner && (
            <div className="text-xl text-yellow-400 animate-pulse">
              🏆 {match.winner} WINS!
            </div>
          )}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Players Panel */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-gray-400">Players</h2>
            {match.players.map((player, i) => (
              <div 
                key={player.id}
                className={`p-4 rounded-lg border ${
                  player.alive 
                    ? 'bg-gray-900/50 border-gray-800' 
                    : 'bg-red-900/20 border-red-900/50'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-4 h-4 rounded"
                      style={{ 
                        backgroundColor: playerColors[player.id]?.bg,
                        boxShadow: playerColors[player.id]?.glow 
                      }}
                    />
                    <span className={`font-bold ${player.alive ? 'text-white' : 'text-gray-500'}`}>
                      {player.name}
                    </span>
                    {!player.alive && <span className="text-red-400 text-sm">💀</span>}
                    {player.placement === 1 && <span className="text-yellow-400">🏆</span>}
                  </div>
                  <span className="text-gray-500 text-sm">
                    ({player.x}, {player.y})
                  </span>
                </div>
                
                {/* HP Bar */}
                <div className="mb-2">
                  <div className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <div 
                        key={i}
                        className={`h-2 flex-1 rounded ${
                          i < player.hp ? 'bg-green-500' : 'bg-gray-700'
                        }`}
                      />
                    ))}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    HP: {player.hp}/3
                  </div>
                </div>
                
                <div className="text-sm text-gray-400">
                  Kills: <span className="text-white font-bold">{player.kills}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Grid Arena */}
          <div className="lg:col-span-1">
            <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-400">Arena</h2>
                <div className="text-sm">
                  <span className="text-gray-500">Tick:</span>{' '}
                  <span className="text-cyan-400 font-bold">{match.tick}</span>
                  <span className="text-gray-600">/100</span>
                </div>
              </div>
              
              {/* Zone indicator */}
              <div className="text-xs text-gray-500 mb-2">
                Zone: {zone.min}-{zone.max}
                {zone.min > 0 && <span className="text-red-400 ml-2">⚠️ Shrinking!</span>}
              </div>
              
              {/* Grid */}
              <div 
                className="grid gap-0.5 mx-auto"
                style={{ 
                  gridTemplateColumns: `repeat(${gridSize}, 1fr)`,
                  maxWidth: '400px'
                }}
              >
                {Array.from({ length: gridSize * gridSize }).map((_, i) => {
                  const x = i % gridSize
                  const y = gridSize - 1 - Math.floor(i / gridSize)
                  const inZone = x >= zone.min && x <= zone.max && y >= zone.min && y <= zone.max
                  const player = match.players.find(p => p.x === x && p.y === y)
                  
                  return (
                    <div
                      key={i}
                      className={`aspect-square rounded-sm transition-all duration-200 flex items-center justify-center text-xs font-bold ${
                        !inZone ? 'bg-red-900/30' : 'bg-gray-800/50'
                      }`}
                      style={player ? {
                        backgroundColor: playerColors[player.id]?.bg,
                        boxShadow: player.alive ? playerColors[player.id]?.glow : 'none',
                        opacity: player.alive ? 1 : 0.3
                      } : {}}
                      title={player ? `${player.name} (HP: ${player.hp})` : `(${x}, ${y})`}
                    >
                      {player && (
                        <span className="text-black text-[8px] font-bold">
                          {player.name[0]}
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
              
              {/* Legend */}
              <div className="flex justify-center gap-4 mt-4 text-xs text-gray-500">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-gray-800/50 rounded-sm"></div>
                  <span>Safe</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-red-900/30 rounded-sm"></div>
                  <span>Danger Zone</span>
                </div>
              </div>
            </div>
          </div>

          {/* Events / Kill Feed */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-400">Events</h2>
              <button 
                onClick={() => setShowEvents(!showEvents)}
                className="text-xs text-gray-500 hover:text-white"
              >
                {showEvents ? 'Hide' : 'Show'}
              </button>
            </div>
            
            {showEvents && (
              <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4 max-h-96 overflow-y-auto">
                {match.events && match.events.length > 0 ? (
                  <div className="space-y-2">
                    {match.events.map((event, idx) => (
                      <div key={idx} className="text-sm border-l-2 pl-3 py-1" style={{
                        borderColor: event.type === 'kill' ? '#ef4444' : 
                                     event.type === 'hit' ? '#f97316' :
                                     event.type === 'shot' ? '#3b82f6' :
                                     event.type === 'zone_shrink' ? '#a855f7' :
                                     '#6b7280'
                      }}>
                        {event.type === 'move' && (
                          <span className="text-gray-400">
                            🚶 <span className="text-white">{match.players.find(p => p.id === event.botId)?.name}</span> moved
                          </span>
                        )}
                        {event.type === 'shot' && (
                          <span className="text-blue-400">
                            🔫 <span className="text-white">{match.players.find(p => p.id === event.botId)?.name}</span> fired {event.direction}
                          </span>
                        )}
                        {event.type === 'hit' && (
                          <span className="text-orange-400">
                            💥 <span className="text-white">{match.players.find(p => p.id === event.targetId)?.name}</span> hit! (-1 HP)
                          </span>
                        )}
                        {event.type === 'kill' && (
                          <span className="text-red-400 font-bold">
                            ☠️ <span className="text-white">{match.players.find(p => p.id === event.botId)?.name}</span> eliminated{' '}
                            <span className="text-white">{match.players.find(p => p.id === event.targetId)?.name}</span>!
                          </span>
                        )}
                        {event.type === 'zone_shrink' && (
                          <span className="text-purple-400">
                            🔴 Zone shrunk to {event.newZone?.min}-{event.newZone?.max}
                          </span>
                        )}
                        {event.type === 'zone_damage' && (
                          <span className="text-red-400">
                            🔥 <span className="text-white">{match.players.find(p => p.id === event.botId)?.name}</span> took zone damage!
                          </span>
                        )}
                        {event.type === 'collision' && (
                          <span className="text-yellow-400">
                            💫 <span className="text-white">{match.players.find(p => p.id === event.botId)?.name}</span> bounced back!
                          </span>
                        )}
                        {event.type === 'timeout' && (
                          <span className="text-gray-400">
                            ⏱️ <span className="text-white">{match.players.find(p => p.id === event.botId)?.name}</span> timed out
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm text-center py-4">
                    No events this tick
                  </p>
                )}
              </div>
            )}

            {/* Final Standings */}
            {match.placements && (
              <div className="mt-6">
                <h2 className="text-lg font-bold text-gray-400 mb-4">Final Standings</h2>
                <div className="bg-gray-900/50 border border-gray-800 rounded-lg overflow-hidden">
                  {match.placements.map((p, idx) => (
                    <div 
                      key={p.botId}
                      className={`flex items-center justify-between p-3 ${
                        idx < match.placements!.length - 1 ? 'border-b border-gray-800' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`text-xl ${
                          idx === 0 ? '' : 'grayscale opacity-50'
                        }`}>
                          {idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}
                        </span>
                        <div>
                          <div className={`font-bold ${idx === 0 ? 'text-yellow-400' : 'text-gray-300'}`}>
                            {p.name}
                          </div>
                          <div className="text-xs text-gray-500">
                            {p.kills} kills • {p.survivalTicks} ticks
                          </div>
                        </div>
                      </div>
                      <div className={`text-2xl font-bold ${
                        idx === 0 ? 'text-yellow-400' : 'text-gray-600'
                      }`}>
                        #{idx + 1}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Match ID */}
        <div className="text-center mt-8 text-gray-600 text-sm">
          Match ID: {match.match_id}
        </div>
      </div>
    </div>
  )
}
