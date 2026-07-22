import { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "danger";

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-teal text-paper hover:bg-teal-deep active:translate-y-px focus-visible:ring-teal-pale",
  secondary:
    "bg-paper text-ink border border-border-steel hover:border-teal hover:bg-teal-pale/40 active:translate-y-px focus-visible:ring-teal-pale",
  danger:
    "bg-danger text-paper hover:brightness-95 active:translate-y-px focus-visible:ring-danger-pale",
};

export function Button({
  variant = "secondary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-semibold transition-[background-color,border-color,color,transform] duration-150 focus-visible:outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 ${variantClasses[variant]} ${className}`}
      {...props}
    />
  );
}
