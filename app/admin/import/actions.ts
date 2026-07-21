'use server'

import { importPolicies, importCommissions } from '@/lib/csv/import-service'
import { requireRole } from '@/lib/require-role'

export async function submitPolicyImport(formData: FormData) {
  const session = await requireRole('ADMIN')
  const file = formData.get('file') as File
  const content = await file.text()
  return importPolicies(content, session.user.id, file.name)
}

export async function submitCommissionImport(formData: FormData) {
  const session = await requireRole('ADMIN')
  const file = formData.get('file') as File
  const content = await file.text()
  return importCommissions(content, session.user.id, file.name)
}
