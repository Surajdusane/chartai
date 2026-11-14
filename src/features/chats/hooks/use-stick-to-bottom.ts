"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const THRESHOLD = 96;

export const useStickToBottom = (contentKey: string) => {
  const containerElRef = useRef<HTMLDivElement | null>(null);
  const contentElRef = useRef<HTMLDivElement | null>(null);
  const pinnedRef = useRef(true);
  // Bumped whenever the observed elements mount, so the effects below attach even
  // when the thread starts on the empty state and only mounts its scroller later.
  const [attachCount, setAttachCount] = useState(0);
  const [isPinned, setIsPinned] = useState(true);

  const containerRef = useCallback((node: HTMLDivElement | null) => {
    containerElRef.current = node;
    setAttachCount((count) => count + 1);
  }, []);

  const contentRef = useCallback((node: HTMLDivElement | null) => {
    contentElRef.current = node;
    setAttachCount((count) => count + 1);
  }, []);

  const scrollToBottom = useCallback((arg?: ScrollBehavior | unknown) => {
    const behavior: ScrollBehavior =
      arg === "auto" || arg === "instant" || arg === "smooth" ? arg : "smooth";
    const element = containerElRef.current;
    if (!element) return;
    element.scrollTo({ top: element.scrollHeight, behavior });
    pinnedRef.current = true;
    setIsPinned(true);
  }, []);

  useEffect(() => {
    const element = containerElRef.current;
    if (!element) return;

    const onScroll = () => {
      const distance = element.scrollHeight - element.scrollTop - element.clientHeight;
      const pinned = distance <= THRESHOLD;
      pinnedRef.current = pinned;
      setIsPinned(pinned);
    };

    element.addEventListener("scroll", onScroll, { passive: true });
    return () => element.removeEventListener("scroll", onScroll);
  }, [attachCount]);

  useEffect(() => {
    const element = containerElRef.current;
    if (!element || !pinnedRef.current) return;
    element.scrollTop = element.scrollHeight;
  }, [attachCount, contentKey]);

  // Charts and tables mount after their tool part resolves, so the content grows
  // without the message-part count changing. Re-pin while the user is still pinned.
  useEffect(() => {
    const content = contentElRef.current;
    const element = containerElRef.current;
    if (!content || !element || typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver(() => {
      if (!pinnedRef.current) return;
      const scroller = containerElRef.current;
      if (scroller) scroller.scrollTop = scroller.scrollHeight;
    });

    observer.observe(content);
    return () => observer.disconnect();
  }, [attachCount]);

  return { containerRef, contentRef, isPinned, scrollToBottom };
};