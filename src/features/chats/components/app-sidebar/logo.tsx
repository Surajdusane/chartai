import Image from "next/image";

import { cn } from "@/lib/utils";

export function Logo({ className, size = 32 }: { className?: string; size?: number }) {
  return (
    <span
      className={cn(
        "bg-background flex shrink-0 items-center justify-center overflow-hidden rounded-lg",
        className,
      )}
      style={{ width: size, height: size }}
    >
      <Image
        src="/web-app-manifest-192x192.png"
        alt="Chart AI"
        width={192}
        height={192}
        className="size-full object-contain"
      />
    </span>
  );
}