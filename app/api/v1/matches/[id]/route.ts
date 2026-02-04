import { NextRequest, NextResponse } from 'next/server'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = req.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing authorization' }, { status: 401 })
    }
    const token = authHeader.slice(7)
    const matchId = (await params).id as Id<'rpsMatches'>

    const match = await convex.query(api.rps.getMatch, { token, matchId })

    return NextResponse.json(match)
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to get match' },
      { status: 500 }
    )
  }
}
