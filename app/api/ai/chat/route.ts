import { NextRequest } from 'next/server'
import { streamText } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { AI_ASSISTANT_ID } from '@/lib/ai'

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export const maxDuration = 30

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser()

    if (!currentUser) {
      return new Response('Not authenticated', { status: 401 })
    }

    const { sessionId, message } = await request.json()

    if (!sessionId || !message) {
      return new Response('Session ID and message are required', { status: 400 })
    }

    const history = await prisma.message.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        sender: {
          select: {
            name: true,
            isAI: true,
          },
        },
      },
    })

    const messages = history.reverse()

    const conversationHistory = messages.map((msg) => ({
      role: msg.sender.isAI ? ('assistant' as const) : ('user' as const),
      content: msg.content,
    }))

    conversationHistory.push({
      role: 'user' as const,
      content: message,
    })

    await prisma.message.create({
      data: {
        sessionId,
        senderId: currentUser.userId,
        content: message,
        type: 'text',
      },
    })

    const systemPrompt =
      'You are a helpful AI assistant in a chat application. Be concise, friendly, and helpful.'

    const aiRequestPayload = {
      system: systemPrompt,
      messages: conversationHistory,
    }

    console.log('AI request payload:', JSON.stringify(aiRequestPayload, null, 2))

    const result = await streamText({
      model: openai('gpt-4o-mini'),
      system: systemPrompt,
      messages: conversationHistory,
    })


    let fullResponse = ''
    const stream = new ReadableStream({
      async start(controller) {
        for await (const chunk of result.textStream) {
          fullResponse += chunk
          controller.enqueue(new TextEncoder().encode(chunk))
        }

        console.log('AI full response:', fullResponse)

        await prisma.message.create({
          data: {
            sessionId,
            senderId: AI_ASSISTANT_ID,
            content: fullResponse,
            type: 'ai',
          },
        })

        controller.close()
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
      },
    })
  } catch (error) {
    console.error('AI chat error:', error)
    return new Response('Internal server error', { status: 500 })
  }
}

