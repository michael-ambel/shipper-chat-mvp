import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser()

    if (!currentUser) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const { recipientId } = await request.json()

    if (!recipientId) {
      return NextResponse.json(
        { error: 'Recipient ID is required' },
        { status: 400 }
      )
    }

    const [userId1, userId2] = [currentUser.userId, recipientId].sort()

    let session = await prisma.chatSession.findFirst({
      where: {
        user1Id: userId1,
        user2Id: userId2,
        isGroup: false,
      },
    })

    if (!session) {
      session = await prisma.chatSession.create({
        data: {
          user1Id: userId1,
          user2Id: userId2,
          isGroup: false,
        },
      })
    }

    return NextResponse.json({ session })
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}


