"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { EmptyState } from "@/components/Table";
import { Avatar } from "@/components/Avatar";
import { Pagination, clampPage } from "@/components/Pagination";

const PAGE_SIZE = 12;

type Row = { name: string; rank: string; level?: number };

function PersonCard({ row, index, reducedMotion }: { row: Row; index: number; reducedMotion: boolean }) {
  return (
    <motion.div
      initial={reducedMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reducedMotion ? { duration: 0 } : { duration: 0.25, delay: index * 0.03, ease: "easeOut" }}
      style={row.level ? { marginLeft: `${Math.min(row.level - 1, 4) * 1.25}rem` } : undefined}
      className="flex items-center gap-3 bg-paper px-3 py-3 transition-colors duration-150 hover:bg-teal-pale"
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

export function HierarchyList({ rows, paginate = false }: { rows: Row[]; paginate?: boolean }) {
  const reducedMotion = useReducedMotion() ?? false;
  const [page, setPage] = useState(1);

  if (rows.length === 0) {
    return <EmptyState>Ninguém aqui.</EmptyState>;
  }

  const pageCount = paginate ? Math.max(1, Math.ceil(rows.length / PAGE_SIZE)) : 1;
  const currentPage = clampPage(page, pageCount);
  const pageRows = paginate ? rows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE) : rows;

  return (
    <div>
      <div className="overflow-hidden rounded-md border border-border-steel bg-paper divide-y divide-border-steel">
        {pageRows.map((row, i) => (
          <div key={`${row.name}-${i}`}>
            <PersonCard row={row} index={i} reducedMotion={reducedMotion} />
          </div>
        ))}
      </div>
      {paginate && <Pagination page={currentPage} pageCount={pageCount} onPageChange={setPage} />}
    </div>
  );
}
