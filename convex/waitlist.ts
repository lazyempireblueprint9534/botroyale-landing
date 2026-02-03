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
