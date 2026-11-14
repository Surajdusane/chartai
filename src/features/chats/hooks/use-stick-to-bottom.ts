"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const THRESHOLD = 96;

export const useStickToBottom = (contentKey: string) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPinned, setIsPinned] = useState(true);
  const pinnedRef = useRef(true);

  const scrollToBottom = useCallback((arg?: ScrollBehavior | unknown) => {
    const behavior: ScrollBehavior =
      arg === "auto" || arg === "instant" || arg === "smooth" ? arg : "smooth";
    const element = containerRef.current;
    if (!element) return;
    element.scrollTo({ top: element.scrollHeight, behavior });
    pinnedRef.current = true;
    setIsPinned(true);
  }, []);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const onScroll = () => {
      const distance = element.scrollHeight - element.scrollTop - element.clientHeight;
      const pinned = distance <= THRESHOLD;
      pinnedRef.current = pinned;
      setIsPinned(pinned);
    };

    element.addEventListener("scroll", onScroll, { passive: true });
    return () => element.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!pinnedRef.current) return;
    const element = containerRef.current;
    if (!element) return;
    element.scrollTop = element.scrollHeight;
  }, [contentKey]);

  return { containerRef, isPinned, scrollToBottom };
};