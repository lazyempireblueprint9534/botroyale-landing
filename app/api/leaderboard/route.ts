import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../convex/_generated/api";
import { NextRequest, NextResponse } from "next/server";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get("limit");
    const limit = limitParam ? parseInt(limitParam, 10) : 100;

    const leaderboard = await convex.query(api.bots.leaderboard, { limit });

    return NextResponse.json(leaderboard);
  } catch (error) {
    console.error("Leaderboard error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
