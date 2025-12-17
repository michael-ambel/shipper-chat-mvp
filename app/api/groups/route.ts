import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'

// POST - Create a new group
export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { name, memberIds, description } = await request.json()

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Group name is required' }, { status: 400 })
    }

    if (!memberIds || !Array.isArray(memberIds) || memberIds.length === 0) {
      return NextResponse.json({ error: 'At least one member is required' }, { status: 400 })
    }

    // Create group session
    const group = await prisma.chatSession.create({
      data: {
        isGroup: true,
        name: name.trim(),
        description: description?.trim() || null,
        createdById: currentUser.userId,
        participants: {
          create: [
            // Creator as admin
            {
              userId: currentUser.userId,
              role: 'admin',
              isActive: true,
            },
            // Other members
            ...memberIds
              .filter((id: string) => id !== currentUser.userId)
              .map((userId: string) => ({
                userId,
                role: 'member',
                isActive: true,
              })),
          ],
        },
      },
      include: {
        participants: {
          where: { isActive: true },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                avatar: true,
                email: true,
              },
            },
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    return NextResponse.json({ group }, { status: 201 })
  } catch (error) {
    console.error('Create group error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET - List user's groups
export async function GET() {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const groups = await prisma.chatSession.findMany({
      where: {
        isGroup: true,
        participants: {
          some: {
            userId: currentUser.userId,
            isActive: true,
          },
        },
      },
      include: {
        participants: {
          where: { isActive: true },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                avatar: true,
              },
            },
          },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            content: true,
            createdAt: true,
            sender: {
              select: {
                name: true,
              },
            },
          },
        },
        _count: {
          select: {
            messages: {
              where: {
                isRead: false,
                senderId: { not: currentUser.userId },
              },
            },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    })

    const formattedGroups = groups.map((group) => ({
      id: group.id,
      name: group.name,
      avatar: group.avatar,
      description: group.description,
      isGroup: true,
      memberCount: group.participants.length,
      members: group.participants.map((p) => p.user),
      lastMessage: group.messages[0]
        ? `${group.messages[0].sender.name}: ${group.messages[0].content}`
        : null,
      lastMessageAt: group.messages[0]?.createdAt || group.createdAt,
      unreadCount: group._count.messages,
      updatedAt: group.updatedAt,
    }))

    return NextResponse.json({ groups: formattedGroups })
  } catch (error) {
    console.error('List groups error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

