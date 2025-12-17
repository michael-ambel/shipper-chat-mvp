import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')?.trim()

    if (!query || query.length < 2) {
      return NextResponse.json({ results: [] })
    }

    // Find all sessions where current user is a participant
    const userSessions = await prisma.chatSession.findMany({
      where: {
        OR: [
          { user1Id: currentUser.userId },
          { user2Id: currentUser.userId },
        ],
      },
      select: { id: true },
    })

    const sessionIds = userSessions.map((s) => s.id)

    if (sessionIds.length === 0) {
      return NextResponse.json({ results: [] })
    }

    // Search messages in user's sessions
    const messages = await prisma.message.findMany({
      where: {
        sessionId: { in: sessionIds },
        isDeleted: false,
        content: {
          contains: query,
          mode: 'insensitive',
        },
      },
      select: {
        id: true,
        content: true,
        createdAt: true,
        senderId: true,
        sessionId: true,
        sender: {
          select: {
            id: true,
            name: true,
            avatar: true,
            isAI: true,
          },
        },
        session: {
          select: {
            id: true,
            user1Id: true,
            user2Id: true,
            user1: {
              select: { id: true, name: true, avatar: true, isAI: true },
            },
            user2: {
              select: { id: true, name: true, avatar: true, isAI: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    })

    // Format results with chat partner info
    const results = messages.map((msg) => {
      // Determine chat partner (the other user in the session)
      const chatPartner =
        msg.session.user1Id === currentUser.userId
          ? msg.session.user2
          : msg.session.user1

      return {
        id: msg.id,
        content: msg.content,
        createdAt: msg.createdAt,
        senderId: msg.senderId,
        senderName: msg.sender.name,
        sessionId: msg.sessionId,
        chatPartner: chatPartner
          ? {
              id: chatPartner.id,
              name: chatPartner.name,
              avatar: chatPartner.avatar,
              isAI: chatPartner.isAI,
            }
          : null,
      }
    })

    return NextResponse.json({ results })
  } catch (error) {
    console.error('Search error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

