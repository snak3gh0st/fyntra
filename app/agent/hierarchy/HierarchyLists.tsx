"use client";

import { motion, useReducedMotion } from "motion/react";
import { EmptyState } from "@/components/Table";
import { Avatar } from "@/components/Avatar";

type Row = { name: string; rank: string; level?: number };

function PersonCard({ row, index, reducedMotion }: { row: Row; index: number; reducedMotion: boolean }) {
  return (
    <motion.div
      initial={reducedMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reducedMotion ? { duration: 0 } : { duration: 0.25, delay: index * 0.03, ease: "easeOut" }}
      style={row.level ? { marginLeft: `${Math.min(row.level - 1, 6) * 1.25}rem` } : undefined}
      className="flex items-center gap-3 rounded-lg border border-border-steel bg-paper px-4 py-3 transition-colors duration-150 hover:border-teal"
    >
      {row.level !== undefined && row.level > 1 && <span className="text-ink-muted">└</span>}
      <Avatar name={row.name} rank={row.rank} size="sm" />
      <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">{row.name}</span>
      {row.level !== undefined ? (
        <span className="shrink-0 font-mono text-xs text-ink-muted">Nível {row.level}</span>
      ) : (
        <span className="shrink-0 rounded-full bg-panel px-2 py-[3px] text-xs font-semibold text-ink-muted">
          {row.rank}
        </span>
      )}
    </motion.div>
  );
}

export function HierarchyList({ rows }: { rows: Row[] }) {
  const reducedMotion = useReducedMotion() ?? false;
  if (rows.length === 0) {
    return <EmptyState>Ninguém aqui.</EmptyState>;
  }
  return (
    <div className="flex flex-col gap-2">
      {rows.map((row, i) => (
        <PersonCard key={`${row.name}-${i}`} row={row} index={i} reducedMotion={reducedMotion} />
      ))}
    </div>
  );
}
