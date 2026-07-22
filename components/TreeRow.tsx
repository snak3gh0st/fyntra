const RAIL_WIDTH = 22;
const MAX_DEPTH = 8;

export function TreeRow({
  depth,
  ancestorGuides,
  hasNextSibling,
  children,
}: {
  depth: number;
  ancestorGuides: boolean[];
  hasNextSibling: boolean;
  children: React.ReactNode;
}) {
  const cappedDepth = Math.min(depth, MAX_DEPTH);
  return (
    <div className="flex items-stretch">
      {ancestorGuides.slice(0, cappedDepth).map((continues, i) => (
        <div key={i} className="relative shrink-0" style={{ width: RAIL_WIDTH }}>
          {continues && <span className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-border-steel" aria-hidden />}
        </div>
      ))}
      {cappedDepth > 0 && (
        <div className="relative shrink-0" style={{ width: RAIL_WIDTH }}>
          <span
            className="absolute left-1/2 top-0 w-px -translate-x-1/2 bg-border-steel"
            style={{ height: hasNextSibling ? "100%" : "50%" }}
            aria-hidden
          />
          <span className="absolute left-1/2 top-1/2 h-px w-1/2 -translate-y-1/2 bg-border-steel" aria-hidden />
        </div>
      )}
      <div className="min-w-0 flex-1 py-1">{children}</div>
    </div>
  );
}
