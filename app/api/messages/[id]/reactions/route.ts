import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'

// POST - Add reaction
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { id: messageId } = await params
    const { emoji } = await request.json()

    if (!emoji) {
      return NextResponse.json({ error: 'Emoji is required' }, { status: 400 })
    }

    // Verify message exists and is not deleted
    const message = await prisma.message.findUnique({
      where: { id: messageId },
      select: { id: true, isDeleted: true, sessionId: true },
    })

    if (!message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 })
    }

    if (message.isDeleted) {
      return NextResponse.json({ error: 'Cannot react to deleted message' }, { status: 400 })
    }

    // Check if it's a group chat
    const session = await prisma.chatSession.findUnique({
      where: { id: message.sessionId },
      select: { isGroup: true },
    })

    // For 1-1 chats: user can only have ONE reaction per message
    // Delete any existing reaction from this user first
    if (!session?.isGroup) {
      await prisma.reaction.deleteMany({
        where: {
          messageId,
          userId: currentUser.userId,
        },
      })
    }

    // Create the new reaction
    const reaction = await prisma.reaction.create({
      data: {
        messageId,
        userId: currentUser.userId,
        emoji,
      },
      select: {
        id: true,
        emoji: true,
        userId: true,
        messageId: true,
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    return NextResponse.json({ 
      reaction, 
      sessionId: message.sessionId,
      replaced: !session?.isGroup, // Indicate if previous reaction was replaced
    }, { status: 201 })
  } catch (error) {
    console.error('Add reaction error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Remove reaction
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { id: messageId } = await params
    const { searchParams } = new URL(request.url)
    const emoji = searchParams.get('emoji')

    if (!emoji) {
      return NextResponse.json({ error: 'Emoji is required' }, { status: 400 })
    }

    // Find and delete the reaction
    const reaction = await prisma.reaction.findUnique({
      where: {
        messageId_userId_emoji: {
          messageId,
          userId: currentUser.userId,
          emoji,
        },
      },
      select: {
        id: true,
        message: {
          select: { sessionId: true },
        },
      },
    })

    if (!reaction) {
      return NextResponse.json({ error: 'Reaction not found' }, { status: 404 })
    }

    await prisma.reaction.delete({
      where: { id: reaction.id },
    })

    return NextResponse.json({
      success: true,
      messageId,
      emoji,
      userId: currentUser.userId,
      sessionId: reaction.message.sessionId,
    })
  } catch (error) {
    console.error('Remove reaction error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

