'use client'

import { useState } from 'react'
import { submitPolicyImport, submitCommissionImport } from './actions'

type Result = { batchId: string; successCount: number; errors: { row: number; message: string }[] }

export default function ImportPage() {
  const [policyResult, setPolicyResult] = useState<Result | null>(null)
  const [commissionResult, setCommissionResult] = useState<Result | null>(null)

  return (
    <main>
      <h1>Import de dados</h1>

      <section>
        <h2>Apólices (CSV)</h2>
        <form
          action={async (formData: FormData) => setPolicyResult(await submitPolicyImport(formData))}
        >
          <input type="file" name="file" accept=".csv" required />
          <button type="submit">Importar apólices</button>
        </form>
        {policyResult && (
          <p>
            {policyResult.successCount} linhas importadas, {policyResult.errors.length} erros.
            {policyResult.errors.map((e) => (
              <span key={e.row}> Linha {e.row}: {e.message}. </span>
            ))}
          </p>
        )}
      </section>

      <section>
        <h2>Comissões (CSV)</h2>
        <form
          action={async (formData: FormData) => setCommissionResult(await submitCommissionImport(formData))}
        >
          <input type="file" name="file" accept=".csv" required />
          <button type="submit">Importar comissões</button>
        </form>
        {commissionResult && (
          <p>
            {commissionResult.successCount} linhas importadas, {commissionResult.errors.length} erros.
            {commissionResult.errors.map((e) => (
              <span key={e.row}> Linha {e.row}: {e.message}. </span>
            ))}
          </p>
        )}
      </section>
    </main>
  )
}
