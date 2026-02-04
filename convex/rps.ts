import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Get match state for a player
export const getMatch = query({
  args: { 
    token: v.string(),
    matchId: v.id("rpsMatches"),
  },
  handler: async (ctx, args) => {
    const bot = await ctx.db
      .query("bots")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!bot) throw new Error("Bot not found");

    const match = await ctx.db.get(args.matchId);
    if (!match) throw new Error("Match not found");

    const isPlayer1 = match.player1Id === bot._id;
    const isPlayer2 = match.player2Id === bot._id;
    
    if (!isPlayer1 && !isPlayer2) {
      throw new Error("You are not in this match");
    }

    // Get opponent info
    const opponentId = isPlayer1 ? match.player2Id : match.player1Id;
    const opponent = await ctx.db.get(opponentId);

    // Build history (hide opponent's current round move if not revealed)
    const history = match.rounds.map((round: any) => ({
      round: round.round,
      your_move: isPlayer1 ? round.player1Move : round.player2Move,
      opponent_move: isPlayer1 ? round.player2Move : round.player1Move,
      winner: round.winner === "player1" 
        ? (isPlayer1 ? "you" : "opponent")
        : round.winner === "player2"
        ? (isPlayer2 ? "you" : "opponent")
        : "tie",
    }));

    const yourScore = isPlayer1 ? match.player1Score : match.player2Score;
    const opponentScore = isPlayer1 ? match.player2Score : match.player1Score;

    // Check if awaiting move
    const currentRoundMoves = match.currentRoundMoves || {};
    const yourMoveSubmitted = isPlayer1 
      ? !!currentRoundMoves.player1 
      : !!currentRoundMoves.player2;

    return {
      match_id: match._id,
      status: match.status,
      current_round: match.currentRound,
      your_score: yourScore,
      opponent_score: opponentScore,
      opponent: {
        name: opponent?.name || "Unknown",
        elo: opponent?.elo || 1000,
      },
      history,
      awaiting_move: match.status === "active" && !yourMoveSubmitted,
      your_move_submitted: yourMoveSubmitted,
      winner: match.winner 
        ? (match.winner === bot._id ? "you" : "opponent")
        : null,
    };
  },
});

// Submit a move
export const submitMove = mutation({
  args: {
    token: v.string(),
    matchId: v.id("rpsMatches"),
    move: v.string(),
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

    const isPlayer1 = match.player1Id === bot._id;
    const isPlayer2 = match.player2Id === bot._id;
    
    if (!isPlayer1 && !isPlayer2) {
      throw new Error("You are not in this match");
    }

    // Initialize current round moves if needed
    const currentRoundMoves = match.currentRoundMoves || {};
    
    // Check if already submitted
    if (isPlayer1 && currentRoundMoves.player1) {
      throw new Error("You already submitted a move this round");
    }
    if (isPlayer2 && currentRoundMoves.player2) {
      throw new Error("You already submitted a move this round");
    }

    // Record the move
    if (isPlayer1) {
      currentRoundMoves.player1 = args.move;
      currentRoundMoves.player1Reasoning = args.reasoning;
    } else {
      currentRoundMoves.player2 = args.move;
      currentRoundMoves.player2Reasoning = args.reasoning;
    }

    // Check if both players have moved
    if (currentRoundMoves.player1 && currentRoundMoves.player2) {
      // Resolve the round
      const p1Move = currentRoundMoves.player1;
      const p2Move = currentRoundMoves.player2;
      
      let winner: "player1" | "player2" | "tie" = "tie";
      if (p1Move !== p2Move) {
        if (
          (p1Move === "rock" && p2Move === "scissors") ||
          (p1Move === "scissors" && p2Move === "paper") ||
          (p1Move === "paper" && p2Move === "rock")
        ) {
          winner = "player1";
        } else {
          winner = "player2";
        }
      }

      // Update scores
      let player1Score = match.player1Score;
      let player2Score = match.player2Score;
      if (winner === "player1") player1Score++;
      if (winner === "player2") player2Score++;

      // Add to rounds history
      const rounds = [
        ...match.rounds,
        {
          round: match.currentRound,
          player1Move: p1Move,
          player2Move: p2Move,
          winner,
        },
      ];

      // Check if match is over
      let status = match.status;
      let matchWinner: typeof match.player1Id | undefined = undefined;

      if (player1Score >= 50) {
        status = "completed";
        matchWinner = match.player1Id;
      } else if (player2Score >= 50) {
        status = "completed";
        matchWinner = match.player2Id;
      } else if (match.currentRound >= 99) {
        status = "completed";
        matchWinner = player1Score > player2Score 
          ? match.player1Id 
          : player2Score > player1Score 
          ? match.player2Id 
          : undefined; // Tie at 99, sudden death would go here
      }

      // Update match
      await ctx.db.patch(args.matchId, {
        currentRound: match.currentRound + 1,
        player1Score,
        player2Score,
        rounds,
        currentRoundMoves: {},
        status,
        ...(matchWinner ? { winner: matchWinner } : {}),
        ...(status === "completed" ? { completedAt: Date.now() } : {}),
      });

      const yourScore = isPlayer1 ? player1Score : player2Score;
      const opponentScore = isPlayer1 ? player2Score : player1Score;
      const yourMove = isPlayer1 ? p1Move : p2Move;
      const opponentMove = isPlayer1 ? p2Move : p1Move;
      const roundWinner = winner === "tie" 
        ? "tie" 
        : winner === (isPlayer1 ? "player1" : "player2") 
        ? "you" 
        : "opponent";

      if (status === "completed") {
        return {
          message: "Match complete!",
          round: match.currentRound,
          your_move: yourMove,
          opponent_move: opponentMove,
          round_winner: roundWinner,
          final_score: { you: yourScore, opponent: opponentScore },
          match_winner: matchWinner === bot._id ? "you" : "opponent",
          match_complete: true,
        };
      }

      return {
        message: "Round complete",
        round: match.currentRound,
        your_move: yourMove,
        opponent_move: opponentMove,
        round_winner: roundWinner,
        score: { you: yourScore, opponent: opponentScore },
        next_round: match.currentRound + 1,
        match_complete: false,
      };
    }

    // Still waiting for opponent
    await ctx.db.patch(args.matchId, { currentRoundMoves });

    return {
      message: "Move submitted. Waiting for opponent.",
      round: match.currentRound,
      move_submitted: true,
      awaiting_opponent: true,
    };
  },
});

// Create a match between two bots (called by matchmaking)
export const createMatch = mutation({
  args: {
    player1Id: v.id("bots"),
    player2Id: v.id("bots"),
  },
  handler: async (ctx, args) => {
    const matchId = await ctx.db.insert("rpsMatches", {
      player1Id: args.player1Id,
      player2Id: args.player2Id,
      status: "active",
      currentRound: 1,
      player1Score: 0,
      player2Score: 0,
      rounds: [],
      currentRoundMoves: {},
      createdAt: Date.now(),
    });

    return matchId;
  },
});
