'use client'

import { useState } from 'react'
import { submitPolicyImport, submitCommissionImport } from './actions'
import { Button } from '@/components/Button'
import { ImportStatusPill } from '@/components/StatusPill'
import type { ImportStatus } from '@/lib/csv/import-service'

type Result = {
  batchId: string
  status: ImportStatus
  successCount: number
  errors: { row: number; message: string }[]
}

function ImportResultSummary({ result }: { result: Result }) {
  return (
    <div className="mt-4 rounded-lg border border-border-steel bg-panel/50 px-4 py-3 text-sm">
      <div className="flex items-center gap-2">
        <ImportStatusPill status={result.status} />
        <p className="font-semibold text-ink">
          {result.successCount} linha(s) importada(s), {result.errors.length} erro(s).
        </p>
      </div>
      {result.errors.length > 0 && (
        <ul aria-live="polite" className="mt-1.5 list-disc pl-4 text-ink">
          {result.errors.map((e) => (
            <li key={e.row}>
              Linha {e.row}: {e.message}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function ImportCard({
  title,
  action,
  buttonLabel,
  buttonVariant = 'secondary',
  hint,
}: {
  title: string
  action: (formData: FormData) => Promise<Result>
  buttonLabel: string
  buttonVariant?: 'primary' | 'secondary'
  hint?: string
}) {
  const [result, setResult] = useState<Result | null>(null)
  const [submitting, setSubmitting] = useState(false)

  return (
    <section className="rounded-lg border border-border-steel bg-paper p-5 transition-colors hover:border-ink-muted">
      <div className="flex items-start justify-between gap-4">
        <h2 className="text-base font-semibold text-ink">{title}</h2>
        <span className="rounded-md bg-teal-pale px-2 py-1 text-[11px] font-semibold text-teal">CSV</span>
      </div>
      {hint && <p className="mt-1 text-sm text-ink-muted">{hint}</p>}
      <form
        action={async (formData: FormData) => {
          setSubmitting(true)
          try {
            setResult(await action(formData))
          } finally {
            setSubmitting(false)
          }
        }}
        className="mt-5 flex flex-wrap items-center gap-3"
      >
        <input
          type="file"
          name="file"
          accept=".csv"
          required
          className="text-sm text-ink-muted file:mr-3 file:rounded-md file:border-0 file:bg-teal-pale file:px-3 file:py-2 file:text-sm file:font-semibold file:text-teal hover:file:bg-teal/20"
        />
        <Button type="submit" variant={buttonVariant} disabled={submitting}>
          {submitting ? 'Importando…' : buttonLabel}
        </Button>
      </form>
      {result && <ImportResultSummary result={result} />}
    </section>
  )
}

export function ImportForms() {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <ImportCard
        title="1. Apólices (CSV)"
        action={submitPolicyImport}
        buttonLabel="Importar apólices"
        buttonVariant="primary"
        hint="Coluna opcional lastPaymentDate (data do último pagamento): sem ela, apólices em vigor sem data de vigência aparecem como &quot;sem sinal de pagamento&quot; nos alertas de risco do agente."
      />
      <ImportCard
        title="2. Comissões (CSV)"
        action={submitCommissionImport}
        buttonLabel="Importar comissões"
        hint="Importe as apólices primeiro — cada linha de comissão procura a apólice pelo número, e falha se ela ainda não existir."
      />
    </div>
  )
}
