import type { ButtonHTMLAttributes, HTMLAttributes } from "react";

export function Card({ className = "", ...props }: HTMLAttributes<HTMLElement>) {
  return <section className={`rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-2)] p-5 ${className}`} {...props} />;
}

export function Button({ className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button className={`min-h-11 rounded-xl bg-[var(--orange-primary)] px-4 font-semibold text-[var(--on-orange)] disabled:opacity-50 ${className}`} {...props} />;
}

export function Chip({ selected = false, className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { selected?: boolean }) {
  return <button aria-pressed={selected} className={`min-h-9 rounded-full border px-3 text-sm ${selected ? "border-[var(--orange-primary)] bg-[var(--orange-soft)] text-[var(--orange-highlight)]" : "border-[var(--border-subtle)] bg-[var(--surface-3)]"} ${className}`} {...props} />;
}

export function Skeleton({ className = "" }: { className?: string }) { return <div aria-hidden="true" className={`animate-pulse rounded bg-[var(--surface-3)] ${className}`} />; }

export function EmptyState({ title, detail }: { title: string; detail: string }) {
  return <Card><h2 className="font-semibold">{title}</h2><p className="mt-1 text-sm text-[var(--text-secondary)]">{detail}</p></Card>;
}

export function Toast({ message }: { message: string }) { return <p role="status" className="rounded-xl bg-[var(--orange-soft)] p-3 text-sm text-[var(--orange-highlight)]">{message}</p>; }
