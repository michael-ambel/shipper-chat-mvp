import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'

// POST - Leave group
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

    // Check if user is a member
    const participant = await prisma.sessionParticipant.findFirst({
      where: {
        sessionId: id,
        userId: currentUser.userId,
        isActive: true,
      },
    })

    if (!participant) {
      return NextResponse.json({ error: 'Not a member' }, { status: 404 })
    }

    // Check if user is the creator
    const group = await prisma.chatSession.findUnique({
      where: { id },
      select: { createdById: true },
    })

    if (group?.createdById === currentUser.userId) {
      // Count remaining active admins
      const adminCount = await prisma.sessionParticipant.count({
        where: {
          sessionId: id,
          isActive: true,
          role: 'admin',
          userId: { not: currentUser.userId },
        },
      })

      if (adminCount === 0) {
        // Promote first member to admin or prevent leaving
        const firstMember = await prisma.sessionParticipant.findFirst({
          where: {
            sessionId: id,
            isActive: true,
            userId: { not: currentUser.userId },
          },
          orderBy: { joinedAt: 'asc' },
        })

        if (firstMember) {
          await prisma.sessionParticipant.update({
            where: { id: firstMember.id },
            data: { role: 'admin' },
          })
        } else {
          // Last member - delete group
          await prisma.chatSession.delete({
            where: { id },
          })
          return NextResponse.json({ success: true, groupDeleted: true })
        }
      }
    }

    // Leave group
    await prisma.sessionParticipant.update({
      where: { id: participant.id },
      data: {
        isActive: false,
        leftAt: new Date(),
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Leave group error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

