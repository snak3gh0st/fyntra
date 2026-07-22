import { InputHTMLAttributes, SelectHTMLAttributes } from "react";

const inputClass =
  "min-h-10 rounded-md border border-border-steel bg-paper px-3 py-2.5 text-sm text-ink outline-none transition-[border-color,box-shadow,background-color] duration-150 hover:border-ink-muted focus-visible:border-teal focus-visible:ring-[3px] focus-visible:ring-teal-pale disabled:cursor-not-allowed disabled:bg-panel disabled:text-ink-muted";

export function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-semibold text-ink-muted">
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
