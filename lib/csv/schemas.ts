import { z } from 'zod'

// Known limitation (deferred): this parses CSV numeric fields (premium,
// faceAmount, commission amount) into plain JS `number` rather than a
// Decimal type. That's an acceptable float-precision risk here because
// each value only goes through a single Number(string) parse — no chained
// arithmetic — and is bounded by realistic premium/face-amount ranges. The
// one place override commission math actually chains multiplication/division
// on money (lib/commission.ts' computeOverrides) was fixed to use
// decimal.js instead; rewriting this whole CSV pipeline plus every downstream
// Prisma Decimal touchpoint to be fully Decimal-based end-to-end was judged
// out of scope for this fix pass.
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
