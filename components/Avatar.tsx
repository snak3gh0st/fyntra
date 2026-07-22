const RANK_TONE: Record<string, string> = {
  DIRECTOR: "bg-teal text-paper",
  MANAGER: "bg-gold text-paper",
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
}

export function Avatar({ name, rank, size = "md" }: { name: string; rank?: string; size?: "sm" | "md" }) {
  const dims = size === "sm" ? "h-7 w-7 text-[11px]" : "h-8 w-8 text-xs";
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full font-semibold ${dims} ${
        rank ? (RANK_TONE[rank] ?? "border border-border-steel bg-panel text-ink-muted") : "bg-panel text-ink-muted"
      }`}
    >
      {initials(name)}
    </div>
  );
}
