import { NextRequest, NextResponse } from 'next/server'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '@/convex/_generated/api'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

// GET - List active matches
export async function GET(req: NextRequest) {
  try {
    const result = await convex.query(api.gridRoyale.getActiveMatches, {})

    return NextResponse.json({ matches: result })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to get matches' },
      { status: 500 }
    )
  }
}
