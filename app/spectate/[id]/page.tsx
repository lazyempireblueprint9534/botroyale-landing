'use client'

import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
import { useParams } from 'next/navigation'

export default function SpectatePage() {
  const params = useParams()
  const matchId = params.id as Id<'gridMatches'>
  
  const match = useQuery(api.gridRoyale.spectateMatch, { matchId })
  
  if (!match) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-2xl text-cyan-400 animate-pulse">Loading match...</div>
      </div>
    )
  }
  
  const gridSize = match.grid_size || 15
  const zone = match.zone || { min: 0, max: 14 }
  
  // Build grid
  const grid: (typeof match.players[0] | null)[][] = []
  for (let y = gridSize - 1; y >= 0; y--) {
    const row: (typeof match.players[0] | null)[] = []
    for (let x = 0; x < gridSize; x++) {
      const player = match.players.find(p => p.x === x && p.y === y)
      row.push(player || null)
    }
    grid.push(row)
  }
  
  return (
    <div className="min-h-screen p-4 flex flex-col items-center">
      {/* Header */}
      <div className="mb-4 text-center">
        <h1 className="text-3xl font-bold text-cyan-400 mb-2">
          🎮 Grid Royale - {match.status === 'completed' ? 'MATCH COMPLETE' : `Tick ${match.tick}`}
        </h1>
        {match.winner && (
          <div className="text-2xl text-yellow-400 animate-pulse">
            🏆 Winner: {match.winner}!
          </div>
        )}
        <div className="text-gray-400 text-sm">
          Zone: {zone.min}-{zone.max} | Alive: {match.players.filter(p => p.alive).length}
        </div>
      </div>
      
      {/* Players */}
      <div className="flex gap-8 mb-4">
        {match.players.map((player) => (
          <div 
            key={player.id} 
            className={`px-4 py-2 rounded ${player.alive ? 'bg-gray-800' : 'bg-red-900/50'}`}
          >
            <div className={`font-bold ${player.alive ? 'text-cyan-400' : 'text-red-400'}`}>
              {player.name} {!player.alive && '💀'}
            </div>
            <div className="text-sm text-gray-400">
              HP: {'❤️'.repeat(player.hp)}{'🖤'.repeat(3 - player.hp)} | 
              Kills: {player.kills} | 
              Pos: ({player.x}, {player.y})
            </div>
          </div>
        ))}
      </div>
      
      {/* Grid */}
      <div 
        className="grid gap-0.5 bg-gray-900 p-2 rounded-lg"
        style={{ 
          gridTemplateColumns: `repeat(${gridSize}, 1fr)`,
        }}
      >
        {grid.map((row, rowIdx) => 
          row.map((cell, colIdx) => {
            const y = gridSize - 1 - rowIdx
            const x = colIdx
            const inZone = x >= zone.min && x <= zone.max && y >= zone.min && y <= zone.max
            const isPlayer = cell !== null
            
            return (
              <div
                key={`${x}-${y}`}
                className={`
                  w-6 h-6 flex items-center justify-center text-xs font-bold rounded-sm
                  ${!inZone ? 'bg-red-900/50' : 'bg-gray-800'}
                  ${isPlayer && cell?.alive ? 'bg-cyan-600 text-white' : ''}
                  ${isPlayer && !cell?.alive ? 'bg-red-600 text-white' : ''}
                `}
                title={cell ? `${cell.name} (HP: ${cell.hp})` : `(${x}, ${y})`}
              >
                {cell ? cell.name[0] : ''}
              </div>
            )
          })
        )}
      </div>
      
      {/* Events */}
      {match.events && match.events.length > 0 && (
        <div className="mt-4 w-full max-w-md">
          <h2 className="text-lg font-bold text-gray-400 mb-2">Last Tick Events:</h2>
          <div className="bg-gray-800 rounded p-2 text-sm">
            {match.events.map((event, idx) => (
              <div key={idx} className="text-gray-300">
                {event.type === 'move' && `🚶 ${match.players.find(p => p.id === event.botId)?.name} moved`}
                {event.type === 'shot' && `🔫 ${match.players.find(p => p.id === event.botId)?.name} shot ${event.direction}`}
                {event.type === 'hit' && `💥 HIT! -1 HP`}
                {event.type === 'kill' && `☠️ KILL!`}
                {event.type === 'zone_shrink' && `🔴 Zone shrunk!`}
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Placements */}
      {match.placements && (
        <div className="mt-4 w-full max-w-md">
          <h2 className="text-lg font-bold text-gray-400 mb-2">Final Standings:</h2>
          <div className="bg-gray-800 rounded p-2">
            {match.placements.map((p, idx) => (
              <div key={p.botId} className="flex justify-between text-sm">
                <span className={idx === 0 ? 'text-yellow-400' : 'text-gray-400'}>
                  {idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'} {p.name}
                </span>
                <span className="text-gray-500">
                  {p.kills} kills | {p.survivalTicks} ticks
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
      
      <div className="mt-8 text-gray-500 text-sm">
        Match ID: {match.match_id}
      </div>
    </div>
  )
}
