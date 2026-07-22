import { HTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from "react";

export function Table({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border-steel">
      <table className="w-full border-collapse text-[0.9375rem]">{children}</table>
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
      className={`border-b border-border-steel px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-ink-muted ${className}`}
      {...props}
    />
  );
}

export function Tr({ className = "", ...props }: HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={`transition-colors duration-150 hover:bg-teal-pale ${className}`}
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
      className={`border-b border-border-steel px-3 py-2.5 text-ink last:border-b-0 ${className}`}
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
    <div className="px-3 py-10 text-center text-sm text-ink-muted">
      {children}
    </div>
  );
}
