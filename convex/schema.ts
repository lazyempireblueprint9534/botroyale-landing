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
});
