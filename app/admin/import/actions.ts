'use server'

import { importPolicies, importCommissions } from '@/lib/csv/import-service'
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'

export async function submitPolicyImport(formData: FormData) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) throw new Error('Not authenticated')
  const file = formData.get('file') as File
  const content = await file.text()
  return importPolicies(content, session.user.id)
}

export async function submitCommissionImport(formData: FormData) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) throw new Error('Not authenticated')
  const file = formData.get('file') as File
  const content = await file.text()
  return importCommissions(content, session.user.id)
}
