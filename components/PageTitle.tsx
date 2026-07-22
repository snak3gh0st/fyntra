export function PageTitle({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <h1
      className={`text-[1.75rem] font-semibold leading-[1.15] tracking-[-0.02em] text-ink ${className}`}
    >
      {children}
    </h1>
  );
}
