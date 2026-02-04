import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";

// Run game ticks for all active matches
// This is called by an external scheduler or can be triggered manually
export const runGameTicks = internalAction({
  args: {},
  handler: async (ctx) => {
    const matchIds = await ctx.runQuery(internal.gameEngine.getActiveMatchIds);

    const results = await Promise.all(
      matchIds.map(async (matchId) => {
        try {
          return await ctx.runMutation(internal.gameEngine.gameTick, { matchId });
        } catch (error) {
          console.error(`Error ticking match ${matchId}:`, error);
          return null;
        }
      })
    );

    return {
      matchesProcessed: matchIds.length,
      results: results.filter(Boolean),
    };
  },
});
