import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  return NextResponse.json({ message: 'Test route working', timestamp: Date.now() })
}

export async function POST(req: NextRequest) {
  return NextResponse.json({ message: 'POST working', timestamp: Date.now() })
}

