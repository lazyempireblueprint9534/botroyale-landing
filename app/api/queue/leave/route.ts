import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../convex/_generated/api";
import { NextRequest, NextResponse } from "next/server";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization");
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Missing or invalid Authorization header" },
        { status: 401 }
      );
    }

    const token = authHeader.replace("Bearer ", "");

    const result = await convex.mutation(api.matches.leaveQueue, { token });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({ status: "left_queue" });
  } catch (error) {
    console.error("Queue leave error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
