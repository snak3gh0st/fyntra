"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

type NavItem = { href: string; label: string; icon: string };

function NavIcon({ name }: { name: string }) {
  const common = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
  const paths: Record<string, React.ReactNode> = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
    hierarchy: <><circle cx="12" cy="5" r="2.5" /><circle cx="5" cy="19" r="2.5" /><circle cx="19" cy="19" r="2.5" /><path d="M12 7.5v5M12 12.5H5v4M12 12.5h7v4" /></>,
    chart: <><path d="M4 19V5M4 19h16" /><path d="m7 15 3-4 3 2 5-7" /></>,
    layers: <><path d="m12 3 8 4-8 4-8-4 8-4Z" /><path d="m4 12 8 4 8-4M4 17l8 4 8-4" /></>,
    upload: <><path d="M12 16V4M8 8l4-4 4 4" /><path d="M5 14v5h14v-5" /></>,
    audit: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4M11 8v6M8 11h6" /></>,
    users: <><circle cx="9" cy="8" r="3" /><path d="M3 20c.5-3 2.5-5 6-5s5.5 2 6 5M16 5.5a3 3 0 0 1 0 5.8M18 15c1.8.7 2.8 2.3 3 5" /></>,
    document: <><path d="M6 3h9l3 3v15H6zM14 3v4h4M9 12h6M9 16h6" /></>,
    money: <><rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="12" cy="12" r="3" /><path d="M7 9h.01M17 15h.01" /></>,
  };
  return <svg {...common}>{paths[name] ?? paths.grid}</svg>;
}

const NAV: Record<"ADMIN" | "AGENT" | "CLIENT", NavItem[]> = {
  ADMIN: [
    { href: "/admin", label: "Painel", icon: "grid" },
    { href: "/admin/agents", label: "Hierarquia", icon: "hierarchy" },
    { href: "/admin/production", label: "Produção", icon: "chart" },
    { href: "/admin/commission-plans", label: "Planos de comissão", icon: "layers" },
    { href: "/admin/import", label: "Importar dados", icon: "upload" },
    { href: "/admin/audit", label: "Auditoria", icon: "audit" },
  ],
  AGENT: [
    { href: "/agent", label: "Painel", icon: "grid" },
    { href: "/agent/hierarchy", label: "Hierarquia", icon: "hierarchy" },
    { href: "/agent/clients", label: "Clientes", icon: "users" },
    { href: "/agent/policies", label: "Apólices", icon: "document" },
    { href: "/agent/commissions", label: "Comissões", icon: "money" },
  ],
  CLIENT: [{ href: "/client", label: "Minhas apólices", icon: "document" }],
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
    <div className="min-h-full w-full bg-paper md:flex">
      {/* Mobile-only top bar: deliberately far from the bottom nav so a
          distracted, one-handed tap near "Sair" can never land on a nav
          destination instead (or vice versa). */}
      <div className="flex items-center justify-between bg-rail px-4 py-3 text-paper md:hidden">
        <span className="flex items-center gap-2 font-sans text-base font-semibold tracking-tight"><span className="grid h-7 w-7 place-items-center rounded-md bg-paper text-teal"><span className="text-xs font-bold">F</span></span>Fyntra</span>
        <button
          type="button"
          onClick={handleSignOut}
          className="text-xs font-semibold text-paper/70 hover:text-paper"
        >
          Sair
        </button>
      </div>

      <nav
        aria-label="Navegação principal"
        className="fixed inset-x-0 bottom-0 z-30 flex shrink-0 border-t border-white/10 bg-rail/95 text-paper backdrop-blur-sm md:static md:h-screen md:w-[252px] md:flex-col md:border-t-0 md:border-r-0 md:bg-rail md:backdrop-blur-none"
      >
        <div className="hidden px-6 pb-7 pt-8 md:block">
          <span className="flex items-center gap-2.5 font-sans text-lg font-semibold tracking-tight"><span className="grid h-8 w-8 place-items-center rounded-md bg-paper text-teal"><span className="text-sm font-bold">F</span></span>Fyntra</span>
          <p className="mt-3 text-[11px] font-medium uppercase tracking-[0.16em] text-paper/45">Operações RICOS</p>
        </div>
        <ul className="flex w-full md:flex-1 md:flex-col md:gap-1 md:overflow-y-auto md:px-3">
          {items.map((item) => {
            const active = pathname === item.href;
            return (
              <li key={item.href} className="flex-1 md:flex-none">
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex flex-1 flex-col items-center gap-1 whitespace-nowrap px-1 py-2.5 text-center text-[10px] font-semibold md:flex-row md:rounded-md md:px-3 md:py-2.5 md:text-left md:text-sm ${
                    active
                      ? "bg-paper/10 text-paper"
                      : "text-paper/55 hover:bg-paper/5 hover:text-paper"
                  }`}
                >
                  <NavIcon name={item.icon} />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
        <div className="hidden border-t border-white/10 px-6 py-5 md:block">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-paper/45">Conta conectada</p>
          <p className="mt-1 truncate text-sm font-medium text-paper">{userName}</p>
          <button
            type="button"
            onClick={handleSignOut}
            className="mt-2 text-xs font-semibold text-paper/55 hover:text-paper"
          >
            Sair
          </button>
        </div>
      </nav>

      <main className="min-w-0 flex-1 bg-canvas px-4 py-6 pb-24 md:px-10 md:py-10 md:pb-10 lg:px-14">
        <div className="mx-auto max-w-[1440px]">{children}</div>
      </main>
    </div>
  );
}
