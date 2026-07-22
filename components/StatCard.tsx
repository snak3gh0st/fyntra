export function StatCard({
  label,
  value,
  delta,
  deltaSuffix = "",
  emphasis = false,
  className = "",
}: {
  label: string;
  value: React.ReactNode;
  delta?: number | null;
  deltaSuffix?: string;
  emphasis?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`min-h-[112px] px-5 py-5 ${className} ${emphasis ? "bg-gold-pale" : "bg-panel"}`}
    >
      <p className={`text-xs font-semibold uppercase tracking-wide ${emphasis ? "text-gold-ink" : "text-ink-muted"}`}>
        {label}
      </p>
      <div className="mt-1.5 flex items-baseline gap-2">
        <p className={`font-mono tabular-nums ${emphasis ? "text-3xl font-semibold text-gold-ink" : "text-2xl font-medium text-ink"}`}>
          {value}
        </p>
        {delta !== undefined && delta !== null && (
          <span className={`inline-flex items-center gap-0.5 font-mono text-xs font-semibold ${delta >= 0 ? "text-success" : "text-danger"}`}>
            <span aria-hidden>{delta >= 0 ? "▲" : "▼"}</span>
            {Math.abs(delta).toFixed(0)}%{deltaSuffix}
          </span>
        )}
      </div>
    </div>
  );
}

export function StatCardHero({
  label,
  value,
  delta,
  deltaSuffix = "",
  children,
}: {
  label: string;
  value: React.ReactNode;
  delta?: number | null;
  deltaSuffix?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-6 rounded-lg bg-rail px-6 py-6 text-paper sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-paper/55">{label}</p>
        <div className="mt-1.5 flex items-baseline gap-2.5">
          <p className="font-mono text-4xl font-semibold tabular-nums tracking-[-0.01em]">{value}</p>
          {delta !== undefined && delta !== null && (
            <span className={`inline-flex items-center gap-1 font-mono text-sm font-semibold ${delta >= 0 ? "text-success" : "text-[oklch(0.72_0.15_25)]"}`}>
              <span aria-hidden>{delta >= 0 ? "▲" : "▼"}</span>
              {Math.abs(delta).toFixed(0)}%{deltaSuffix}
            </span>
          )}
        </div>
      </div>
      {children && <div className="shrink-0">{children}</div>}
    </div>
  );
}
