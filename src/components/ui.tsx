import type { ButtonHTMLAttributes, HTMLAttributes } from "react";

export function Card({ className = "", ...props }: HTMLAttributes<HTMLElement>) {
  return <section className={`rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-2)] p-5 ${className}`} {...props} />;
}

export function Button({ className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button className={`min-h-11 rounded-xl bg-[var(--orange-primary)] px-4 font-semibold text-[var(--on-orange)] disabled:opacity-50 ${className}`} {...props} />;
}
