import React from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const MODE_COLORS = {
  performance: "text-[#00F5A0] bg-[#00F5A0]/10 border-[#00F5A0]/20",
  normal: "text-[#00D9FF] bg-[#00D9FF]/10 border-[#00D9FF]/20",
  adapt: "text-[#FFB800] bg-[#FFB800]/10 border-[#FFB800]/20",
  recovery: "text-[#7B61FF] bg-[#7B61FF]/10 border-[#7B61FF]/20",
};

interface ModeBadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  mode: string;
}

export function ModeBadge({ mode, className, ...props }: ModeBadgeProps) {
  const normalizedMode = mode?.toLowerCase() as keyof typeof MODE_COLORS;
  const colorClass = MODE_COLORS[normalizedMode] || "text-muted-foreground bg-muted border-border";

  return (
    <div
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        colorClass,
        className
      )}
      {...props}
    >
      {mode?.toUpperCase()}
    </div>
  );
}
