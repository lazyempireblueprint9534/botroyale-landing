import { NextRequest, NextResponse } from 'next/server'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

// GET - Get match state
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = req.headers.get('authorization')
    const matchId = (await params).id as Id<'gridMatches'>

    // If no auth, return spectator view
    if (!authHeader?.startsWith('Bearer ')) {
      const result = await convex.query(api.gridRoyale.spectateMatch, { matchId })
      return NextResponse.json(result)
    }

    const token = authHeader.slice(7)
    const result = await convex.query(api.gridRoyale.getMatchState, { token, matchId })

    return NextResponse.json(result)
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to get match' },
      { status: 500 }
    )
  }
}
