import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

const GRID_SIZE = 15;
const MAX_TICKS = 100;
const STARTING_HP = 3;
const BULLET_RANGE = 5;
const ZONE_SHRINK_INTERVAL = 10;
const ACTION_TIMEOUT_MS = 3000;
const MAX_TIMEOUTS = 5;
const MIN_PLAYERS = 2;
const MAX_PLAYERS = 8;

// Spawn positions for up to 8 players (corners and mid-edges)
const SPAWN_POSITIONS = [
  { x: 1, y: 1 },      // bottom-left
  { x: 13, y: 13 },    // top-right
  { x: 1, y: 13 },     // top-left
  { x: 13, y: 1 },     // bottom-right
  { x: 7, y: 1 },      // bottom-mid
  { x: 7, y: 13 },     // top-mid
  { x: 1, y: 7 },      // left-mid
  { x: 13, y: 7 },     // right-mid
];

// Direction vectors
const DIRECTIONS: Record<string, { dx: number; dy: number }> = {
  north: { dx: 0, dy: 1 },
  south: { dx: 0, dy: -1 },
  east: { dx: 1, dy: 0 },
  west: { dx: -1, dy: 0 },
  stay: { dx: 0, dy: 0 },
};

// ============ QUEUE FUNCTIONS ============

// Join the grid royale queue
export const joinQueue = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const bot = await ctx.db
      .query("bots")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!bot) throw new Error("Bot not found");

    // Check if already in queue
    const existing = await ctx.db
      .query("gridQueue")
      .withIndex("by_bot", (q) => q.eq("botId", bot._id))
      .first();

    if (existing) throw new Error("Already in queue");

    // Check if in active match
    const activeMatches = await ctx.db
      .query("gridMatches")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();

    for (const match of activeMatches) {
      if (match.players.some((p) => p === bot._id)) {
        return { alreadyInMatch: true, matchId: match._id };
      }
    }

    // Add to queue
    await ctx.db.insert("gridQueue", {
      botId: bot._id,
      joinedAt: Date.now(),
    });

    await ctx.db.patch(bot._id, { lastActive: Date.now() });

    // Check if we have enough players to start
    const queuedBots = await ctx.db.query("gridQueue").collect();

    if (queuedBots.length >= MIN_PLAYERS) {
      // Start a match with available players (up to MAX_PLAYERS)
      const playersToMatch = queuedBots.slice(0, MAX_PLAYERS);
      const playerIds = playersToMatch.map((q) => q.botId);

      // Remove from queue
      for (const queueEntry of playersToMatch) {
        await ctx.db.delete(queueEntry._id);
      }

      // Create match
      const matchId = await createMatchInternal(ctx, playerIds);

      return { matched: true, matchId };
    }

    return { queued: true, position: queuedBots.length };
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

    const entry = await ctx.db
      .query("gridQueue")
      .withIndex("by_bot", (q) => q.eq("botId", bot._id))
      .first();

    if (entry) {
      await ctx.db.delete(entry._id);
    }

    return { success: true };
  },
});

// Check queue status
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
      .query("gridQueue")
      .withIndex("by_bot", (q) => q.eq("botId", bot._id))
      .first();

    // Check if in active match
    const activeMatches = await ctx.db
      .query("gridMatches")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();

    for (const match of activeMatches) {
      if (match.players.some((p) => p === bot._id)) {
        return { in_queue: false, matched: true, matchId: match._id };
      }
    }

    // Also check waiting matches
    const waitingMatches = await ctx.db
      .query("gridMatches")
      .withIndex("by_status", (q) => q.eq("status", "waiting"))
      .collect();

    for (const match of waitingMatches) {
      if (match.players.some((p) => p === bot._id)) {
        return { in_queue: false, matched: true, matchId: match._id };
      }
    }

    if (queueEntry) {
      const allQueued = await ctx.db.query("gridQueue").collect();
      return { in_queue: true, position: allQueued.length };
    }

    return { in_queue: false, matched: false };
  },
});

// ============ MATCH FUNCTIONS ============

// Internal: Create a new match
async function createMatchInternal(ctx: any, playerIds: any[]) {
  // Assign spawn positions
  const playerStates = playerIds.map((botId, index) => ({
    botId,
    x: SPAWN_POSITIONS[index].x,
    y: SPAWN_POSITIONS[index].y,
    hp: STARTING_HP,
    kills: 0,
    alive: true,
    placement: undefined,
    timeouts: 0,
  }));

  const matchId = await ctx.db.insert("gridMatches", {
    status: "active",
    players: playerIds,
    gridSize: GRID_SIZE,
    currentTick: 1,
    maxTicks: MAX_TICKS,
    zoneMin: 0,
    zoneMax: GRID_SIZE - 1,
    playerStates,
    pendingActions: {},
    lastTickEvents: [],
    createdAt: Date.now(),
    startedAt: Date.now(),
  });

  return matchId;
}

// Get match state (from bot's perspective)
export const getMatchState = query({
  args: { token: v.string(), matchId: v.id("gridMatches") },
  handler: async (ctx, args) => {
    const bot = await ctx.db
      .query("bots")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!bot) throw new Error("Bot not found");

    const match = await ctx.db.get(args.matchId);
    if (!match) throw new Error("Match not found");

    if (!match.players.includes(bot._id)) {
      throw new Error("You are not in this match");
    }

    const yourState = match.playerStates.find((p) => p.botId === bot._id);
    const otherBots = match.playerStates
      .filter((p) => p.botId !== bot._id && p.alive)
      .map((p) => ({
        id: p.botId,
        position: { x: p.x, y: p.y },
        hp: p.hp,
        kills: p.kills,
      }));

    // Get bot names for display
    const botNames: Record<string, string> = {};
    for (const playerId of match.players) {
      const playerBot = await ctx.db.get(playerId);
      if (playerBot) {
        botNames[playerId] = playerBot.name;
      }
    }

    const pendingActions = match.pendingActions || {};
    const yourActionSubmitted = !!pendingActions[bot._id];

    return {
      match_id: match._id,
      status: match.status,
      tick: match.currentTick,
      max_ticks: match.maxTicks,
      zone: {
        min_x: match.zoneMin,
        max_x: match.zoneMax,
        min_y: match.zoneMin,
        max_y: match.zoneMax,
      },
      you: {
        id: bot._id,
        name: bot.name,
        position: { x: yourState?.x ?? 0, y: yourState?.y ?? 0 },
        hp: yourState?.hp ?? 0,
        kills: yourState?.kills ?? 0,
        alive: yourState?.alive ?? false,
      },
      bots: otherBots.map((b) => ({
        ...b,
        name: botNames[b.id] || "Unknown",
      })),
      events_last_tick: match.lastTickEvents,
      alive_count: match.playerStates.filter((p) => p.alive).length,
      your_action_submitted: yourActionSubmitted,
      winner: match.winnerId ? {
        id: match.winnerId,
        name: botNames[match.winnerId] || "Unknown",
      } : null,
      placements: match.placements,
    };
  },
});

// Submit action for current tick
export const submitAction = mutation({
  args: {
    token: v.string(),
    matchId: v.id("gridMatches"),
    move: v.string(),
    shoot: v.union(v.string(), v.null()),
    reasoning: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const bot = await ctx.db
      .query("bots")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!bot) throw new Error("Bot not found");

    const match = await ctx.db.get(args.matchId);
    if (!match) throw new Error("Match not found");
    if (match.status !== "active") throw new Error("Match is not active");

    if (!match.players.includes(bot._id)) {
      throw new Error("You are not in this match");
    }

    const yourState = match.playerStates.find((p) => p.botId === bot._id);
    if (!yourState?.alive) {
      throw new Error("You are eliminated");
    }

    // Validate move
    if (!DIRECTIONS[args.move]) {
      throw new Error("Invalid move. Use: north, south, east, west, or stay");
    }

    // Validate shoot
    if (args.shoot && !["north", "south", "east", "west"].includes(args.shoot)) {
      throw new Error("Invalid shoot direction. Use: north, south, east, west, or null");
    }

    // Record action
    const pendingActions = match.pendingActions || {};
    if (pendingActions[bot._id]) {
      throw new Error("You already submitted an action this tick");
    }

    pendingActions[bot._id] = {
      move: args.move,
      shoot: args.shoot,
      reasoning: args.reasoning?.slice(0, 200),
    };

    await ctx.db.patch(args.matchId, { pendingActions });

    // Check if all alive players have submitted
    const alivePlayers = match.playerStates.filter((p) => p.alive);
    const allSubmitted = alivePlayers.every((p) => pendingActions[p.botId]);

    if (allSubmitted) {
      // Process the tick
      await processTick(ctx, args.matchId);
    }

    return {
      message: allSubmitted ? "Tick processed" : "Action submitted, waiting for others",
      tick: match.currentTick,
      awaiting_others: !allSubmitted,
    };
  },
});

// Process a tick (called when all players have submitted or on timeout)
async function processTick(ctx: any, matchId: any) {
  const match = await ctx.db.get(matchId);
  if (!match || match.status !== "active") return;

  const events: any[] = [];
  const pendingActions = match.pendingActions || {};
  let playerStates = [...match.playerStates];

  // 1. Process movements
  const intendedPositions: Map<string, { x: number; y: number }> = new Map();
  const originalPositions: Map<string, { x: number; y: number }> = new Map();

  for (const player of playerStates) {
    if (!player.alive) continue;

    originalPositions.set(player.botId, { x: player.x, y: player.y });
    const action = pendingActions[player.botId];

    if (!action) {
      // Timeout - random move
      player.timeouts++;
      events.push({ type: "timeout", botId: player.botId });
      const randomDir = ["north", "south", "east", "west", "stay"][Math.floor(Math.random() * 5)];
      const dir = DIRECTIONS[randomDir];
      const newX = Math.max(0, Math.min(GRID_SIZE - 1, player.x + dir.dx));
      const newY = Math.max(0, Math.min(GRID_SIZE - 1, player.y + dir.dy));
      intendedPositions.set(player.botId, { x: newX, y: newY });
    } else {
      const dir = DIRECTIONS[action.move] || DIRECTIONS.stay;
      const newX = Math.max(0, Math.min(GRID_SIZE - 1, player.x + dir.dx));
      const newY = Math.max(0, Math.min(GRID_SIZE - 1, player.y + dir.dy));
      intendedPositions.set(player.botId, { x: newX, y: newY });

      if (action.move !== "stay" && (newX !== player.x || newY !== player.y)) {
        events.push({
          type: "move",
          botId: player.botId,
          from: [player.x, player.y],
          to: [newX, newY],
        });
      }
    }
  }

  // Resolve collisions (two bots moving to same tile)
  const positionCounts: Map<string, string[]> = new Map();
  for (const [botId, pos] of intendedPositions) {
    const key = `${pos.x},${pos.y}`;
    if (!positionCounts.has(key)) {
      positionCounts.set(key, []);
    }
    positionCounts.get(key)!.push(botId);
  }

  for (const [, botIds] of positionCounts) {
    if (botIds.length > 1) {
      // Collision - all bounce back
      for (const botId of botIds) {
        const orig = originalPositions.get(botId)!;
        intendedPositions.set(botId, orig);
        events.push({ type: "collision", botId, bouncedTo: [orig.x, orig.y] });
      }
    }
  }

  // Apply movements
  for (const player of playerStates) {
    if (!player.alive) continue;
    const newPos = intendedPositions.get(player.botId);
    if (newPos) {
      player.x = newPos.x;
      player.y = newPos.y;
    }
  }

  // 2. Process shooting
  for (const player of playerStates) {
    if (!player.alive) continue;
    const action = pendingActions[player.botId];
    if (!action?.shoot) continue;

    const dir = DIRECTIONS[action.shoot];
    if (!dir || (dir.dx === 0 && dir.dy === 0)) continue;

    events.push({
      type: "shot",
      botId: player.botId,
      direction: action.shoot,
      from: [player.x, player.y],
    });

    // Trace bullet path
    for (let i = 1; i <= BULLET_RANGE; i++) {
      const bulletX = player.x + dir.dx * i;
      const bulletY = player.y + dir.dy * i;

      // Out of bounds
      if (bulletX < 0 || bulletX >= GRID_SIZE || bulletY < 0 || bulletY >= GRID_SIZE) {
        break;
      }

      // Check for hit
      const hitPlayer = playerStates.find(
        (p) => p.alive && p.botId !== player.botId && p.x === bulletX && p.y === bulletY
      );

      if (hitPlayer) {
        hitPlayer.hp--;
        events.push({
          type: "hit",
          botId: player.botId,
          targetId: hitPlayer.botId,
          damage: 1,
        });

        if (hitPlayer.hp <= 0) {
          hitPlayer.alive = false;
          hitPlayer.placement = playerStates.filter((p) => p.alive).length + 1;
          player.kills++;
          events.push({
            type: "kill",
            botId: player.botId,
            targetId: hitPlayer.botId,
          });
        }
        break; // Bullet stops on hit
      }
    }
  }

  // 3. Zone damage
  const zoneMin = match.zoneMin;
  const zoneMax = match.zoneMax;

  for (const player of playerStates) {
    if (!player.alive) continue;
    if (player.x < zoneMin || player.x > zoneMax || player.y < zoneMin || player.y > zoneMax) {
      player.hp--;
      events.push({
        type: "zone_damage",
        botId: player.botId,
        damage: 1,
      });

      if (player.hp <= 0) {
        player.alive = false;
        player.placement = playerStates.filter((p) => p.alive).length + 1;
        events.push({
          type: "kill",
          botId: "zone",
          targetId: player.botId,
        });
      }
    }
  }

  // 4. Check for timeout eliminations
  for (const player of playerStates) {
    if (!player.alive) continue;
    if (player.timeouts >= MAX_TIMEOUTS) {
      player.alive = false;
      player.hp = 0;
      player.placement = playerStates.filter((p) => p.alive).length + 1;
      events.push({
        type: "forfeit",
        botId: player.botId,
        reason: "Too many timeouts",
      });
    }
  }

  // 5. Calculate new zone
  const nextTick = match.currentTick + 1;
  let newZoneMin = match.zoneMin;
  let newZoneMax = match.zoneMax;

  if (nextTick % ZONE_SHRINK_INTERVAL === 0 && newZoneMin < Math.floor(GRID_SIZE / 2)) {
    newZoneMin++;
    newZoneMax--;
    events.push({
      type: "zone_shrink",
      newZone: { min: newZoneMin, max: newZoneMax },
    });
  }

  // 6. Check for match end
  const alivePlayers = playerStates.filter((p) => p.alive);
  let status = match.status;
  let winnerId = undefined;
  let placements = undefined;

  if (alivePlayers.length <= 1 || nextTick > MAX_TICKS) {
    status = "completed";

    if (alivePlayers.length === 1) {
      winnerId = alivePlayers[0].botId;
      alivePlayers[0].placement = 1;
    } else if (alivePlayers.length === 0) {
      // All died simultaneously - highest HP at death wins (or last to die)
      const sorted = [...playerStates].sort((a, b) => (a.placement || 999) - (b.placement || 999));
      winnerId = sorted[0]?.botId;
    } else {
      // Time ran out - highest HP wins
      const sorted = [...alivePlayers].sort((a, b) => b.hp - a.hp || b.kills - a.kills);
      winnerId = sorted[0].botId;
      sorted.forEach((p, i) => (p.placement = i + 1));
    }

    // Build final placements
    placements = playerStates
      .map((p) => ({
        botId: p.botId,
        placement: p.placement || 999,
        kills: p.kills,
        survivalTicks: p.alive ? nextTick : match.currentTick,
      }))
      .sort((a, b) => a.placement - b.placement);
  }

  // Update match
  await ctx.db.patch(matchId, {
    currentTick: nextTick,
    zoneMin: newZoneMin,
    zoneMax: newZoneMax,
    playerStates,
    pendingActions: {},
    lastTickEvents: events,
    status,
    ...(winnerId ? { winnerId } : {}),
    ...(placements ? { placements } : {}),
    ...(status === "completed" ? { completedAt: Date.now() } : {}),
  });

  // Update bot stats if match completed
  if (status === "completed" && placements) {
    for (const p of placements) {
      const bot = await ctx.db.get(p.botId);
      if (bot) {
        const isWin = p.placement === 1;
        await ctx.db.patch(p.botId, {
          wins: bot.wins + (isWin ? 1 : 0),
          losses: bot.losses + (isWin ? 0 : 1),
          kills: bot.kills + p.kills,
          matches: bot.matches + 1,
          lastActive: Date.now(),
        });
      }
    }
  }
}

// Force process tick (for timeout handling via cron or manual trigger)
export const forceProcessTick = mutation({
  args: { matchId: v.id("gridMatches") },
  handler: async (ctx, args) => {
    await processTick(ctx, args.matchId);
    return { success: true };
  },
});

// Get active matches (for spectating)
export const getActiveMatches = query({
  args: {},
  handler: async (ctx) => {
    const matches = await ctx.db
      .query("gridMatches")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();

    const result = [];
    for (const match of matches) {
      const playerNames = [];
      for (const playerId of match.players) {
        const bot = await ctx.db.get(playerId);
        playerNames.push(bot?.name || "Unknown");
      }

      result.push({
        matchId: match._id,
        tick: match.currentTick,
        players: playerNames,
        aliveCount: match.playerStates.filter((p) => p.alive).length,
      });
    }

    return result;
  },
});

// Get match for spectating (full state, no auth needed)
export const spectateMatch = query({
  args: { matchId: v.id("gridMatches") },
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    if (!match) throw new Error("Match not found");

    const botNames: Record<string, string> = {};
    for (const playerId of match.players) {
      const bot = await ctx.db.get(playerId);
      if (bot) {
        botNames[playerId] = bot.name;
      }
    }

    return {
      match_id: match._id,
      status: match.status,
      tick: match.currentTick,
      grid_size: match.gridSize,
      zone: {
        min: match.zoneMin,
        max: match.zoneMax,
      },
      players: match.playerStates.map((p) => ({
        id: p.botId,
        name: botNames[p.botId] || "Unknown",
        x: p.x,
        y: p.y,
        hp: p.hp,
        kills: p.kills,
        alive: p.alive,
        placement: p.placement,
      })),
      events: match.lastTickEvents,
      winner: match.winnerId ? botNames[match.winnerId] : null,
      placements: match.placements?.map((p) => ({
        ...p,
        name: botNames[p.botId] || "Unknown",
      })),
    };
  },
});
