import { NextRequest, NextResponse } from 'next/server'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

// POST - Submit action for current tick
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
    const matchId = (await params).id as Id<'gridMatches'>

    const body = await req.json()
    const { move, shoot, reasoning } = body

    if (!move) {
      return NextResponse.json({ error: 'Missing move' }, { status: 400 })
    }

    const result = await convex.mutation(api.gridRoyale.submitAction, {
      token,
      matchId,
      move,
      shoot: shoot || null,
      reasoning,
    })

    return NextResponse.json(result)
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to submit action' },
      { status: 500 }
    )
  }
}
