import { requireRole } from '@/lib/require-role'
import { Shell } from '@/components/Shell'
import { PageTitle } from '@/components/PageTitle'
import { ImportForms } from './ImportForms'

export const dynamic = 'force-dynamic'

export default async function ImportPage() {
  const session = await requireRole('ADMIN')

  return (
    <Shell role="ADMIN" userName={session.user.name}>
      <PageTitle>Importar dados</PageTitle>
      <ImportForms />
    </Shell>
  )
}
