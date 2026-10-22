import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "../lib/format";
import { STATUS_LABELS, type OrderStatus } from "../lib/types";

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={cn("inline-block size-4 animate-spin rounded-full border-2 border-current border-t-transparent", className)}
      aria-hidden="true"
    />
  );
}

export function Field({
  label,
  htmlFor,
  error,
  hint,
  required,
  children,
  className,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="field-label">
        {label}
        {required ? <span className="ml-1 text-brand">*</span> : <span className="ml-1 font-normal text-ink/40">(optional)</span>}
      </label>
      {children}
      {hint && !error && <p className="mt-1.5 text-xs text-ink/50">{hint}</p>}
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

export function Input({ invalid, className, ...props }: InputProps) {
  return <input aria-invalid={invalid || undefined} className={cn("field-input", invalid && "border-brand ring-2 ring-brand/20", className)} {...props} />;
}

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

export function Textarea({ invalid, className, ...props }: TextareaProps) {
  return (
    <textarea aria-invalid={invalid || undefined} className={cn("field-input min-h-28 resize-y", invalid && "border-brand ring-2 ring-brand/20", className)} {...props} />
  );
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean;
}

export function Select({ invalid, className, children, ...props }: SelectProps) {
  return (
    <select
      aria-invalid={invalid || undefined}
      className={cn("field-input appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%23111%22 stroke-width=%222%22><path d=%22M6 9l6 6 6-6%22/></svg>')] bg-[length:18px_18px] bg-[right_0.75rem_center] bg-no-repeat pr-10", invalid && "border-brand ring-2 ring-brand/20", className)}
      {...props}
    >
      {children}
    </select>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton", className)} aria-hidden="true" />;
}

export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="card flex flex-col items-center gap-3 px-6 py-14 text-center">
      {icon && <div className="text-4xl opacity-60" aria-hidden="true">{icon}</div>}
      <h3 className="font-display text-lg font-bold">{title}</h3>
      {description && <p className="max-w-md text-sm text-ink/60">{description}</p>}
      {action}
    </div>
  );
}

const STATUS_STYLES: Record<OrderStatus, string> = {
  pending: "bg-amber-100 text-amber-800",
  confirmed: "bg-blue-100 text-blue-800",
  preparing: "bg-violet-100 text-violet-800",
  ready: "bg-cyan-100 text-cyan-800",
  dispatched: "bg-indigo-100 text-indigo-800",
  delivered: "bg-emerald-100 text-emerald-900",
  cancelled: "bg-ink/10 text-ink/70",
};

export function StatusBadge({ status, label }: { status: OrderStatus; label?: string }) {
  return <span className={cn("chip", STATUS_STYLES[status] ?? "bg-mist text-ink/70")}>{label ?? STATUS_LABELS[status]}</span>;
}

export function TbcBadge() {
  return <span className="chip bg-brand-soft text-brand-dark">Price to be confirmed</span>;
}
