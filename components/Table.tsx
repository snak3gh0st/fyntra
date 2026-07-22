"use client";

import { TdHTMLAttributes, ThHTMLAttributes } from "react";
import { motion, useReducedMotion } from "motion/react";

export function Table({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border-steel bg-paper">
      <table className="min-w-full border-collapse text-[0.9375rem]">{children}</table>
    </div>
  );
}

export function Thead({ children }: { children: React.ReactNode }) {
  return <thead className="sticky top-0 z-[1] bg-panel">{children}</thead>;
}

export function Th({
  className = "",
  ...props
}: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={`whitespace-nowrap border-b border-border-steel px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-muted ${className}`}
      {...props}
    />
  );
}

export function ThSort({
  className = "",
  active = false,
  direction = "desc",
  numeric = false,
  onClick,
  children,
  ...props
}: ThHTMLAttributes<HTMLTableCellElement> & {
  active?: boolean;
  direction?: "asc" | "desc";
  numeric?: boolean;
  onClick?: () => void;
}) {
  return (
    <th
      className={`whitespace-nowrap border-b border-border-steel p-0 text-[11px] font-semibold uppercase tracking-[0.08em] ${active ? "text-teal" : "text-ink-muted"} ${className}`}
      {...props}
    >
      <button
        type="button"
        onClick={onClick}
        className={`flex w-full items-center gap-1 px-4 py-3 uppercase tracking-[0.08em] hover:text-teal ${numeric ? "justify-end" : "justify-start text-left"}`}
      >
        {numeric && (
          <span aria-hidden className={`text-[9px] transition-opacity ${active ? "opacity-100" : "opacity-0"}`}>
            {direction === "asc" ? "▲" : "▼"}
          </span>
        )}
        {children}
        {!numeric && (
          <span aria-hidden className={`text-[9px] transition-opacity ${active ? "opacity-100" : "opacity-0"}`}>
            {direction === "asc" ? "▲" : "▼"}
          </span>
        )}
      </button>
    </th>
  );
}

export function Tr({
  className = "",
  index = 0,
  children,
}: {
  className?: string;
  index?: number;
  children: React.ReactNode;
}) {
  const reducedMotion = useReducedMotion() ?? false;
  return (
    <motion.tr
      initial={reducedMotion ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reducedMotion ? { duration: 0 } : { duration: 0.2, delay: Math.min(index, 30) * 0.015, ease: "easeOut" }}
      className={`transition-colors duration-150 hover:bg-teal-pale/70 ${className}`}
    >
      {children}
    </motion.tr>
  );
}

export function Td({
  className = "",
  ...props
}: TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td
      className={`whitespace-nowrap border-b border-border-steel px-4 py-3 text-ink last:border-b-0 ${className}`}
      {...props}
    />
  );
}

export function TdNum({
  className = "",
  ...props
}: TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <Td
      className={`text-right font-mono font-medium tabular-nums ${className}`}
      {...props}
    />
  );
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-border-steel bg-panel/50 px-5 py-12 text-center">
      <p className="mx-auto max-w-sm text-sm leading-6 text-ink-muted">{children}</p>
    </div>
  );
}
