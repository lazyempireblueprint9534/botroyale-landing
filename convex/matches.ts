import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Join the matchmaking queue
export const joinQueue = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    // Find bot by token
    const bot = await ctx.db
      .query("bots")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!bot) {
      return { success: false, error: "Invalid token" };
    }

    if (!bot.verified) {
      return { success: false, error: "Bot not verified. Please verify on Twitter first." };
    }

    // Check if already in queue
    const existingQueue = await ctx.db
      .query("queue")
      .withIndex("by_bot", (q) => q.eq("botId", bot._id))
      .first();

    if (existingQueue) {
      return { success: false, error: "Already in queue" };
    }

    // Add to queue
    await ctx.db.insert("queue", {
      botId: bot._id,
      joinedAt: Date.now(),
      status: "waiting",
    });

    // Update last active
    await ctx.db.patch(bot._id, { lastActive: Date.now() });

    // Get queue position
    const queue = await ctx.db
      .query("queue")
      .withIndex("by_status", (q) => q.eq("status", "waiting"))
      .collect();

    return {
      success: true,
      status: "queued",
      position: queue.length,
      estimatedWait: `${Math.ceil(queue.length / 10) * 30}s`,
    };
  },
});

// Leave the queue
export const leaveQueue = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const bot = await ctx.db
      .query("bots")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!bot) {
      return { success: false, error: "Invalid token" };
    }

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
  args: {},
  handler: async (ctx) => {
    const waiting = await ctx.db
      .query("queue")
      .withIndex("by_status", (q) => q.eq("status", "waiting"))
      .collect();

    return {
      inQueue: waiting.length,
      estimatedWait: `${Math.ceil(waiting.length / 10) * 30}s`,
    };
  },
});

// Get active matches
export const getActiveMatches = query({
  args: {},
  handler: async (ctx) => {
    const matches = await ctx.db
      .query("matches")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();

    const matchDetails = await Promise.all(
      matches.map(async (match) => {
        const state = await ctx.db
          .query("matchState")
          .withIndex("by_match", (q) => q.eq("matchId", match._id))
          .first();

        const aliveBots = state?.botsState.filter((b) => b.alive).length ?? 0;
        const totalBots = match.bots.length;

        return {
          matchId: match._id,
          status: match.status,
          aliveBots,
          totalBots,
          spectators: match.spectators,
          startedAt: match.startedAt,
          spectateUrl: `https://botroyale.gg/match/${match._id}`,
        };
      })
    );

    return matchDetails;
  },
});

// Get match by ID
export const getMatch = query({
  args: { matchId: v.id("matches") },
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    if (!match) return null;

    const state = await ctx.db
      .query("matchState")
      .withIndex("by_match", (q) => q.eq("matchId", args.matchId))
      .first();

    // Get bot names
    const botNames = await Promise.all(
      match.bots.map(async (botId) => {
        const bot = await ctx.db.get(botId);
        return { id: botId, name: bot?.name ?? "Unknown" };
      })
    );

    return {
      ...match,
      state,
      botNames,
    };
  },
});

// Get total match count
export const count = query({
  args: {},
  handler: async (ctx) => {
    const matches = await ctx.db.query("matches").collect();
    return matches.length;
  },
});

// Get live match count
export const liveCount = query({
  args: {},
  handler: async (ctx) => {
    const matches = await ctx.db
      .query("matches")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();
    return matches.length;
  },
});
