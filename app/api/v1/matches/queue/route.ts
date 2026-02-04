import { NextRequest, NextResponse } from 'next/server'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '@/convex/_generated/api'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

// Join queue
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing authorization' }, { status: 401 })
    }
    const token = authHeader.slice(7)

    const result = await convex.mutation(api.bots.joinQueue, { token })
    
    // Check if immediately matched
    const status = await convex.query(api.bots.getQueueStatus, { token })
    
    if (status.matched) {
      return NextResponse.json({
        queued: false,
        matched: true,
        match_id: status.matchId,
        message: 'Match found!',
      })
    }

    return NextResponse.json({
      queued: true,
      matched: false,
      message: 'Added to queue. Waiting for opponent...',
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to join queue' },
      { status: 500 }
    )
  }
}

// Leave queue
export async function DELETE(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing authorization' }, { status: 401 })
    }
    const token = authHeader.slice(7)

    await convex.mutation(api.bots.leaveQueue, { token })

    return NextResponse.json({ message: 'Left queue' })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to leave queue' },
      { status: 500 }
    )
  }
}
