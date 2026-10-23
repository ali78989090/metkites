import { useState } from "react";
import { cn, PLACEHOLDER_IMAGE } from "../lib/format";

/**
 * The brand logo shipped with the project (`metrolahorekites.png`, white
 * background). Rendered with `object-contain` so the aspect ratio is never
 * distorted; a neutral placeholder takes over if the file is missing.
 */
export function Logo({ className = "h-10", dark = false }: { className?: string; dark?: boolean }) {
  return (
    <div className={cn("inline-flex items-center gap-2.5 select-none", className)}>
      <div className="relative flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#1b0b3b] via-[#09090b] to-[#120729] p-1.5 shadow-sm ring-1 ring-rose-500/30">
        {/* Diamond Kite SVG Emblem */}
        <svg viewBox="0 0 40 40" fill="none" className="size-full" aria-hidden="true">
          {/* Wings */}
          <polygon points="20,4 36,18 20,28" fill="#ffffff" />
          <polygon points="20,4 4,18 20,28" fill="#e11d48" />
          {/* Arch */}
          <path d="M 4 18 Q 20 8, 36 18" stroke="#f43f5e" strokeWidth="1.6" fill="none" opacity="0.95" />
          {/* Spine */}
          <line x1="20" y1="4" x2="20" y2="28" stroke="#09090b" strokeWidth="1.5" />
          {/* Tail */}
          <polygon points="20,28 16,35 24,35" fill="#e11d48" />
          {/* Thread */}
          <path d="M 20 28 Q 14 34, 18 38" stroke="#ffffff" strokeWidth="1" strokeDasharray="2 1" />
        </svg>
      </div>
      <div className="flex flex-col text-left leading-none">
        <span className={cn("font-display text-base font-black tracking-tight sm:text-lg", dark ? "text-white" : "text-zinc-950")}>
          Metro Lahore <span className="text-rose-600">Kites</span>
        </span>
        <span className="mt-0.5 font-sans text-[10px] font-bold tracking-wider text-rose-600/90 dark:text-rose-400">
          لاہور بسنت 2026 · FESTIVAL HERITAGE
        </span>
      </div>
    </div>
  );
}

export function ProductImage({
  src,
  alt,
  className,
  imgClassName,
}: {
  src?: string | null;
  alt: string;
  className?: string;
  imgClassName?: string;
}) {
  const [failed, setFailed] = useState(false);
  const resolved = failed || !src ? PLACEHOLDER_IMAGE : src;
  return (
    <div className={cn("overflow-hidden", className)}>
      <img
        src={resolved}
        alt={alt}
        loading="lazy"
        decoding="async"
        onError={() => setFailed(true)}
        className={cn("size-full object-cover transition-transform duration-500 group-hover:scale-[1.04]", imgClassName)}
      />
    </div>
  );
}
