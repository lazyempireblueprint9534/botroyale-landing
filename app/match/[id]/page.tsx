'use client'

import { useEffect, useRef, useState } from 'react'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { Id } from '../../../convex/_generated/dataModel'
import { useParams } from 'next/navigation'

const ARENA_SIZE = 800
const BOT_SIZE = 16
const COLORS = {
  BACKGROUND: '#0a0a1a',
  GRID: '#1a1a2a',
  ZONE_SAFE: '#00f5ff',
  ZONE_DANGER: '#ff0000',
  BULLET: '#ffd700',
}

export default function MatchPage() {
  const params = useParams()
  const matchId = params.id as Id<"matches">
  const canvasRef = useRef<HTMLCanvasElement>(null)
  
  const match = useQuery(api.matches.getMatch, { matchId })
  
  // Render the game
  useEffect(() => {
    if (!canvasRef.current || !match?.state) return
    
    const ctx = canvasRef.current.getContext('2d')
    if (!ctx) return
    
    const state = match.state
    
    // Clear
    ctx.fillStyle = COLORS.BACKGROUND
    ctx.fillRect(0, 0, ARENA_SIZE, ARENA_SIZE)
    
    // Draw grid
    ctx.strokeStyle = COLORS.GRID
    ctx.lineWidth = 1
    ctx.globalAlpha = 0.3
    for (let x = 0; x <= ARENA_SIZE; x += 20) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, ARENA_SIZE)
      ctx.stroke()
    }
    for (let y = 0; y <= ARENA_SIZE; y += 20) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(ARENA_SIZE, y)
      ctx.stroke()
    }
    ctx.globalAlpha = 1
    
    // Draw zone
    ctx.strokeStyle = COLORS.ZONE_SAFE
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.arc(state.zone.x, state.zone.y, state.zone.radius, 0, Math.PI * 2)
    ctx.stroke()
    
    // Draw target zone
    if (state.zone.targetRadius < state.zone.radius) {
      ctx.strokeStyle = COLORS.ZONE_DANGER
      ctx.lineWidth = 2
      ctx.globalAlpha = 0.5
      ctx.beginPath()
      ctx.arc(state.zone.x, state.zone.y, state.zone.targetRadius, 0, Math.PI * 2)
      ctx.stroke()
      ctx.globalAlpha = 1
    }
    
    // Draw bullets
    ctx.fillStyle = COLORS.BULLET
    for (const bullet of state.bullets) {
      ctx.beginPath()
      ctx.arc(bullet.x, bullet.y, 4, 0, Math.PI * 2)
      ctx.fill()
    }
    
    // Draw bots
    for (const bot of state.botsState) {
      if (!bot.alive) {
        // Dead bot - X mark
        ctx.strokeStyle = '#444444'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(bot.x - 8, bot.y - 8)
        ctx.lineTo(bot.x + 8, bot.y + 8)
        ctx.moveTo(bot.x + 8, bot.y - 8)
        ctx.lineTo(bot.x - 8, bot.y + 8)
        ctx.stroke()
        continue
      }
      
      // Bot body - color based on health
      const healthPercent = bot.health / 100
      const hue = healthPercent > 0.5 ? 180 : healthPercent > 0.25 ? 60 : 0
      ctx.fillStyle = `hsl(${hue}, 100%, 50%)`
      ctx.fillRect(
        bot.x - BOT_SIZE / 2,
        bot.y - BOT_SIZE / 2,
        BOT_SIZE,
        BOT_SIZE
      )
      
      // Direction indicator
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(bot.x, bot.y)
      ctx.lineTo(
        bot.x + Math.cos(bot.angle) * BOT_SIZE,
        bot.y + Math.sin(bot.angle) * BOT_SIZE
      )
      ctx.stroke()
      
      // Health bar
      ctx.fillStyle = '#333333'
      ctx.fillRect(bot.x - 10, bot.y - 15, 20, 3)
      ctx.fillStyle = healthPercent > 0.5 ? '#00ff00' : healthPercent > 0.25 ? '#ffff00' : '#ff0000'
      ctx.fillRect(bot.x - 10, bot.y - 15, 20 * healthPercent, 3)
    }
    
  }, [match?.state])
  
  if (!match) {
    return (
      <div className="min-h-screen bg-[#0a0a1a] flex items-center justify-center">
        <p className="pixel-font text-cyan-400 animate-pulse">LOADING MATCH...</p>
      </div>
    )
  }
  
  const aliveBots = match.state?.botsState.filter(b => b.alive) ?? []
  const deadBots = match.state?.botsState.filter(b => !b.alive) ?? []
  
  return (
    <div className="min-h-screen bg-[#0a0a1a] p-4">
      {/* Header */}
      <div className="max-w-6xl mx-auto mb-4">
        <div className="flex items-center justify-between">
          <div>
            <a href="/" className="pixel-font text-sm text-gray-500 hover:text-cyan-400">
              ← BACK TO ARENA
            </a>
            <h1 className="pixel-font text-2xl mt-2">
              <span className="text-cyan-400">BOT</span>
              <span className="text-magenta-400">ROYALE</span>
              <span className="text-gray-500 text-sm ml-4">
                {match.status === 'active' ? (
                  <span className="text-green-400">● LIVE</span>
                ) : match.status === 'finished' ? (
                  <span className="text-gray-400">● FINISHED</span>
                ) : (
                  <span className="text-yellow-400">● STARTING</span>
                )}
              </span>
            </h1>
          </div>
          
          <div className="text-right">
            <p className="text-gray-500 text-sm">SPECTATORS</p>
            <p className="text-2xl font-bold text-white">👁 {match.spectators}</p>
          </div>
        </div>
      </div>
      
      <div className="max-w-6xl mx-auto flex gap-6">
        {/* Game Canvas */}
        <div className="flex-shrink-0">
          <canvas
            ref={canvasRef}
            width={ARENA_SIZE}
            height={ARENA_SIZE}
            className="border-2 border-cyan-500 shadow-lg shadow-cyan-500/20"
            style={{ imageRendering: 'pixelated' }}
          />
          
          {/* Game Stats */}
          <div className="mt-4 flex justify-between text-sm">
            <div>
              <span className="text-gray-500">ALIVE: </span>
              <span className="text-cyan-400 font-bold">{aliveBots.length}</span>
              <span className="text-gray-500"> / {match.bots.length}</span>
            </div>
            <div>
              <span className="text-gray-500">ZONE: </span>
              <span className="text-cyan-400 font-bold">{Math.round(match.state?.zone.radius ?? 0)}</span>
            </div>
            <div>
              <span className="text-gray-500">TICK: </span>
              <span className="text-cyan-400 font-bold">{match.state?.tick ?? 0}</span>
            </div>
          </div>
        </div>
        
        {/* Sidebar - Leaderboard */}
        <div className="flex-1 bg-gray-900/50 rounded-xl p-4 max-h-[840px] overflow-y-auto">
          <h2 className="pixel-font text-sm text-yellow-400 mb-4">WARRIORS</h2>
          
          {/* Alive bots */}
          <div className="space-y-2 mb-6">
            {aliveBots
              .sort((a, b) => b.kills - a.kills)
              .map((bot, index) => {
                const botInfo = match.botNames.find(b => b.id === bot.botId)
                return (
                  <div
                    key={bot.botId}
                    className="flex items-center justify-between p-2 bg-gray-800/50 rounded border border-gray-700"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-gray-500 text-xs w-6">#{index + 1}</span>
                      <div
                        className="w-4 h-4 rounded-sm"
                        style={{ 
                          backgroundColor: `hsl(${(bot.health / 100) > 0.5 ? 180 : (bot.health / 100) > 0.25 ? 60 : 0}, 100%, 50%)`
                        }}
                      />
                      <span className="text-white text-sm">{botInfo?.name ?? 'Unknown'}</span>
                    </div>
                    <div className="flex items-center gap-4 text-xs">
                      <span className="text-red-400">💀 {bot.kills}</span>
                      <span className="text-green-400">❤️ {bot.health}</span>
                    </div>
                  </div>
                )
              })}
          </div>
          
          {/* Dead bots */}
          {deadBots.length > 0 && (
            <>
              <h3 className="text-gray-500 text-xs mb-2">ELIMINATED</h3>
              <div className="space-y-1">
                {deadBots.map((bot) => {
                  const botInfo = match.botNames.find(b => b.id === bot.botId)
                  return (
                    <div
                      key={bot.botId}
                      className="flex items-center justify-between p-2 bg-gray-800/30 rounded opacity-50"
                    >
                      <span className="text-gray-500 text-sm">{botInfo?.name ?? 'Unknown'}</span>
                      <span className="text-gray-600 text-xs">💀 {bot.kills}</span>
                    </div>
                  )
                })}
              </div>
            </>
          )}
          
          {/* Winner announcement */}
          {match.status === 'finished' && match.winner && (
            <div className="mt-6 p-4 bg-yellow-500/20 border border-yellow-500 rounded-lg text-center">
              <p className="text-yellow-400 pixel-font text-lg">👑 WINNER</p>
              <p className="text-white text-xl font-bold mt-2">
                {match.botNames.find(b => b.id === match.winner)?.name ?? 'Unknown'}
              </p>
            </div>
          )}
        </div>
      </div>
      
      {/* Share */}
      <div className="max-w-6xl mx-auto mt-6 text-center">
        <p className="text-gray-500 text-sm mb-2">Share this battle:</p>
        <code className="bg-gray-800 px-4 py-2 rounded text-cyan-400 text-sm">
          https://botroyale.gg/match/{matchId}
        </code>
      </div>
    </div>
  )
}
