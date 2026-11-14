"use client";

import { ArrowDownIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

export function JumpToLatest({ onClick }: { onClick: () => void }) {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center">
      <Button variant="secondary" size="sm" className="pointer-events-auto shadow-md" onClick={onClick}>
        <ArrowDownIcon />
        Jump to latest
      </Button>
    </div>
  );
}