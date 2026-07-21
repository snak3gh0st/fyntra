import { redirect } from "next/navigation";
import { requireRole } from '@/lib/require-role'

export default async function Home() {
  try {
    const session = await requireRole('ADMIN', 'AGENT', 'CLIENT')
    const role = session.user.role
    if (role === 'ADMIN') redirect('/admin/agents')
    if (role === 'AGENT') redirect('/agent')
    redirect('/client')
  } catch {
    // Keep public landing page for guests.
  }

  return (
    <main className="min-h-screen">
      <h1>Fyntra</h1>
      <p>Bem-vindo. Entre em <a href="/login">/login</a>.</p>
    </main>
  )
}
