import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'

// GET - Get group details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { id } = await params

    const group = await prisma.chatSession.findFirst({
      where: {
        id,
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

    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 })
    }

    // Get current user's role
    const currentParticipant = group.participants.find(
      (p) => p.userId === currentUser.userId
    )

    return NextResponse.json({
      group: {
        id: group.id,
        name: group.name,
        avatar: group.avatar,
        description: group.description,
        createdBy: group.createdBy,
        createdAt: group.createdAt,
        members: group.participants.map((p) => ({
          ...p.user,
          role: p.role,
          joinedAt: p.joinedAt,
        })),
        memberCount: group.participants.length,
        currentUserRole: currentParticipant?.role || 'member',
      },
    })
  } catch (error) {
    console.error('Get group error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH - Update group info
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { id } = await params
    const { name, description, avatar } = await request.json()

    // Check if user is admin
    const participant = await prisma.sessionParticipant.findFirst({
      where: {
        sessionId: id,
        userId: currentUser.userId,
        isActive: true,
        role: 'admin',
      },
    })

    if (!participant) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    const updatedGroup = await prisma.chatSession.update({
      where: { id },
      data: {
        ...(name && { name: name.trim() }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(avatar !== undefined && { avatar }),
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
      },
    })

    return NextResponse.json({ group: updatedGroup })
  } catch (error) {
    console.error('Update group error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Delete group (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { id } = await params

    // Check if user is creator or admin
    const participant = await prisma.sessionParticipant.findFirst({
      where: {
        sessionId: id,
        userId: currentUser.userId,
        isActive: true,
        role: 'admin',
      },
      include: {
        session: {
          select: { isGroup: true, createdById: true },
        },
      },
    })

    if (!participant || !participant.session.isGroup) {
      return NextResponse.json({ error: 'Not authorized to delete this group' }, { status: 403 })
    }

    // Delete in correct order to avoid FK constraints
    await prisma.$transaction(async (tx) => {
      // Delete reactions on messages in this session
      await tx.reaction.deleteMany({
        where: {
          message: { sessionId: id },
        },
      })

      // Delete messages
      await tx.message.deleteMany({
        where: { sessionId: id },
      })

      // Delete participants
      await tx.sessionParticipant.deleteMany({
        where: { sessionId: id },
      })

      // Delete the session
      await tx.chatSession.delete({
        where: { id },
      })
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete group error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

