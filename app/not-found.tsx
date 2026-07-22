import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-sm flex-col items-center justify-center px-4 text-center">
      <span className="font-sans text-2xl font-semibold tracking-tight text-ink">
        Fyntra
      </span>
      <p className="mt-4 text-sm text-ink">Página não encontrada.</p>
      <p className="mt-1 text-sm text-ink-muted">
        O link pode estar desatualizado, ou você não tem acesso a este conteúdo.
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex items-center justify-center gap-2 rounded-md bg-teal px-4 py-2.5 text-sm font-semibold text-paper transition-colors duration-150 hover:bg-teal-deep focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-teal-pale"
      >
        Ir para o início
      </Link>
    </main>
  );
}
