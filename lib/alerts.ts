export type RiskAlertInput = {
  id: string
  policyNumber: string
  carrier: string
  product: string
  clientName: string
  status: string
  createdAt: Date
  effectiveDate: Date | null
  lastPaymentDate: Date | null
  statusChangedAt: Date | null
}

export type RiskAlertType = 'STALLED' | 'NO_PAYMENT' | 'RECENT_LAPSE'

export type RiskAlert = {
  type: RiskAlertType
  policy: {
    id: string
    policyNumber: string
    carrier: string
    product: string
    clientName: string
  }
  daysSince: number
}

const STALLED_THRESHOLD_DAYS = 15
const NO_PAYMENT_THRESHOLD_DAYS = 30
const RECENT_LAPSE_WINDOW_DAYS = 30
const MS_PER_DAY = 24 * 60 * 60 * 1000

function daysBetween(earlier: Date, now: Date): number {
  return Math.floor((now.getTime() - earlier.getTime()) / MS_PER_DAY)
}

function toAlert(type: RiskAlertType, policy: RiskAlertInput, daysSince: number): RiskAlert {
  return {
    type,
    daysSince,
    policy: {
      id: policy.id,
      policyNumber: policy.policyNumber,
      carrier: policy.carrier,
      product: policy.product,
      clientName: policy.clientName,
    },
  }
}

export function getRiskAlerts(policies: RiskAlertInput[], now: Date): RiskAlert[] {
  const alerts: RiskAlert[] = []

  for (const policy of policies) {
    if (policy.status === 'PENDING' || policy.status === 'APPROVED') {
      const days = daysBetween(policy.createdAt, now)
      if (days > STALLED_THRESHOLD_DAYS) {
        alerts.push(toAlert('STALLED', policy, days))
      }
      continue
    }

    if (policy.status === 'INFORCE') {
      const referenceDate = policy.lastPaymentDate ?? policy.effectiveDate
      if (referenceDate === null) {
        alerts.push(toAlert('NO_PAYMENT', policy, Infinity))
        continue
      }
      const days = daysBetween(referenceDate, now)
      if (days > NO_PAYMENT_THRESHOLD_DAYS) {
        alerts.push(toAlert('NO_PAYMENT', policy, days))
      }
      continue
    }

    if (policy.status === 'LAPSED' && policy.statusChangedAt !== null) {
      const days = daysBetween(policy.statusChangedAt, now)
      if (days <= RECENT_LAPSE_WINDOW_DAYS) {
        alerts.push(toAlert('RECENT_LAPSE', policy, days))
      }
    }
  }

  return alerts
}
