import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'

export async function getCurrentAgent() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) throw new Error('Not authenticated')
  const agent = await prisma.agent.findUnique({ where: { userId: session.user.id } })
  if (!agent) throw new Error('Signed-in user has no Agent record')
  return agent
}
