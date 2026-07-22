"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

type NavItem = { href: string; label: string };

const NAV: Record<"ADMIN" | "AGENT" | "CLIENT", NavItem[]> = {
  ADMIN: [
    { href: "/admin/agents", label: "Hierarquia" },
    { href: "/admin/production", label: "Produção" },
    { href: "/admin/commission-plans", label: "Planos de comissão" },
    { href: "/admin/import", label: "Importar dados" },
    { href: "/admin/audit", label: "Auditoria" },
  ],
  AGENT: [
    { href: "/agent", label: "Painel" },
    { href: "/agent/hierarchy", label: "Hierarquia" },
    { href: "/agent/clients", label: "Clientes" },
    { href: "/agent/policies", label: "Apólices" },
    { href: "/agent/commissions", label: "Comissões" },
  ],
  CLIENT: [{ href: "/client", label: "Minhas apólices" }],
};

export function Shell({
  role,
  userName,
  children,
}: {
  role: "ADMIN" | "AGENT" | "CLIENT";
  userName: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const items = NAV[role];

  async function handleSignOut() {
    await authClient.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex min-h-full w-full flex-col md:flex-row">
      {/* Mobile-only top bar: deliberately far from the bottom nav so a
          distracted, one-handed tap near "Sair" can never land on a nav
          destination instead (or vice versa). */}
      <div className="flex items-center justify-between border-b border-border-steel bg-panel px-4 py-3 md:hidden">
        <span className="font-sans text-base font-semibold tracking-tight text-ink">
          Fyntra
        </span>
        <button
          type="button"
          onClick={handleSignOut}
          className="text-xs font-semibold text-ink-muted hover:text-ink"
        >
          Sair
        </button>
      </div>

      <nav
        aria-label="Navegação principal"
        className="fixed inset-x-0 bottom-0 z-30 flex shrink-0 border-t border-border-steel bg-panel md:static md:h-screen md:w-56 md:flex-col md:border-t-0 md:border-r"
      >
        <div className="hidden px-5 py-6 md:block">
          <span className="font-sans text-lg font-semibold tracking-tight text-ink">
            Fyntra
          </span>
        </div>
        <ul className="flex w-full md:flex-1 md:flex-col md:overflow-y-auto md:px-3">
          {items.map((item) => {
            const active = pathname === item.href;
            return (
              <li key={item.href} className="flex-1 md:flex-none">
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex flex-col items-center whitespace-nowrap px-2 py-2.5 text-center text-[11px] font-semibold md:flex-row md:rounded-md md:px-3 md:py-2 md:text-left md:text-sm ${
                    active
                      ? "bg-teal-pale text-teal"
                      : "text-ink-muted hover:text-ink"
                  }`}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
        <div className="hidden border-t border-border-steel px-5 py-4 md:block">
          <p className="truncate text-xs text-ink-muted">{userName}</p>
          <button
            type="button"
            onClick={handleSignOut}
            className="mt-2 text-xs font-semibold text-ink-muted hover:text-ink"
          >
            Sair
          </button>
        </div>
      </nav>

      <main className="min-w-0 flex-1 px-4 py-6 pb-20 md:px-8 md:py-8 md:pb-8">
        {children}
      </main>
    </div>
  );
}
