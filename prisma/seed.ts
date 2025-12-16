import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const AI_ASSISTANT_ID = '00000000-0000-0000-0000-000000000001'
const AI_ASSISTANT_EMAIL = 'ai@shipper.chat'
const AI_ASSISTANT_NAME = 'AI Assistant'

async function main() {
  // Check if AI assistant already exists
  const existingAI = await prisma.user.findUnique({
    where: { id: AI_ASSISTANT_ID },
  })

  if (existingAI) {
    console.log('AI Assistant already exists')
    return
  }

  // Create AI assistant user
  const aiAssistant = await prisma.user.create({
    data: {
      id: AI_ASSISTANT_ID,
      email: AI_ASSISTANT_EMAIL,
      name: AI_ASSISTANT_NAME,
      password: '', // AI doesn't need a password
      isAI: true,
    },
  })

  console.log('AI Assistant created:', aiAssistant)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

