import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'

// POST - Add members to group
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { id } = await params
    const { memberIds } = await request.json()

    if (!memberIds || !Array.isArray(memberIds) || memberIds.length === 0) {
      return NextResponse.json({ error: 'Member IDs are required' }, { status: 400 })
    }

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

    // Add new members
    const addedMembers = []
    for (const userId of memberIds) {
      // Check if already a member
      const existing = await prisma.sessionParticipant.findUnique({
        where: {
          sessionId_userId: {
            sessionId: id,
            userId,
          },
        },
      })

      if (existing) {
        // Reactivate if previously left
        if (!existing.isActive) {
          await prisma.sessionParticipant.update({
            where: { id: existing.id },
            data: { isActive: true, leftAt: null },
          })
          addedMembers.push(userId)
        }
      } else {
        // Create new participant
        await prisma.sessionParticipant.create({
          data: {
            sessionId: id,
            userId,
            role: 'member',
            isActive: true,
          },
        })
        addedMembers.push(userId)
      }
    }

    // Update group timestamp
    await prisma.chatSession.update({
      where: { id },
      data: { updatedAt: new Date() },
    })

    // Get updated member list
    const members = await prisma.sessionParticipant.findMany({
      where: { sessionId: id, isActive: true },
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
    })

    return NextResponse.json({
      success: true,
      addedCount: addedMembers.length,
      members: members.map((m) => ({
        ...m.user,
        role: m.role,
        joinedAt: m.joinedAt,
      })),
    })
  } catch (error) {
    console.error('Add members error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET - List group members
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

    // Check if user is a member
    const isMember = await prisma.sessionParticipant.findFirst({
      where: {
        sessionId: id,
        userId: currentUser.userId,
        isActive: true,
      },
    })

    if (!isMember) {
      return NextResponse.json({ error: 'Not a member' }, { status: 403 })
    }

    const members = await prisma.sessionParticipant.findMany({
      where: { sessionId: id, isActive: true },
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
      orderBy: [{ role: 'asc' }, { joinedAt: 'asc' }],
    })

    return NextResponse.json({
      members: members.map((m) => ({
        ...m.user,
        role: m.role,
        joinedAt: m.joinedAt,
      })),
    })
  } catch (error) {
    console.error('List members error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

