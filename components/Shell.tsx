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
      <nav className="flex shrink-0 flex-col border-b border-border-steel bg-panel md:h-screen md:w-56 md:border-b-0 md:border-r">
        <div className="hidden px-5 py-6 md:block">
          <span className="font-sans text-lg font-semibold tracking-tight text-ink">
            Fyntra
          </span>
        </div>
        <ul className="flex overflow-x-auto md:flex-1 md:flex-col md:overflow-visible md:px-3">
          {items.map((item) => {
            const active = pathname === item.href;
            return (
              <li key={item.href} className="shrink-0 md:shrink">
                <Link
                  href={item.href}
                  className={`block whitespace-nowrap px-4 py-3 text-sm font-semibold md:rounded-md md:px-3 md:py-2 ${
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
          <li className="shrink-0 md:mt-auto md:shrink">
            <button
              type="button"
              onClick={handleSignOut}
              className="block w-full whitespace-nowrap px-4 py-3 text-left text-sm font-semibold text-ink-muted hover:text-ink md:rounded-md md:px-3 md:py-2"
            >
              Sair
            </button>
          </li>
        </ul>
        <div className="hidden border-t border-border-steel px-5 py-4 md:block">
          <p className="text-xs text-ink-muted">{userName}</p>
        </div>
      </nav>
      <main className="min-w-0 flex-1 px-4 py-6 md:px-8 md:py-8">
        {children}
      </main>
    </div>
  );
}
