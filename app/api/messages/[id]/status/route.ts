import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'

interface Params {
  params: Promise<{
    id: string
  }>
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const currentUser = await getCurrentUser()

    if (!currentUser) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const { id: messageId } = await params

    if (!messageId) {
      return NextResponse.json(
        { error: 'Message ID is required' },
        { status: 400 }
      )
    }

    const message = await prisma.message.findUnique({
      where: { id: messageId },
      select: {
        id: true,
        senderId: true,
        sessionId: true,
      },
    })

    if (!message) {
      return NextResponse.json(
        { error: 'Message not found' },
        { status: 404 }
      )
    }

    // Only non-senders should mark a message as read
    if (message.senderId === currentUser.userId) {
      return NextResponse.json(
        { error: 'Cannot mark your own message as read' },
        { status: 400 }
      )
    }

    const updated = await prisma.message.update({
      where: { id: messageId },
      data: {
        isRead: true,
        readAt: new Date(),
      },
      select: {
        id: true,
        isRead: true,
        readAt: true,
      },
    })

    return NextResponse.json({ message: updated })
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}


