import { NextResponse } from 'next/server'
import { getOnlineUsers } from '@/lib/socket'

export async function GET() {
  try {
    const onlineUsers = getOnlineUsers()
    return NextResponse.json({ onlineUsers })
  } catch (error) {
    console.error('Socket status error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

