import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'

// PATCH - Edit message
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
    const { content } = await request.json()

    if (!content?.trim()) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 })
    }

    // Verify message exists and belongs to current user
    const message = await prisma.message.findUnique({
      where: { id },
      select: { senderId: true, isDeleted: true },
    })

    if (!message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 })
    }

    if (message.senderId !== currentUser.userId) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    if (message.isDeleted) {
      return NextResponse.json({ error: 'Cannot edit deleted message' }, { status: 400 })
    }

    const updatedMessage = await prisma.message.update({
      where: { id },
      data: {
        content: content.trim(),
        isEdited: true,
        editedAt: new Date(),
      },
      select: {
        id: true,
        content: true,
        senderId: true,
        isEdited: true,
        editedAt: true,
        sessionId: true,
      },
    })

    return NextResponse.json({ message: updatedMessage })
  } catch (error) {
    console.error('Edit message error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Delete message (soft delete)
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

    // Verify message exists and belongs to current user
    const message = await prisma.message.findUnique({
      where: { id },
      select: { senderId: true, isDeleted: true, sessionId: true },
    })

    if (!message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 })
    }

    if (message.senderId !== currentUser.userId) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    if (message.isDeleted) {
      return NextResponse.json({ error: 'Message already deleted' }, { status: 400 })
    }

    await prisma.message.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        content: '', // Clear content on delete
      },
    })

    return NextResponse.json({ success: true, messageId: id, sessionId: message.sessionId })
  } catch (error) {
    console.error('Delete message error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

