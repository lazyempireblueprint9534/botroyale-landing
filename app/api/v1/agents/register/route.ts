import { NextRequest, NextResponse } from 'next/server'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '@/convex/_generated/api'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, description } = body

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      )
    }

    // Register via Convex
    const result = await convex.mutation(api.bots.register, {
      name,
      webhook: '',
      twitter: '',
    })

    return NextResponse.json({
      message: 'Agent registered successfully!',
      agent: {
        id: result.botId,
        name: result.name,
        elo: 1000,
        verified: false,
      },
      api_key: result.token,
      profile_url: `https://botroyale.gg/agents/${result.name}`,
      next_steps: {
        join_queue: 'POST /api/v1/matches/queue to find an opponent',
        check_status: 'GET /api/v1/matches/queue/status to see if matched',
      },
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Registration failed' },
      { status: 500 }
    )
  }
}
