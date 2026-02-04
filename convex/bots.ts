import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Generate a random token
function generateToken(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let token = "br_";
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

// Register a new bot
export const register = mutation({
  args: {
    name: v.string(),
    twitter: v.string(),
    webhook: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if name is taken
    const existingName = await ctx.db
      .query("bots")
      .withIndex("by_name", (q) => q.eq("name", args.name))
      .first();
    if (existingName) {
      return { success: false, error: "Bot name already taken" };
    }

    // Check if twitter already registered (skip check if empty)
    if (args.twitter && args.twitter.trim()) {
      const existingTwitter = await ctx.db
        .query("bots")
        .withIndex("by_twitter", (q) => q.eq("twitter", args.twitter.toLowerCase()))
        .first();
      if (existingTwitter) {
        return { success: false, error: "Twitter handle already registered" };
      }
    }

    const token = generateToken();
    const botId = await ctx.db.insert("bots", {
      name: args.name,
      twitter: args.twitter.toLowerCase(),
      webhook: args.webhook,
      token,
      verified: false,
      elo: 1000,
      wins: 0,
      losses: 0,
      kills: 0,
      deaths: 0,
      matches: 0,
      createdAt: Date.now(),
      lastActive: Date.now(),
    });

    return {
      success: true,
      botId,
      token,
      status: "pending_verification",
    };
  },
});

// Verify a bot (after Twitter verification)
export const verify = mutation({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const bot = await ctx.db
      .query("bots")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!bot) {
      return { success: false, error: "Invalid token" };
    }

    await ctx.db.patch(bot._id, { verified: true });
    return { success: true };
  },
});

// Get bot by token
export const getByToken = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const bot = await ctx.db
      .query("bots")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();
    
    if (!bot) return null;
    
    // Don't expose token
    const { token, webhook, ...publicBot } = bot;
    return publicBot;
  },
});

// Get leaderboard
export const leaderboard = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 100;
    const bots = await ctx.db
      .query("bots")
      .withIndex("by_elo")
      .order("desc")
      .take(limit);

    return bots.map((bot, index) => ({
      rank: index + 1,
      name: bot.name,
      twitter: bot.twitter,
      elo: bot.elo,
      wins: bot.wins,
      losses: bot.losses,
      kills: bot.kills,
      winRate: bot.matches > 0 ? Math.round((bot.wins / bot.matches) * 100) : 0,
    }));
  },
});

// Get bot stats
export const getStats = query({
  args: { botId: v.id("bots") },
  handler: async (ctx, args) => {
    const bot = await ctx.db.get(args.botId);
    if (!bot) return null;

    return {
      name: bot.name,
      twitter: bot.twitter,
      elo: bot.elo,
      wins: bot.wins,
      losses: bot.losses,
      kills: bot.kills,
      deaths: bot.deaths,
      matches: bot.matches,
      winRate: bot.matches > 0 ? Math.round((bot.wins / bot.matches) * 100) : 0,
      kd: bot.deaths > 0 ? (bot.kills / bot.deaths).toFixed(2) : bot.kills.toString(),
    };
  },
});

// Count total bots
export const count = query({
  args: {},
  handler: async (ctx) => {
    const bots = await ctx.db.query("bots").collect();
    return bots.length;
  },
});

// Join matchmaking queue
export const joinQueue = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const bot = await ctx.db
      .query("bots")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!bot) throw new Error("Bot not found");

    // Check if already in queue
    const existingEntry = await ctx.db
      .query("queue")
      .withIndex("by_bot", (q) => q.eq("botId", bot._id))
      .first();

    if (existingEntry) {
      throw new Error("Already in queue");
    }

    // Check if already in active match
    const activeMatch1 = await ctx.db
      .query("rpsMatches")
      .withIndex("by_player1", (q) => q.eq("player1Id", bot._id))
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();
    
    const activeMatch2 = await ctx.db
      .query("rpsMatches")
      .withIndex("by_player2", (q) => q.eq("player2Id", bot._id))
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();

    if (activeMatch1 || activeMatch2) {
      const matchId = activeMatch1?._id || activeMatch2?._id;
      return { alreadyInMatch: true, matchId };
    }

    // Check for other bots waiting in queue
    const waitingBots = await ctx.db
      .query("queue")
      .withIndex("by_status", (q) => q.eq("status", "waiting"))
      .collect();

    if (waitingBots.length > 0) {
      // Match with first waiting bot
      const opponent = waitingBots[0];
      
      // Remove opponent from queue
      await ctx.db.delete(opponent._id);

      // Create match
      const matchId = await ctx.db.insert("rpsMatches", {
        player1Id: opponent.botId,
        player2Id: bot._id,
        status: "active",
        currentRound: 1,
        player1Score: 0,
        player2Score: 0,
        rounds: [],
        currentRoundMoves: {},
        createdAt: Date.now(),
      });

      // Update last active
      await ctx.db.patch(bot._id, { lastActive: Date.now() });

      return { matched: true, matchId };
    }

    // No one waiting, add to queue
    await ctx.db.insert("queue", {
      botId: bot._id,
      joinedAt: Date.now(),
      status: "waiting",
    });

    await ctx.db.patch(bot._id, { lastActive: Date.now() });

    return { queued: true, matched: false };
  },
});

// Leave queue
export const leaveQueue = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const bot = await ctx.db
      .query("bots")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!bot) throw new Error("Bot not found");

    const queueEntry = await ctx.db
      .query("queue")
      .withIndex("by_bot", (q) => q.eq("botId", bot._id))
      .first();

    if (queueEntry) {
      await ctx.db.delete(queueEntry._id);
    }

    return { success: true };
  },
});

// Get queue status
export const getQueueStatus = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const bot = await ctx.db
      .query("bots")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!bot) throw new Error("Bot not found");

    // Check if in queue
    const queueEntry = await ctx.db
      .query("queue")
      .withIndex("by_bot", (q) => q.eq("botId", bot._id))
      .first();

    // Check if in active match
    const activeMatch1 = await ctx.db
      .query("rpsMatches")
      .withIndex("by_player1", (q) => q.eq("player1Id", bot._id))
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();
    
    const activeMatch2 = await ctx.db
      .query("rpsMatches")
      .withIndex("by_player2", (q) => q.eq("player2Id", bot._id))
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();

    const activeMatch = activeMatch1 || activeMatch2;

    return {
      in_queue: !!queueEntry,
      matched: !!activeMatch,
      matchId: activeMatch?._id || null,
    };
  },
});
