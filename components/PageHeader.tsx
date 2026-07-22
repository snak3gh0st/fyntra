import { PageTitle } from '@/components/PageTitle'

export function PageHeader({
  title,
  eyebrow,
  description,
  children,
}: {
  title: string
  eyebrow?: string
  description?: React.ReactNode
  children?: React.ReactNode
}) {
  return (
    <header className="flex flex-col gap-5 border-b border-border-steel pb-8 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && <p className="inline-flex w-fit items-center gap-2 rounded-full bg-teal-pale px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-teal">{eyebrow}</p>}
        <PageTitle className={eyebrow ? 'mt-2' : ''}>{title}</PageTitle>
        {description && <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-muted">{description}</p>}
      </div>
      {children && <div className="shrink-0">{children}</div>}
    </header>
  )
}
