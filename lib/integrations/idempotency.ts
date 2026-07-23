// Deterministic identity for an external provider event, used to dedupe
// inbound syncs. Provider is normalized (trim + lowercase) so casing/whitespace
// from different feeds collapse to one key; externalId keeps its casing because
// carrier IDs are case-sensitive. Never include PII here — this key is logged.
export function buildExternalEventKey(provider: string, externalId: string): string {
  const normalizedProvider = provider.trim().toLowerCase()
  if (!normalizedProvider) throw new Error('provider is required')

  const trimmedExternalId = externalId.trim()
  if (!trimmedExternalId) throw new Error('externalId is required')

  return `${normalizedProvider}:${trimmedExternalId}`
}

export function isDuplicateExternalEvent(existingKey: string, incomingKey: string): boolean {
  return existingKey === incomingKey
}
