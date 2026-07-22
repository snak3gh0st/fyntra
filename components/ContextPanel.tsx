export function ContextPanel({
  eyebrow,
  title,
  children,
}: {
  eyebrow?: string
  title: string
  children: React.ReactNode
}) {
  return (
    <aside className="h-fit rounded-md border border-border-steel bg-rail px-5 py-5 text-paper">
      {eyebrow && <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-paper/45">{eyebrow}</p>}
      <h2 className="mt-2 text-base font-semibold tracking-[-0.01em]">{title}</h2>
      <div className="mt-4 text-sm leading-6 text-paper/65">{children}</div>
    </aside>
  )
}
