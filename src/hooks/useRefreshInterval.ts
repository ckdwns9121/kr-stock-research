"use client";

import { useEffect, useRef } from "react";

export function useRefreshInterval(callback: () => void, intervalMs: number) {
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    const id = setInterval(() => {
      callbackRef.current();
    }, intervalMs);

    return () => clearInterval(id);
  }, [intervalMs]);
}
