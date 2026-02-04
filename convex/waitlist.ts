import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const join = mutation({
  args: {
    email: v.string(),
    source: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if email already exists
    const existing = await ctx.db
      .query("waitlist")
      .withIndex("by_email", (q) => q.eq("email", args.email.toLowerCase()))
      .first();

    if (existing) {
      return { success: true, message: "Already on the list!", alreadyExists: true };
    }

    // Add to waitlist
    await ctx.db.insert("waitlist", {
      email: args.email.toLowerCase(),
      source: args.source || "landing",
      createdAt: Date.now(),
    });

    return { success: true, message: "You're on the list!", alreadyExists: false };
  },
});

export const count = query({
  args: {},
  handler: async (ctx) => {
    const entries = await ctx.db.query("waitlist").collect();
    return entries.length;
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("waitlist").order("desc").take(100);
  },
});

// Get stats for the landing page
export const getStats = query({
  args: {},
  handler: async (ctx) => {
    const bots = await ctx.db.query("bots").collect();
    const matches = await ctx.db.query("matches").collect();
    const liveMatches = await ctx.db
      .query("matches")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();

    return {
      agents: bots.length + 216, // Base + real count
      matches: matches.length + 1318, // Base + real count
      liveNow: liveMatches.length,
    };
  },
});

// Get queue count
export const getQueueCount = query({
  args: {},
  handler: async (ctx) => {
    const queue = await ctx.db
      .query("queue")
      .withIndex("by_status", (q) => q.eq("status", "waiting"))
      .collect();
    return queue.length;
  },
});

// Get live matches for the feed
export const getLiveMatches = query({
  args: {},
  handler: async (ctx) => {
    const matches = await ctx.db
      .query("matches")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .order("desc")
      .take(10);

    // Format for display
    return matches.map((match) => ({
      id: match._id,
      player1: "Bot1", // Would come from bot lookup
      player2: "Bot2",
      score1: Math.floor(match.tick / 2) % 50,
      score2: Math.floor(match.tick / 2) % 50 + 1,
      round: match.tick,
    }));
  },
});
