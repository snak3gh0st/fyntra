"use client";

import { useMemo, useState } from "react";
import { EmptyState } from "@/components/Table";
import { EntityCard, EntityCardList } from "@/components/EntityCard";
import { Avatar } from "@/components/Avatar";

type Client = { id: string; name: string; email: string | null; agentName: string };

export function ClientsList({ clients }: { clients: Client[] }) {
  const [query, setQuery] = useState("");

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? clients.filter((c) => c.name.toLowerCase().includes(q) || (c.email ?? "").toLowerCase().includes(q))
      : clients;
    const byAgent = new Map<string, Client[]>();
    for (const client of filtered) {
      const list = byAgent.get(client.agentName) ?? [];
      list.push(client);
      byAgent.set(client.agentName, list);
    }
    return Array.from(byAgent.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [clients, query]);

  return (
    <div>
      <label className="block">
        <span className="sr-only">Buscar cliente</span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por nome ou email…"
          className="w-full rounded-md border border-border-steel bg-paper px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-muted focus-visible:border-teal focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-teal-pale"
        />
      </label>

      {groups.length === 0 && (
        <div className="mt-4">
          <EmptyState>Nenhum cliente encontrado para &quot;{query}&quot;.</EmptyState>
        </div>
      )}

      <div className="mt-6 flex flex-col gap-6">
        {groups.map(([agentName, agentClients]) => (
          <section key={agentName}>
            <div className="mb-2 flex items-baseline justify-between px-0.5">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-muted">{agentName}</h2>
              <span className="font-mono text-xs text-ink-muted">{agentClients.length}</span>
            </div>
            <EntityCardList>
              {agentClients.map((client, i) => (
                <EntityCard key={client.id} index={i}>
                  <Avatar name={client.name} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-ink">{client.name}</p>
                    <p className="truncate text-xs text-ink-muted">{client.email ?? "Sem email cadastrado"}</p>
                  </div>
                </EntityCard>
              ))}
            </EntityCardList>
          </section>
        ))}
      </div>
    </div>
  );
}
