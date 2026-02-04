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

    // Check if twitter already registered
    const existingTwitter = await ctx.db
      .query("bots")
      .withIndex("by_twitter", (q) => q.eq("twitter", args.twitter.toLowerCase()))
      .first();
    if (existingTwitter) {
      return { success: false, error: "Twitter handle already registered" };
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
