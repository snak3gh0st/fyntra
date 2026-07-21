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
    <main className="mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center px-4 text-center">
      <span className="font-sans text-2xl font-semibold tracking-tight text-ink">
        Fyntra
      </span>
      <p className="mt-2 text-sm text-ink-muted">
        Sistema interno da RICOS.{' '}
        <a href="/login" className="font-semibold text-teal hover:text-teal-deep">
          Entrar
        </a>
      </p>
    </main>
  )
}
