import { HTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from "react";

export function Table({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-md border border-border-steel bg-paper">
      <table className="min-w-full border-collapse text-[0.9375rem]">{children}</table>
    </div>
  );
}

export function Thead({ children }: { children: React.ReactNode }) {
  return <thead className="bg-panel">{children}</thead>;
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

export function Tr({ className = "", ...props }: HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={`transition-colors duration-150 odd:bg-paper even:bg-panel/30 hover:bg-teal-pale ${className}`}
      {...props}
    />
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
    <div className="rounded-lg border border-dashed border-border-steel bg-panel/40 px-4 py-10 text-center text-sm text-ink-muted">
      {children}
    </div>
  );
}
