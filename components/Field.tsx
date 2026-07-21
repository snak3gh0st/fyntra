import { InputHTMLAttributes, SelectHTMLAttributes } from "react";

const inputClass =
  "rounded-md border border-border-steel bg-paper px-3 py-2.5 text-sm text-ink outline-none transition-colors duration-150 focus:border-teal focus:ring-[3px] focus:ring-teal-pale";

export function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-semibold tracking-wide text-ink-muted">
        {label}
      </span>
      {children}
    </label>
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={inputClass} {...props} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={inputClass} {...props} />;
}
