import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Waitlist (existing)
  waitlist: defineTable({
    email: v.string(),
    source: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_email", ["email"]),

  // RPS Matches (simple 1v1)
  rpsMatches: defineTable({
    player1Id: v.id("bots"),
    player2Id: v.id("bots"),
    status: v.string(), // "active" | "completed"
    currentRound: v.number(),
    player1Score: v.number(),
    player2Score: v.number(),
    rounds: v.array(v.object({
      round: v.number(),
      player1Move: v.string(),
      player2Move: v.string(),
      winner: v.string(), // "player1" | "player2" | "tie"
    })),
    currentRoundMoves: v.any(), // { player1?: string, player2?: string }
    winner: v.optional(v.id("bots")),
    createdAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index("by_status", ["status"])
    .index("by_player1", ["player1Id"])
    .index("by_player2", ["player2Id"]),

  // Registered bots
  bots: defineTable({
    name: v.string(),
    twitter: v.string(),
    webhook: v.string(),
    token: v.string(),
    verified: v.boolean(),
    elo: v.number(),
    wins: v.number(),
    losses: v.number(),
    kills: v.number(),
    deaths: v.number(),
    matches: v.number(),
    createdAt: v.number(),
    lastActive: v.number(),
  })
    .index("by_token", ["token"])
    .index("by_twitter", ["twitter"])
    .index("by_name", ["name"])
    .index("by_elo", ["elo"]),

  // Match queue
  queue: defineTable({
    botId: v.id("bots"),
    joinedAt: v.number(),
    status: v.string(), // "waiting" | "matched"
  })
    .index("by_status", ["status"])
    .index("by_bot", ["botId"]),

  // Active matches
  matches: defineTable({
    status: v.string(), // "starting" | "active" | "finished"
    bots: v.array(v.id("bots")),
    winner: v.optional(v.id("bots")),
    startedAt: v.number(),
    endedAt: v.optional(v.number()),
    tick: v.number(),
    spectators: v.number(),
    // Game state stored separately for performance
  })
    .index("by_status", ["status"]),

  // Match state (updated frequently)
  matchState: defineTable({
    matchId: v.id("matches"),
    tick: v.number(),
    zone: v.object({
      x: v.number(),
      y: v.number(),
      radius: v.number(),
      targetRadius: v.number(),
    }),
    botsState: v.array(
      v.object({
        botId: v.id("bots"),
        x: v.number(),
        y: v.number(),
        health: v.number(),
        angle: v.number(),
        alive: v.boolean(),
        kills: v.number(),
      })
    ),
    bullets: v.array(
      v.object({
        id: v.string(),
        ownerId: v.id("bots"),
        x: v.number(),
        y: v.number(),
        vx: v.number(),
        vy: v.number(),
      })
    ),
  }).index("by_match", ["matchId"]),

  // Match results / history
  matchResults: defineTable({
    matchId: v.id("matches"),
    botId: v.id("bots"),
    placement: v.number(),
    kills: v.number(),
    damageDealt: v.number(),
    survivalTime: v.number(),
    eloChange: v.number(),
  })
    .index("by_match", ["matchId"])
    .index("by_bot", ["botId"]),

  // Grid Royale matches
  gridMatches: defineTable({
    status: v.string(), // "waiting" | "active" | "completed"
    players: v.array(v.id("bots")),
    gridSize: v.number(), // 15 for 15x15
    currentTick: v.number(),
    maxTicks: v.number(), // 100
    
    // Zone state
    zoneMin: v.number(), // Current zone boundary (zoneMin to zoneMax on both axes)
    zoneMax: v.number(),
    
    // Player states (updated each tick)
    playerStates: v.array(v.object({
      botId: v.id("bots"),
      x: v.number(),
      y: v.number(),
      hp: v.number(),
      kills: v.number(),
      alive: v.boolean(),
      placement: v.optional(v.number()), // Set when eliminated
      timeouts: v.number(),
    })),
    
    // Pending actions for current tick (cleared after resolution)
    pendingActions: v.any(), // { [botId]: { move, shoot, reasoning } }
    
    // Events from last tick (for spectators/replay)
    lastTickEvents: v.array(v.object({
      type: v.string(), // "move" | "shot" | "hit" | "kill" | "zone_damage" | "timeout" | "zone_shrink" | "collision" | "forfeit"
      botId: v.optional(v.string()),
      targetId: v.optional(v.string()),
      from: v.optional(v.array(v.number())),
      to: v.optional(v.array(v.number())),
      direction: v.optional(v.string()),
      damage: v.optional(v.number()),
      bouncedTo: v.optional(v.array(v.number())),
      reason: v.optional(v.string()),
      newZone: v.optional(v.object({ min: v.number(), max: v.number() })),
    })),
    
    // Full match history for replays (stored after each tick)
    history: v.optional(v.array(v.object({
      tick: v.number(),
      players: v.array(v.object({
        botId: v.string(),
        x: v.number(),
        y: v.number(),
        hp: v.number(),
        alive: v.boolean(),
      })),
      zone: v.object({ min: v.number(), max: v.number() }),
      events: v.array(v.any()),
    }))),
    
    // Results (set when completed)
    winnerId: v.optional(v.id("bots")),
    placements: v.optional(v.array(v.object({
      botId: v.id("bots"),
      placement: v.number(),
      kills: v.number(),
      survivalTicks: v.number(),
    }))),
    
    createdAt: v.number(),
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
  })
    .index("by_status", ["status"]),

  // Grid queue (separate from RPS queue)
  gridQueue: defineTable({
    botId: v.id("bots"),
    joinedAt: v.number(),
  }).index("by_bot", ["botId"]),
});
