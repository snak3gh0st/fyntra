import { requireRole } from '@/lib/require-role'
import { Shell } from '@/components/Shell'
import { ImportForms } from './ImportForms'

export const dynamic = 'force-dynamic'

export default async function ImportPage() {
  const session = await requireRole('ADMIN')

  return (
    <Shell role="ADMIN" userName={session.user.name}>
      <h1 className="text-[1.5rem] font-semibold tracking-tight text-ink">Importar dados</h1>
      <ImportForms />
    </Shell>
  )
}
