'use server'

import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/require-role'
import { getCurrentAgent } from '@/lib/agent-context'
import { getDownlineIds } from '@/lib/hierarchy'
import { canAccessPolicy } from '@/lib/policy-access'
import { buildStoredPath, saveUploadedFile } from '@/lib/storage'
import { revalidatePath } from 'next/cache'
import { randomUUID } from 'crypto'

const ALLOWED_TYPES = new Set(['application/pdf', 'image/png', 'image/jpeg'])
const MAX_SIZE_BYTES = 10 * 1024 * 1024
const ILLUSTRATION_SUBDIR = 'illustrations'
const DOCUMENT_KIND_ILLUSTRATION = 'ILLUSTRATION'

export async function uploadPolicyDocument(formData: FormData): Promise<void> {
  const session = await requireRole('ADMIN', 'AGENT')
  const policyId = formData.get('policyId') as string
  const file = formData.get('file') as File
  const documentKind = (formData.get('documentKind') as string | null) ?? 'DOCUMENT'

  const policy = await prisma.policy.findUniqueOrThrow({ where: { id: policyId } })

  if (session.user.role === 'AGENT') {
    const agent = await getCurrentAgent()
    const allAgents = await prisma.agent.findMany({ select: { id: true, parentAgentId: true } })
    const scopeIds = [agent.id, ...getDownlineIds(allAgents, agent.id)]
    if (!canAccessPolicy({ role: 'AGENT', agentScopeIds: scopeIds }, policy)) {
      throw new Error('Forbidden: policy outside your scope')
    }
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    throw new Error(`Unsupported file type: ${file.type}`)
  }
  if (file.size > MAX_SIZE_BYTES) {
    throw new Error('File exceeds the 10 MB limit')
  }

  const uploadsDir = process.env.UPLOADS_DIR ?? './uploads'
  const isIllustration = documentKind === DOCUMENT_KIND_ILLUSTRATION
  const relativePath = buildStoredPath(
    policyId,
    file.name,
    randomUUID,
    isIllustration ? ILLUSTRATION_SUBDIR : undefined,
  )
  const buffer = Buffer.from(await file.arrayBuffer())
  await saveUploadedFile(uploadsDir, relativePath, buffer)

  await prisma.policyDocument.create({
    data: {
      policyId,
      filename: file.name,
      storedPath: relativePath,
      mimeType: file.type,
      sizeBytes: file.size,
      uploadedById: session.user.id,
    },
  })

  revalidatePath(`/agent/policies/${policyId}`)
}
