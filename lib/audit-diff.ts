export type FieldDiff = { field: string; before: string; after: string }

function stringifyValue(value: unknown): string {
  if (value === null || value === undefined) return '—'
  return typeof value === 'string' ? value : JSON.stringify(value)
}

// Reduces the AuditLog's before/after JSON blobs to only the fields that
// actually changed, so the audit view reads as "rank: AGENT -> MANAGER"
// instead of a full object dump repeating every unchanged field.
export function diffAuditFields(before: unknown, after: unknown): FieldDiff[] {
  const beforeObj = (before && typeof before === 'object' ? before : {}) as Record<string, unknown>
  const afterObj = (after && typeof after === 'object' ? after : {}) as Record<string, unknown>
  const keys = new Set([...Object.keys(beforeObj), ...Object.keys(afterObj)])

  const diffs: FieldDiff[] = []
  for (const key of keys) {
    const beforeVal = stringifyValue(beforeObj[key])
    const afterVal = stringifyValue(afterObj[key])
    if (beforeVal !== afterVal) {
      diffs.push({ field: key, before: beforeVal, after: afterVal })
    }
  }
  return diffs
}
