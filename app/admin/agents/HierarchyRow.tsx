"use client";

import { useState } from "react";
import { updateAgentHierarchy } from "./actions";
import { Select } from "@/components/Field";
import { Button } from "@/components/Button";
import { RANKS } from "@/lib/ranks";

export function HierarchyRow({
  agentId,
  parentAgentId,
  rank,
  parentOptions,
}: {
  agentId: string;
  parentAgentId: string | null;
  rank: string;
  parentOptions: { id: string; name: string }[];
}) {
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function handleSubmit(formData: FormData) {
    setSubmitting(true);
    setMessage(null);
    const result = await updateAgentHierarchy(formData);
    setSubmitting(false);
    setMessage(
      result.ok
        ? { ok: true, text: "Salvo." }
        : { ok: false, text: result.message },
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <form action={handleSubmit} className="flex flex-wrap items-center gap-2">
        <input type="hidden" name="agentId" value={agentId} />
        <Select name="parentAgentId" defaultValue={parentAgentId ?? ""} className="w-40">
          <option value="">— nenhum —</option>
          {parentOptions.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </Select>
        <Select name="rank" defaultValue={rank} className="w-32">
          {/* Preserve any legacy rank value that predates this dropdown so
              saving the row without touching rank can never silently swap
              it for whatever option happens to be first. */}
          {!RANKS.includes(rank as (typeof RANKS)[number]) && (
            <option value={rank}>{rank}</option>
          )}
          {RANKS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </Select>
        <Button type="submit" variant="secondary" disabled={submitting}>
          {submitting ? "Salvando…" : "Salvar"}
        </Button>
      </form>
      {message && (
        <p role="alert" className={`text-xs ${message.ok ? "text-success" : "text-danger"}`}>
          {message.text}
        </p>
      )}
    </div>
  );
}
