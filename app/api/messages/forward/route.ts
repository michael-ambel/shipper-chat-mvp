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

    const { messageId, targetUserIds } = await request.json()

    if (!messageId || !targetUserIds || !Array.isArray(targetUserIds) || targetUserIds.length === 0) {
      return NextResponse.json(
        { error: 'Message ID and target user IDs are required' },
        { status: 400 }
      )
    }

    const originalMessage = await prisma.message.findUnique({
      where: { id: messageId },
      select: {
        id: true,
        content: true,
        senderId: true,
        isDeleted: true,
        sender: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    if (!originalMessage) {
      return NextResponse.json(
        { error: 'Message not found' },
        { status: 404 }
      )
    }

    if (originalMessage.isDeleted) {
      return NextResponse.json(
        { error: 'Cannot forward a deleted message' },
        { status: 400 }
      )
    }

    const forwardedMessages = []

    for (const targetUserId of targetUserIds) {
      const [minId, maxId] = [currentUser.userId, targetUserId].sort()
      
      let session = await prisma.chatSession.findFirst({
        where: {
          OR: [
            { user1Id: minId, user2Id: maxId },
            { user1Id: maxId, user2Id: minId },
          ],
        },
      })

      if (!session) {
        session = await prisma.chatSession.create({
          data: {
            user1Id: minId,
            user2Id: maxId,
          },
        })
      }

      const forwardedMessage = await prisma.message.create({
        data: {
          sessionId: session.id,
          senderId: currentUser.userId,
          content: originalMessage.content,
          type: 'text',
          isForwarded: true,
          forwardedFromId: originalMessage.id,
          originalSenderId: originalMessage.senderId,
        },
        select: {
          id: true,
          content: true,
          senderId: true,
          createdAt: true,
          deliveredAt: true,
          isRead: true,
          readAt: true,
          type: true,
          isForwarded: true,
          forwardedFromId: true,
          originalSenderId: true,
          sessionId: true,
          sender: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
            },
          },
        },
      })

      await prisma.chatSession.update({
        where: { id: session.id },
        data: { updatedAt: new Date() },
      })

      forwardedMessages.push({
        ...forwardedMessage,
        targetUserId,
        originalSenderName: originalMessage.sender.name,
      })
    }

    return NextResponse.json({ messages: forwardedMessages }, { status: 201 })
  } catch (error) {
    console.error('Forward message error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

