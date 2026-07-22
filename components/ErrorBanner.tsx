export function ErrorBanner({ children }: { children: React.ReactNode }) {
  return (
    <p
      role="alert"
      className="mt-4 rounded-lg border border-danger/20 bg-danger-pale px-4 py-3 text-sm leading-6 text-danger"
    >
      {children}
    </p>
  );
}
