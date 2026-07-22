"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { updateAgentHierarchy } from "./actions";
import { Select } from "@/components/Field";
import { RANKS } from "@/lib/ranks";

type Agent = { id: string; name: string; rank: string; parentAgentId: string | null };
type OrderedAgent = Agent & { depth: number };

const RANK_TONE: Record<string, string> = {
  DIRECTOR: "bg-teal text-paper",
  MANAGER: "bg-gold text-paper",
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
}

function AgentCard({
  agent,
  depth,
  parentName,
  dragState,
  editing,
  onToggleEdit,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
  onSave,
  parentOptions,
  reducedMotion,
}: {
  agent: Agent;
  depth: number;
  parentName: string | null;
  dragState: "idle" | "dragging-self" | "valid-target" | "invalid-target";
  editing: boolean;
  onToggleEdit: () => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  onSave: (parentAgentId: string | null, rank: string) => Promise<void>;
  parentOptions: { id: string; name: string }[];
  reducedMotion: boolean;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function handleSubmit(formData: FormData) {
    setSubmitting(true);
    setMessage(null);
    const parentAgentId = (formData.get("parentAgentId") as string) || null;
    const rank = formData.get("rank") as string;
    try {
      await onSave(parentAgentId, rank);
      setMessage({ ok: true, text: "Salvo." });
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : "Erro ao salvar." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <motion.div
      layout={!reducedMotion}
      initial={reducedMotion ? false : { opacity: 0, y: 8 }}
      animate={{
        opacity: dragState === "dragging-self" ? 0.4 : 1,
        y: 0,
        scale: dragState === "dragging-self" ? 0.98 : 1,
      }}
      transition={reducedMotion ? { duration: 0 } : { type: "spring", stiffness: 500, damping: 40 }}
      style={{ marginLeft: `${Math.min(depth, 6) * 1.5}rem` }}
    >
      <div
        draggable
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onDragEnd={onDragEnd}
        className={`group flex cursor-grab items-center gap-3 rounded-lg border bg-paper px-4 py-3 transition-[box-shadow,transform,border-color] duration-150 active:cursor-grabbing ${
          dragState === "valid-target"
            ? "border-teal ring-2 ring-teal-pale"
            : dragState === "invalid-target"
              ? "border-danger ring-2 ring-danger-pale"
              : "border-border-steel hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(24,34,37,0.08)]"
        }`}
      >
        <span aria-hidden className="select-none text-ink-muted/40">
          ⠿
        </span>
        <div
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
            RANK_TONE[agent.rank] ?? "border border-border-steel bg-panel text-ink-muted"
          }`}
        >
          {initials(agent.name)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-ink">{agent.name}</p>
          <p className="truncate text-xs text-ink-muted">
            {parentName ? `Reporta para ${parentName}` : "Topo da hierarquia"}
          </p>
        </div>
        <span className="hidden shrink-0 rounded-full bg-panel px-2.5 py-[3px] text-xs font-semibold text-ink-muted sm:inline">
          {agent.rank}
        </span>
        <button
          type="button"
          onClick={onToggleEdit}
          className="shrink-0 text-xs font-semibold text-teal opacity-100 transition-opacity duration-150 hover:text-teal-deep sm:opacity-0 sm:focus-visible:opacity-100 sm:group-hover:opacity-100"
        >
          {editing ? "Fechar" : "Editar"}
        </button>
      </div>

      <AnimatePresence initial={false}>
        {editing && (
          <motion.div
            initial={reducedMotion ? false : { height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={reducedMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={reducedMotion ? { duration: 0.1 } : { duration: 0.2 }}
            className="overflow-hidden"
          >
            <form action={handleSubmit} className="mt-2 flex flex-wrap items-center gap-2 pl-10">
              <Select name="parentAgentId" defaultValue={agent.parentAgentId ?? ""} className="w-44">
                <option value="">— nenhum —</option>
                {parentOptions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
              <Select name="rank" defaultValue={agent.rank} className="w-32">
                {!RANKS.includes(agent.rank as (typeof RANKS)[number]) && (
                  <option value={agent.rank}>{agent.rank}</option>
                )}
                {RANKS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </Select>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center justify-center rounded-md border border-border-steel bg-paper px-3 py-1.5 text-xs font-semibold text-ink hover:border-teal disabled:opacity-50"
              >
                {submitting ? "Salvando…" : "Salvar"}
              </button>
              {message && (
                <span role="alert" className={`text-xs ${message.ok ? "text-success" : "text-danger"}`}>
                  {message.text}
                </span>
              )}
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function HierarchyBoard({
  agents,
}: {
  agents: OrderedAgent[];
}) {
  const reducedMotion = useReducedMotion() ?? false;
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | "root" | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pending, setPending] = useState<{ agentId: string; parentAgentId: string | null } | null>(null);
  const [banner, setBanner] = useState<{ ok: boolean; text: string } | null>(null);

  const byId = useMemo(() => new Map(agents.map((a) => [a.id, a])), [agents]);
  const parentOptions = useMemo(() => agents.map((a) => ({ id: a.id, name: a.name })), [agents]);

  // A descendant can't become its own ancestor's manager — computed on the
  // fly per drag so the invalid-target ring reacts immediately, without a
  // round trip to the server.
  function isDescendant(candidateId: string, ofId: string): boolean {
    const childrenByParent = new Map<string, string[]>();
    for (const a of agents) {
      if (!a.parentAgentId) continue;
      const list = childrenByParent.get(a.parentAgentId) ?? [];
      list.push(a.id);
      childrenByParent.set(a.parentAgentId, list);
    }
    const stack = [...(childrenByParent.get(ofId) ?? [])];
    while (stack.length > 0) {
      const current = stack.pop()!;
      if (current === candidateId) return true;
      stack.push(...(childrenByParent.get(current) ?? []));
    }
    return false;
  }

  async function reassign(agentId: string, parentAgentId: string | null, rank: string) {
    const formData = new FormData();
    formData.set("agentId", agentId);
    formData.set("parentAgentId", parentAgentId ?? "");
    formData.set("rank", rank);
    const result = await updateAgentHierarchy(formData);
    if (!result.ok) throw new Error(result.message);
  }

  async function handleDrop(targetId: string | "root") {
    const sourceId = draggedId;
    setDraggedId(null);
    setOverId(null);
    if (!sourceId) return;
    if (targetId === sourceId) return;
    const newParentId = targetId === "root" ? null : targetId;
    if (newParentId && isDescendant(newParentId, sourceId)) return;

    const source = byId.get(sourceId);
    if (!source) return;

    setPending({ agentId: sourceId, parentAgentId: newParentId });
    setBanner(null);
    try {
      await reassign(sourceId, newParentId, source.rank);
      setBanner({ ok: true, text: `${source.name} atualizado.` });
    } catch (err) {
      setBanner({ ok: false, text: err instanceof Error ? err.message : "Erro ao mover agente." });
    } finally {
      setPending(null);
    }
  }

  function dragStateFor(agentId: string): "idle" | "dragging-self" | "valid-target" | "invalid-target" {
    if (draggedId === agentId) return "dragging-self";
    if (overId === agentId && draggedId) {
      return isDescendant(agentId, draggedId) || agentId === draggedId ? "invalid-target" : "valid-target";
    }
    return "idle";
  }

  return (
    <div>
      {banner && (
        <p
          role="alert"
          className={`mb-3 rounded-md px-3 py-2 text-sm ${
            banner.ok ? "bg-success-pale text-success" : "bg-danger-pale text-danger"
          }`}
        >
          {banner.text}
        </p>
      )}

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setOverId("root");
        }}
        onDragLeave={() => setOverId((id) => (id === "root" ? null : id))}
        onDrop={(e) => {
          e.preventDefault();
          handleDrop("root");
        }}
        className={`mb-4 flex items-center justify-center rounded-lg border border-dashed px-4 py-3 text-xs font-semibold uppercase tracking-wide transition-colors duration-150 ${
          overId === "root" && draggedId
            ? "border-teal bg-teal-pale text-teal"
            : "border-border-steel text-ink-muted"
        }`}
      >
        Arraste aqui para remover o gerente (topo da hierarquia)
      </div>

      <div className="flex flex-col gap-2">
        {agents.map((agent) => (
          <AgentCard
            key={agent.id}
            agent={agent}
            depth={agent.depth}
            parentName={agent.parentAgentId ? (byId.get(agent.parentAgentId)?.name ?? null) : null}
            dragState={pending?.agentId === agent.id ? "dragging-self" : dragStateFor(agent.id)}
            editing={editingId === agent.id}
            onToggleEdit={() => setEditingId((id) => (id === agent.id ? null : agent.id))}
            reducedMotion={reducedMotion}
            parentOptions={parentOptions.filter((p) => p.id !== agent.id)}
            onSave={async (parentAgentId, rank) => {
              await reassign(agent.id, parentAgentId, rank);
              setBanner({ ok: true, text: `${agent.name} atualizado.` });
              setEditingId(null);
            }}
            onDragStart={(e) => {
              setDraggedId(agent.id);
              e.dataTransfer.effectAllowed = "move";
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setOverId(agent.id);
            }}
            onDragLeave={() => setOverId((id) => (id === agent.id ? null : id))}
            onDrop={(e) => {
              e.preventDefault();
              handleDrop(agent.id);
            }}
            onDragEnd={() => {
              setDraggedId(null);
              setOverId(null);
            }}
          />
        ))}
      </div>
    </div>
  );
}
