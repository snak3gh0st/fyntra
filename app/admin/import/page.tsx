import { requireRole } from '@/lib/require-role'
import { Shell } from '@/components/Shell'
import { PageHeader } from '@/components/PageHeader'
import { ImportForms } from './ImportForms'

export const dynamic = 'force-dynamic'

export default async function ImportPage() {
  const session = await requireRole('ADMIN')

  return (
    <Shell role="ADMIN" userName={session.user.name}>
      <PageHeader title="Importar dados" eyebrow="Entrada de dados" description="Envie apólices e comissões em CSV. O resultado de cada linha ficará registrado para conferência." />
      <div className="mt-8"><ImportForms /></div>
    </Shell>
  )
}
