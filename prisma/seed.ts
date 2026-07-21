import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const admin = await prisma.user.create({
    data: { email: 'admin@ricos.test', name: 'Admin RICOS', role: 'ADMIN' },
  })

  const topUser = await prisma.user.create({
    data: { email: 'top@ricos.test', name: 'Agente Topo', role: 'AGENT' },
  })
  const top = await prisma.agent.create({
    data: { userId: topUser.id, rank: 'DIRECTOR', npn: '1000001', status: 'ACTIVE' },
  })

  const midUser = await prisma.user.create({
    data: { email: 'mid@ricos.test', name: 'Agente Meio', role: 'AGENT' },
  })
  const mid = await prisma.agent.create({
    data: {
      userId: midUser.id,
      parentAgentId: top.id,
      rank: 'MANAGER',
      npn: '1000002',
      status: 'ACTIVE',
    },
  })

  const leafUser = await prisma.user.create({
    data: { email: 'leaf@ricos.test', name: 'Agente Base', role: 'AGENT' },
  })
  const leaf = await prisma.agent.create({
    data: {
      userId: leafUser.id,
      parentAgentId: mid.id,
      rank: 'AGENT',
      npn: '1000003',
      status: 'ACTIVE',
    },
  })

  await prisma.commissionPlan.createMany({
    data: [
      { rank: 'MANAGER', downlineLevel: 1, overridePercent: 10 },
      { rank: 'DIRECTOR', downlineLevel: 2, overridePercent: 5 },
    ],
  })

  const clientUser = await prisma.user.create({
    data: { email: 'client@ricos.test', name: 'Cliente Exemplo', role: 'CLIENT' },
  })
  const client = await prisma.client.create({
    data: { userId: clientUser.id, name: 'Cliente Exemplo', assignedAgentId: leaf.id },
  })

  await prisma.policy.create({
    data: {
      clientId: client.id,
      agentId: leaf.id,
      carrier: 'National Life Group',
      product: 'Term 20',
      policyNumber: 'NLG-0001',
      faceAmount: 250000,
      premium: 45.5,
      status: 'INFORCE',
    },
  })

  console.log({ admin: admin.email, top: top.id, mid: mid.id, leaf: leaf.id })
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
