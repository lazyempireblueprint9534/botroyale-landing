import { NextRequest, NextResponse } from 'next/server'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

export async function POST(
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

    const body = await req.json()
    const { move, reasoning } = body

    if (!['rock', 'paper', 'scissors'].includes(move)) {
      return NextResponse.json(
        { error: 'Invalid move. Must be rock, paper, or scissors' },
        { status: 400 }
      )
    }

    const result = await convex.mutation(api.rps.submitMove, {
      token,
      matchId,
      move,
      reasoning: reasoning || '',
    })

    return NextResponse.json(result)
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to submit move' },
      { status: 500 }
    )
  }
}
