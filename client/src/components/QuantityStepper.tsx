import { cn } from "../lib/format";

export function QuantityStepper({
  value,
  onChange,
  min = 1,
  max = 500,
  size = "md",
  label = "Quantity",
}: {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  size?: "sm" | "md";
  label?: string;
}) {
  const buttonSize = size === "sm" ? "size-7 text-sm" : "size-9 text-base";
  return (
    <div className="inline-flex items-center rounded-lg border border-ink/15 bg-white" role="group" aria-label={label}>
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        className={cn("rounded-l-lg font-bold text-ink/70 hover:bg-mist disabled:opacity-30", buttonSize)}
        aria-label={`Decrease ${label.toLowerCase()}`}
      >
        −
      </button>
      <span className={cn("min-w-9 text-center font-semibold tabular-nums", size === "sm" ? "text-sm" : "text-base")} aria-live="polite">
        {value}
      </span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        className={cn("rounded-r-lg font-bold text-ink/70 hover:bg-mist disabled:opacity-30", buttonSize)}
        aria-label={`Increase ${label.toLowerCase()}`}
      >
        +
      </button>
    </div>
  );
}
