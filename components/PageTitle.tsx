export function PageTitle({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <h1
      className={`text-[clamp(1.5rem,2vw,1.875rem)] font-semibold leading-[1.15] tracking-[-0.01em] text-ink ${className}`}
    >
      {children}
    </h1>
  );
}
