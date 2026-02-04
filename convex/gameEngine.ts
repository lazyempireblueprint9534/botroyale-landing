import { internalMutation, internalAction, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

// Game constants
const ARENA_SIZE = 800;
const BOT_SIZE = 16;
const BOT_SPEED = 3;
const BOT_MAX_HEALTH = 100;
const BULLET_SPEED = 8;
const BULLET_DAMAGE = 15;
const ZONE_DAMAGE_PER_SECOND = 5;
const ZONE_SHRINK_INTERVAL = 5000;
const ZONE_SHRINK_AMOUNT = 20;
const TICK_RATE = 500; // ms between ticks
const MIN_BOTS_TO_START = 10; // Minimum bots to start a match (lower for testing)

// Check queue and start match if enough bots
export const checkQueueAndStartMatch = internalMutation({
  args: {},
  handler: async (ctx) => {
    const waiting = await ctx.db
      .query("queue")
      .withIndex("by_status", (q) => q.eq("status", "waiting"))
      .collect();

    if (waiting.length < MIN_BOTS_TO_START) {
      return null;
    }

    // Take up to 100 bots from queue
    const matchBots = waiting.slice(0, 100);
    const botIds = matchBots.map((q) => q.botId);

    // Create match
    const matchId = await ctx.db.insert("matches", {
      status: "starting",
      bots: botIds,
      startedAt: Date.now(),
      tick: 0,
      spectators: 0,
    });

    // Initialize game state
    const center = ARENA_SIZE / 2;
    const radius = ARENA_SIZE / 2 - 20;

    const botsState = botIds.map((botId, index) => {
      const angle = (index / botIds.length) * Math.PI * 2;
      const spawnRadius = radius * 0.8;
      return {
        botId,
        x: center + Math.cos(angle) * spawnRadius,
        y: center + Math.sin(angle) * spawnRadius,
        health: BOT_MAX_HEALTH,
        angle: angle + Math.PI, // Face center
        alive: true,
        kills: 0,
      };
    });

    await ctx.db.insert("matchState", {
      matchId,
      tick: 0,
      zone: {
        x: center,
        y: center,
        radius,
        targetRadius: radius,
      },
      botsState,
      bullets: [],
    });

    // Update queue entries
    for (const entry of matchBots) {
      await ctx.db.patch(entry._id, { status: "matched" });
    }

    // Update match status to active
    await ctx.db.patch(matchId, { status: "active" });

    return matchId;
  },
});

// Main game tick - runs the simulation
export const gameTick = internalMutation({
  args: { matchId: v.id("matches") },
  handler: async (ctx, { matchId }) => {
    const match = await ctx.db.get(matchId);
    if (!match || match.status !== "active") return null;

    const state = await ctx.db
      .query("matchState")
      .withIndex("by_match", (q) => q.eq("matchId", matchId))
      .first();

    if (!state) return null;

    const newTick = state.tick + 1;
    let { zone, botsState, bullets } = state;

    // Update zone
    if (newTick % (ZONE_SHRINK_INTERVAL / TICK_RATE) === 0) {
      zone = {
        ...zone,
        targetRadius: Math.max(50, zone.targetRadius - ZONE_SHRINK_AMOUNT),
      };
    }

    // Smooth zone shrink
    if (zone.radius > zone.targetRadius) {
      zone = { ...zone, radius: zone.radius - 1 };
    }

    // Apply zone damage
    botsState = botsState.map((bot) => {
      if (!bot.alive) return bot;

      const dist = Math.hypot(bot.x - zone.x, bot.y - zone.y);
      if (dist > zone.radius) {
        const newHealth = bot.health - (ZONE_DAMAGE_PER_SECOND * TICK_RATE) / 1000;
        return {
          ...bot,
          health: newHealth,
          alive: newHealth > 0,
        };
      }
      return bot;
    });

    // Update bullets
    const newBullets: typeof bullets = [];
    for (const bullet of bullets) {
      const newX = bullet.x + bullet.vx;
      const newY = bullet.y + bullet.vy;

      // Out of bounds
      if (newX < 0 || newX > ARENA_SIZE || newY < 0 || newY > ARENA_SIZE) {
        continue;
      }

      // Check hits
      let hit = false;
      botsState = botsState.map((bot) => {
        if (!bot.alive || bot.botId === bullet.ownerId) return bot;

        const dist = Math.hypot(bot.x - newX, bot.y - newY);
        if (dist < BOT_SIZE) {
          hit = true;
          const newHealth = bot.health - BULLET_DAMAGE;
          if (newHealth <= 0) {
            // Credit kill
            botsState = botsState.map((b) =>
              b.botId === bullet.ownerId ? { ...b, kills: b.kills + 1 } : b
            );
          }
          return {
            ...bot,
            health: newHealth,
            alive: newHealth > 0,
          };
        }
        return bot;
      });

      if (!hit) {
        newBullets.push({ ...bullet, x: newX, y: newY });
      }
    }

    // Simple AI for bots without commands (moves toward center, shoots nearest)
    botsState = botsState.map((bot) => {
      if (!bot.alive) return bot;

      // Move toward center if outside safe zone
      const distToCenter = Math.hypot(bot.x - zone.x, bot.y - zone.y);
      let newX = bot.x;
      let newY = bot.y;
      let newAngle = bot.angle;

      if (distToCenter > zone.radius * 0.6) {
        const angleToCenter = Math.atan2(zone.y - bot.y, zone.x - bot.x);
        newX = bot.x + Math.cos(angleToCenter) * BOT_SPEED;
        newY = bot.y + Math.sin(angleToCenter) * BOT_SPEED;
        newAngle = angleToCenter;
      } else {
        // Random wander
        newAngle = bot.angle + (Math.random() - 0.5) * 0.3;
        newX = bot.x + Math.cos(newAngle) * BOT_SPEED * 0.5;
        newY = bot.y + Math.sin(newAngle) * BOT_SPEED * 0.5;
      }

      // Keep in bounds
      newX = Math.max(BOT_SIZE, Math.min(ARENA_SIZE - BOT_SIZE, newX));
      newY = Math.max(BOT_SIZE, Math.min(ARENA_SIZE - BOT_SIZE, newY));

      return { ...bot, x: newX, y: newY, angle: newAngle };
    });

    // Random shooting
    for (const bot of botsState) {
      if (!bot.alive) continue;
      if (Math.random() < 0.05) {
        // Find nearest enemy
        const enemies = botsState.filter((b) => b.alive && b.botId !== bot.botId);
        if (enemies.length > 0) {
          const nearest = enemies.reduce((a, b) => {
            const distA = Math.hypot(a.x - bot.x, a.y - bot.y);
            const distB = Math.hypot(b.x - bot.x, b.y - bot.y);
            return distA < distB ? a : b;
          });

          const angle = Math.atan2(nearest.y - bot.y, nearest.x - bot.x);
          newBullets.push({
            id: `bullet_${newTick}_${bot.botId}`,
            ownerId: bot.botId,
            x: bot.x,
            y: bot.y,
            vx: Math.cos(angle) * BULLET_SPEED,
            vy: Math.sin(angle) * BULLET_SPEED,
          });
        }
      }
    }

    // Check win condition
    const aliveBots = botsState.filter((b) => b.alive);
    let matchStatus = "active";
    let winner: Id<"bots"> | undefined;

    if (aliveBots.length <= 1) {
      matchStatus = "finished";
      winner = aliveBots[0]?.botId;

      // Update bot stats
      for (const bot of botsState) {
        const botDoc = await ctx.db.get(bot.botId);
        if (!botDoc) continue;

        const isWinner = bot.botId === winner;
        await ctx.db.patch(bot.botId, {
          matches: botDoc.matches + 1,
          wins: botDoc.wins + (isWinner ? 1 : 0),
          losses: botDoc.losses + (isWinner ? 0 : 1),
          kills: botDoc.kills + bot.kills,
          deaths: botDoc.deaths + (bot.alive ? 0 : 1),
          elo: botDoc.elo + (isWinner ? 25 : -10),
          lastActive: Date.now(),
        });

        // Remove from queue
        const queueEntry = await ctx.db
          .query("queue")
          .withIndex("by_bot", (q) => q.eq("botId", bot.botId))
          .first();
        if (queueEntry) {
          await ctx.db.delete(queueEntry._id);
        }
      }
    }

    // Update state
    await ctx.db.patch(state._id, {
      tick: newTick,
      zone,
      botsState,
      bullets: newBullets,
    });

    // Update match
    await ctx.db.patch(matchId, {
      tick: newTick,
      status: matchStatus,
      ...(winner && { winner, endedAt: Date.now() }),
    });

    return { tick: newTick, status: matchStatus, aliveBots: aliveBots.length };
  },
});

// Get active match IDs
export const getActiveMatchIds = internalQuery({
  args: {},
  handler: async (ctx) => {
    const matches = await ctx.db
      .query("matches")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();
    return matches.map((m) => m._id);
  },
});
