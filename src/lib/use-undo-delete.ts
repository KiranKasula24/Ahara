"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Holds a delete for a few seconds so it can be undone. The caller removes the item from the screen
 * straight away; the delete is only sent when the time runs out, a new delete starts, or the screen closes.
 */
export function useUndoableDelete<T>(commit: (item: T) => Promise<void>, delayMs = 6000) {
  const [pending, setPending] = useState<T | null>(null);
  const pendingRef = useRef<T | null>(null);
  const timerRef = useRef<number | null>(null);
  const commitRef = useRef(commit);

  useEffect(() => {
    commitRef.current = commit;
  }, [commit]);

  const flush = useCallback(async () => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    const item = pendingRef.current;
    pendingRef.current = null;
    setPending(null);
    if (item !== null) await commitRef.current(item);
  }, []);

  const start = useCallback(
    (item: T) => {
      void flush();
      pendingRef.current = item;
      setPending(item);
      timerRef.current = window.setTimeout(() => {
        void flush();
      }, delayMs);
    },
    [flush, delayMs],
  );

  const undo = useCallback((): T | null => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    const item = pendingRef.current;
    pendingRef.current = null;
    setPending(null);
    return item;
  }, []);

  useEffect(() => () => {
    void flush();
  }, [flush]);

  return { pending, start, undo };
}
