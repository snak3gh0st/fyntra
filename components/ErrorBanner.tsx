export function ErrorBanner({ children }: { children: React.ReactNode }) {
  return (
    <p
      role="alert"
      className="mt-4 rounded-md bg-danger-pale px-3 py-2.5 text-sm text-danger"
    >
      {children}
    </p>
  );
}
