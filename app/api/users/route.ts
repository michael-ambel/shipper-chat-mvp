import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET() {
  try {
    const currentUser = await getCurrentUser()

    if (!currentUser) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const users = await prisma.user.findMany({
      where: {
        id: { not: currentUser.userId },
      },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        lastSeen: true,
        isAI: true,
      },
      orderBy: [
        { isAI: 'desc' }, // AI assistant first
        { name: 'asc' },
      ],
    })

    const usersWithUnread = await Promise.all(
      users.map(async (user) => {
        // Find 1-1 session between current user and this user
        const session = await prisma.chatSession.findFirst({
          where: {
            isGroup: false,
            OR: [
              {
                user1Id: currentUser.userId,
                user2Id: user.id,
              },
              {
                user1Id: user.id,
                user2Id: currentUser.userId,
              },
            ],
          },
          select: { id: true },
        })

        if (!session) {
          return { ...user, unreadCount: 0, lastMessage: null, lastMessageTime: null, lastMessageSenderId: null, lastMessageIsRead: false, lastMessageDeliveredAt: null }
        }

        const unreadCount = await prisma.message.count({
          where: {
            sessionId: session.id,
            senderId: user.id,
            isRead: false,
          },
        })

        // Get the latest message
        const latestMessage = await prisma.message.findFirst({
          where: {
            sessionId: session.id,
          },
          orderBy: {
            createdAt: 'desc',
          },
          select: {
            content: true,
            createdAt: true,
            senderId: true,
            isRead: true,
            deliveredAt: true,
          },
        })

        return { 
          ...user, 
          unreadCount,
          lastMessage: latestMessage?.content || null,
          lastMessageTime: latestMessage?.createdAt || null,
          lastMessageSenderId: latestMessage?.senderId || null,
          lastMessageIsRead: latestMessage?.isRead || false,
          lastMessageDeliveredAt: latestMessage?.deliveredAt || null,
        }
      })
    )

    return NextResponse.json({ users: usersWithUnread })
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

