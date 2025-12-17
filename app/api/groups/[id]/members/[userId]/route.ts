import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'

// DELETE - Remove member from group
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { id, userId } = await params

    // Check if current user is admin
    const currentParticipant = await prisma.sessionParticipant.findFirst({
      where: {
        sessionId: id,
        userId: currentUser.userId,
        isActive: true,
      },
    })

    if (!currentParticipant) {
      return NextResponse.json({ error: 'Not a member' }, { status: 403 })
    }

    // Only admin can remove others
    if (userId !== currentUser.userId && currentParticipant.role !== 'admin') {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    // Check if target is the creator/only admin
    const targetParticipant = await prisma.sessionParticipant.findFirst({
      where: {
        sessionId: id,
        userId,
        isActive: true,
      },
    })

    if (!targetParticipant) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    }

    // Check if target is creator
    const group = await prisma.chatSession.findUnique({
      where: { id },
      select: { createdById: true },
    })

    if (group?.createdById === userId && userId !== currentUser.userId) {
      return NextResponse.json({ error: 'Cannot remove group creator' }, { status: 400 })
    }

    // Soft delete - mark as inactive
    await prisma.sessionParticipant.update({
      where: { id: targetParticipant.id },
      data: {
        isActive: false,
        leftAt: new Date(),
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Remove member error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH - Update member role
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { id, userId } = await params
    const { role } = await request.json()

    if (!role || !['admin', 'member'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    // Check if current user is admin
    const currentParticipant = await prisma.sessionParticipant.findFirst({
      where: {
        sessionId: id,
        userId: currentUser.userId,
        isActive: true,
        role: 'admin',
      },
    })

    if (!currentParticipant) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    // Update target's role
    const updated = await prisma.sessionParticipant.updateMany({
      where: {
        sessionId: id,
        userId,
        isActive: true,
      },
      data: { role },
    })

    if (updated.count === 0) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, role })
  } catch (error) {
    console.error('Update role error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

