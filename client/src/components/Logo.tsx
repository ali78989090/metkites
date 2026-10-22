import { useState } from "react";
import { cn, PLACEHOLDER_IMAGE } from "../lib/format";

/**
 * The brand logo shipped with the project (`metrolahorekites.png`, white
 * background). Rendered with `object-contain` so the aspect ratio is never
 * distorted; a neutral placeholder takes over if the file is missing.
 */
export function Logo({ className = "h-10", dark = false }: { className?: string; dark?: boolean }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <span className={cn("font-display text-lg font-black tracking-tight", dark ? "text-white" : "text-ink")}>
        Metro Lahore Kites
      </span>
    );
  }
  return (
    <img
      src="/img/logo/metrolahorekites.png"
      alt="Metro Lahore Kites"
      width={512}
      height={512}
      loading="eager"
      decoding="async"
      onError={() => setFailed(true)}
      className={cn("w-auto object-contain", className)}
    />
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
