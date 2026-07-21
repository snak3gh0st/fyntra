import { z } from 'zod'

const numericString = z.string().transform((val, ctx) => {
  // Reject empty or whitespace-only strings
  if (val.trim() === '') {
    ctx.addIssue({ code: 'custom', message: 'amount cannot be empty' })
    return z.NEVER
  }
  const parsed = Number(val)
  // Use isFinite to reject NaN, Infinity, and -Infinity
  if (!Number.isFinite(parsed)) {
    ctx.addIssue({ code: 'custom', message: `"${val}" is not a valid number` })
    return z.NEVER
  }
  return parsed
})

export const PolicyRowSchema = z.object({
  clientName: z.string().min(1),
  clientEmail: z.string().email().optional().or(z.literal('')),
  agentNpn: z.string().min(1),
  carrier: z.string().min(1),
  product: z.string().min(1),
  policyNumber: z.string().min(1),
  faceAmount: numericString,
  premium: numericString,
  status: z.enum(['PENDING', 'APPROVED', 'INFORCE', 'LAPSED', 'CANCELLED']),
  effectiveDate: z.string().optional(),
})

export type PolicyRow = z.infer<typeof PolicyRowSchema>

export const CommissionRowSchema = z.object({
  policyNumber: z.string().min(1),
  agentNpn: z.string().min(1),
  amount: numericString,
  period: z.string().regex(/^\d{4}-\d{2}$/, 'period must be YYYY-MM'),
})

export type CommissionRow = z.infer<typeof CommissionRowSchema>
