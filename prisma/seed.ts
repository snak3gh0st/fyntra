import { PrismaClient } from '@prisma/client'
import { auth } from '../lib/auth'

const prisma = new PrismaClient()

// Dev-only seed password for every seeded user. Never use this outside of
// local/dev seeding — production users must set their own passwords.
const SEED_PASSWORD = 'password123'

/**
 * Better Auth's emailAndPassword auth needs a matching `account` row with a
 * password hashed in Better Auth's own scheme (scrypt-based), not just a
 * `user` row. Raw `prisma.user.create()` alone produces a user nobody can
 * sign in as. The robust fix is to create users through Better Auth's own
 * sign-up API (`auth.api.signUpEmail`) so the account/password hash is
 * guaranteed to be in the format `signIn.email` expects — then patch the
 * `role` with a follow-up `prisma.user.update`, since `role` is only
 * reliably settable this way for a seed script that needs ADMIN/AGENT/CLIENT
 * distributed across specific users (the additionalFields default is
 * 'AGENT' for anyone signing up through the app UI).
 */
async function createUser(email: string, name: string, role: 'ADMIN' | 'AGENT' | 'CLIENT') {
  const result = await auth.api.signUpEmail({
    body: { email, name, password: SEED_PASSWORD, role },
  })
  const user = await prisma.user.update({
    where: { id: result.user.id },
    data: { role },
  })
  return user
}

async function main() {
  const admin = await createUser('admin@ricos.test', 'Admin RICOS', 'ADMIN')

  const topUser = await createUser('top@ricos.test', 'Agente Topo', 'AGENT')
  const top = await prisma.agent.create({
    data: { userId: topUser.id, rank: 'DIRECTOR', npn: '1000001', status: 'ACTIVE' },
  })

  const midUser = await createUser('mid@ricos.test', 'Agente Meio', 'AGENT')
  const mid = await prisma.agent.create({
    data: {
      userId: midUser.id,
      parentAgentId: top.id,
      rank: 'MANAGER',
      npn: '1000002',
      status: 'ACTIVE',
    },
  })

  const leafUser = await createUser('leaf@ricos.test', 'Agente Base', 'AGENT')
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

  const clientUser = await createUser('client@ricos.test', 'Cliente Exemplo', 'CLIENT')
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
  console.log(`All seeded users can sign in at /login with password: ${SEED_PASSWORD}`)
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
