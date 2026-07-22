export function PageTitle({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <h1
      className={`text-[1.875rem] font-semibold leading-[1.15] tracking-[-0.025em] text-ink text-balance ${className}`}
    >
      {children}
    </h1>
  );
}
