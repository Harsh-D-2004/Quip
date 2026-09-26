import type { ReactNode } from "react";

/**
 * Draws the window chrome the screenshots had cropped off.
 *
 * The raw grabs carried an Ubuntu title bar and a File/Edit/View menu strip,
 * which made the site look like a folder of desktop captures. Cropping those out
 * and re-framing every shot identically here means they read as one product
 * instead of six separate screenshots.
 */
export default function AppFrame({
  children,
  title = "Quip",
  className = "",
}: {
  children: ReactNode;
  title?: string;
  className?: string;
}) {
  return (
    <div className={`overflow-hidden rounded-xl border border-border bg-card shadow-card ${className}`}>
      <div className="flex items-center gap-2 border-b border-border bg-[hsl(0_0%_9%)] px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
        <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
        <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
        <span className="ml-2 font-mono text-[11px] text-muted-foreground">{title}</span>
      </div>
      {children}
    </div>
  );
}
