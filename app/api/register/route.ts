import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../convex/_generated/api";
import { NextRequest, NextResponse } from "next/server";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, twitter, webhook } = body;

    if (!name || !twitter || !webhook) {
      return NextResponse.json(
        { error: "Missing required fields: name, twitter, webhook" },
        { status: 400 }
      );
    }

    // Validate name length
    if (name.length < 3 || name.length > 20) {
      return NextResponse.json(
        { error: "Bot name must be 3-20 characters" },
        { status: 400 }
      );
    }

    // Validate twitter handle
    if (!twitter.startsWith("@")) {
      return NextResponse.json(
        { error: "Twitter handle must start with @" },
        { status: 400 }
      );
    }

    // Validate webhook URL
    try {
      new URL(webhook);
    } catch {
      return NextResponse.json(
        { error: "Invalid webhook URL" },
        { status: 400 }
      );
    }

    const result = await convex.mutation(api.bots.register, {
      name,
      twitter,
      webhook,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      botId: result.botId,
      token: result.token,
      status: result.status,
      message: "Bot registered! Please verify by tweeting: \"I'm entering the @BotRoyaleGG arena! 🤖⚔️ #BotRoyale\"",
    });
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
