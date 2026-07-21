'use client'

import { useState } from 'react'
import { submitPolicyImport, submitCommissionImport } from './actions'
import { Button } from '@/components/Button'

type Result = { batchId: string; successCount: number; errors: { row: number; message: string }[] }

function ImportResultSummary({ result }: { result: Result }) {
  const hasErrors = result.errors.length > 0
  return (
    <div
      className={`mt-3 rounded-md px-3 py-2.5 text-sm ${
        hasErrors ? 'bg-gold-pale text-gold' : 'bg-success-pale text-success'
      }`}
    >
      <p className="font-semibold">
        {result.successCount} linha(s) importada(s), {result.errors.length} erro(s).
      </p>
      {hasErrors && (
        <ul className="mt-1.5 list-disc pl-4 text-ink">
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
}: {
  title: string
  action: (formData: FormData) => Promise<Result>
  buttonLabel: string
}) {
  const [result, setResult] = useState<Result | null>(null)
  const [submitting, setSubmitting] = useState(false)

  return (
    <section className="rounded-lg border border-border-steel bg-panel p-5">
      <h2 className="text-lg font-semibold text-ink">{title}</h2>
      <form
        action={async (formData: FormData) => {
          setSubmitting(true)
          try {
            setResult(await action(formData))
          } finally {
            setSubmitting(false)
          }
        }}
        className="mt-3 flex flex-wrap items-center gap-3"
      >
        <input
          type="file"
          name="file"
          accept=".csv"
          required
          className="text-sm text-ink-muted file:mr-3 file:rounded-md file:border-0 file:bg-teal-pale file:px-3 file:py-2 file:text-sm file:font-semibold file:text-teal hover:file:bg-teal/20"
        />
        <Button type="submit" variant="primary" disabled={submitting}>
          {submitting ? 'Importando…' : buttonLabel}
        </Button>
      </form>
      {result && <ImportResultSummary result={result} />}
    </section>
  )
}

export function ImportForms() {
  return (
    <div className="mt-6 flex flex-col gap-6">
      <ImportCard title="Apólices (CSV)" action={submitPolicyImport} buttonLabel="Importar apólices" />
      <ImportCard title="Comissões (CSV)" action={submitCommissionImport} buttonLabel="Importar comissões" />
    </div>
  )
}
