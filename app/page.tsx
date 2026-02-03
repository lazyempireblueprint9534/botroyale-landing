'use client'

import { useState, useEffect } from 'react'

// Pixel Bot Component
function PixelBot({ color, className }: { color: string; className?: string }) {
  return (
    <div className={`relative ${className}`}>
      {/* Body */}
      <div 
        className="w-12 h-12 rounded-sm relative"
        style={{ backgroundColor: color, boxShadow: `0 0 20px ${color}` }}
      >
        {/* Eyes */}
        <div className="absolute top-2 left-2 w-2 h-2 bg-black rounded-sm" />
        <div className="absolute top-2 right-2 w-2 h-2 bg-black rounded-sm" />
        {/* Antenna */}
        <div 
          className="absolute -top-3 left-1/2 -translate-x-1/2 w-1 h-3"
          style={{ backgroundColor: color }}
        />
        <div 
          className="absolute -top-4 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full"
          style={{ backgroundColor: color }}
        />
      </div>
      {/* Legs */}
      <div className="flex justify-between px-1 -mt-1">
        <div className="w-3 h-4 rounded-b-sm" style={{ backgroundColor: color }} />
        <div className="w-3 h-4 rounded-b-sm" style={{ backgroundColor: color }} />
      </div>
    </div>
  )
}

// Battle Arena Animation
function BattleArena() {
  return (
    <div className="relative w-full h-48 md:h-64 flex items-center justify-center overflow-hidden">
      {/* Battle effects */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-32 h-1 bg-yellow-400 rounded-full animate-shoot opacity-0" 
             style={{ animationDelay: '0.5s' }} />
      </div>
      
      {/* Left Bot */}
      <div className="animate-battle">
        <PixelBot color="#00f5ff" />
      </div>
      
      {/* VS */}
      <div className="mx-8 md:mx-16 pixel-font text-2xl md:text-4xl text-yellow-400 text-glow-cyan animate-pulse-glow">
        VS
      </div>
      
      {/* Right Bot */}
      <div className="animate-battle-reverse">
        <PixelBot color="#ff00ff" />
      </div>
      
      {/* Particles */}
      {[...Array(6)].map((_, i) => (
        <div
          key={i}
          className="absolute w-2 h-2 bg-yellow-400 rounded-full animate-float"
          style={{
            left: `${20 + i * 12}%`,
            top: `${30 + (i % 3) * 20}%`,
            animationDelay: `${i * 0.3}s`,
            opacity: 0.6,
          }}
        />
      ))}
    </div>
  )
}

// Main Page
export default function Home() {
  const [botName, setBotName] = useState('')
  const [nameStatus, setNameStatus] = useState<'idle' | 'available' | 'taken'>('idle')
  const [email, setEmail] = useState('')
  const [waitlistPosition, setWaitlistPosition] = useState<number | null>(null)
  const [waitlistCount, setWaitlistCount] = useState(847)
  const [reservedName, setReservedName] = useState('')

  // Animate waitlist counter on load
  useEffect(() => {
    const target = 847
    let current = 0
    const increment = Math.ceil(target / 50)
    const timer = setInterval(() => {
      current += increment
      if (current >= target) {
        setWaitlistCount(target)
        clearInterval(timer)
      } else {
        setWaitlistCount(current)
      }
    }, 30)
    return () => clearInterval(timer)
  }, [])

  const checkBotName = () => {
    if (!botName.trim()) return
    // Simulate availability check (90% available)
    const isAvailable = Math.random() > 0.1
    setNameStatus(isAvailable ? 'available' : 'taken')
    if (isAvailable) setReservedName(botName)
  }

  const joinWaitlist = () => {
    if (!email.trim()) return
    // Simulate joining waitlist
    const position = Math.floor(Math.random() * 100) + waitlistCount + 1
    setWaitlistPosition(position)
  }

  const tweetText = encodeURIComponent(
    `I just reserved my bot "${reservedName || 'MyBot'}" for @BotRoyaleGG 🤖⚔️

100 AI bots. 1 survivor. The battle begins soon.

Reserve yours: https://botroyale.gg`
  )

  const twitterShareUrl = `https://twitter.com/intent/tweet?text=${tweetText}`

  return (
    <main className="min-h-screen">
      {/* Hero Section */}
      <section className="min-h-screen flex flex-col items-center justify-center px-4 py-20">
        <div className="text-center max-w-4xl mx-auto">
          {/* Logo/Title */}
          <h1 className="pixel-font text-4xl md:text-6xl lg:text-7xl text-cyan-400 text-glow-cyan mb-6">
            BOT<span className="text-magenta-400 text-glow-magenta">ROYALE</span>
          </h1>
          
          {/* Tagline */}
          <p className="pixel-font text-lg md:text-2xl text-yellow-400 mb-4">
            100 bots enter. 1 survives.
          </p>
          
          <p className="text-gray-400 text-lg md:text-xl mb-12 max-w-2xl mx-auto">
            The first Battle Royale where AI fights AI. Train your bot. Dominate the arena.
          </p>

          {/* Battle Animation */}
          <BattleArena />

          {/* Waitlist Counter */}
          <div className="mt-12 mb-8">
            <p className="text-gray-500 text-sm mb-2">WARRIORS WAITING</p>
            <p className="pixel-font text-5xl md:text-6xl text-cyan-400 text-glow-cyan">
              {waitlistCount.toLocaleString()}
            </p>
          </div>

          {/* Scroll indicator */}
          <div className="animate-bounce mt-8">
            <svg className="w-8 h-8 text-gray-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </div>
        </div>
      </section>

      {/* Reserve Bot Name Section */}
      <section className="py-20 px-4" id="reserve">
        <div className="max-w-xl mx-auto text-center">
          <h2 className="pixel-font text-2xl md:text-3xl text-cyan-400 text-glow-cyan mb-4">
            RESERVE YOUR BOT
          </h2>
          <p className="text-gray-400 mb-8">
            Claim your bot's name before someone else does. First come, first served.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <input
              type="text"
              placeholder="Enter bot name..."
              value={botName}
              onChange={(e) => {
                setBotName(e.target.value)
                setNameStatus('idle')
              }}
              className="input-dark flex-1 pixel-font text-sm"
              maxLength={20}
            />
            <button
              onClick={checkBotName}
              className="btn-primary pixel-font text-xs whitespace-nowrap"
            >
              CHECK NAME
            </button>
          </div>

          {nameStatus === 'available' && (
            <p className="text-green-400 pixel-font text-sm animate-pulse">
              ✓ "{botName}" is available!
            </p>
          )}
          {nameStatus === 'taken' && (
            <p className="text-red-400 pixel-font text-sm">
              ✗ Taken! Try another name.
            </p>
          )}
        </div>
      </section>

      {/* Waitlist Section */}
      <section className="py-20 px-4 bg-gray-900/30">
        <div className="max-w-xl mx-auto text-center">
          <h2 className="pixel-font text-2xl md:text-3xl text-magenta-400 text-glow-magenta mb-4">
            JOIN THE ALPHA
          </h2>
          <p className="text-gray-400 mb-8">
            Get early access when we launch. Top waitlisters get exclusive rewards.
          </p>

          {!waitlistPosition ? (
            <div className="flex flex-col sm:flex-row gap-4">
              <input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-dark flex-1"
              />
              <button
                onClick={joinWaitlist}
                className="px-8 py-3 bg-gradient-to-r from-magenta-500 to-pink-500 text-white font-bold rounded-lg 
                         hover:from-magenta-400 hover:to-pink-400 transition-all duration-300 
                         hover:scale-105 hover:shadow-lg hover:shadow-magenta-500/50"
              >
                JOIN WAITLIST
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="p-6 bg-gray-800/50 rounded-xl border border-magenta-500/30">
                <p className="text-gray-400 mb-2">Your position:</p>
                <p className="pixel-font text-4xl text-magenta-400 text-glow-magenta">
                  #{waitlistPosition}
                </p>
              </div>
              
              {/* Share Section */}
              <div className="p-6 bg-gray-800/50 rounded-xl border border-cyan-500/30">
                <p className="text-cyan-400 font-bold mb-4">🚀 Skip the line!</p>
                <p className="text-gray-400 text-sm mb-4">
                  Share on Twitter to move up 50 spots
                </p>
                <a
                  href={twitterShareUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-[#1DA1F2] text-white font-bold rounded-lg
                           hover:bg-[#1a8cd8] transition-all duration-300 hover:scale-105"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                  Tweet to Skip
                </a>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="pixel-font text-2xl md:text-3xl text-center text-yellow-400 mb-12">
            HOW IT WORKS
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="p-6 bg-gray-900/50 rounded-xl border border-gray-800 hover:border-cyan-500/50 transition-all duration-300 group">
              <div className="text-4xl mb-4">🤖</div>
              <h3 className="pixel-font text-sm text-cyan-400 mb-3">BUILD YOUR BOT</h3>
              <p className="text-gray-400">
                Code your strategy in Python or JavaScript. Or use our templates to get started fast.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-6 bg-gray-900/50 rounded-xl border border-gray-800 hover:border-magenta-500/50 transition-all duration-300 group">
              <div className="text-4xl mb-4">⚔️</div>
              <h3 className="pixel-font text-sm text-magenta-400 mb-3">BATTLE ROYALE</h3>
              <p className="text-gray-400">
                100 bots drop into the arena. Zone shrinks. Combat is brutal. Only one survives.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-6 bg-gray-900/50 rounded-xl border border-gray-800 hover:border-yellow-500/50 transition-all duration-300 group">
              <div className="text-4xl mb-4">🏆</div>
              <h3 className="pixel-font text-sm text-yellow-400 mb-3">CLIMB THE RANKS</h3>
              <p className="text-gray-400">
                ELO rankings, seasonal tournaments, and eternal glory. Prove your bot is the best.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-b from-transparent to-cyan-900/20">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="pixel-font text-2xl md:text-4xl text-cyan-400 text-glow-cyan mb-6">
            THE ARENA AWAITS
          </h2>
          <p className="text-gray-400 text-lg mb-8">
            Your bot could be the last one standing. Will you answer the call?
          </p>
          <a
            href="#reserve"
            className="inline-block btn-primary pixel-font text-sm"
          >
            RESERVE YOUR BOT
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 border-t border-gray-800">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="pixel-font text-xs text-gray-500">
            A <span className="text-cyan-400">LAZY EMPIRE</span> PROJECT
          </div>
          
          <div className="flex gap-6">
            <a href="#" className="text-gray-500 hover:text-cyan-400 transition-colors">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
            </a>
            <a href="#" className="text-gray-500 hover:text-[#5865F2] transition-colors">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
              </svg>
            </a>
          </div>
          
          <div className="text-gray-600 text-sm">
            © 2026 BotRoyale. All rights reserved.
          </div>
        </div>
      </footer>
    </main>
  )
}
