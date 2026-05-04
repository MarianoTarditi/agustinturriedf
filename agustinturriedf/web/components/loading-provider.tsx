"use client";

import React, { createContext, useCallback, useContext, useRef, useState } from "react";
import { GlobalLoader } from "./global-loader";

export type LoaderOptions = { text?: string; progress?: number };

interface LoadingContextType {
  showLoader: (id: string, options?: LoaderOptions) => void;
  hideLoader: (id: string) => void;
  updateProgress: (id: string, progress: number) => void;
}

const LoadingContext = createContext<LoadingContextType | null>(null);

export function useLoading(): LoadingContextType {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error("useLoading must be used within a LoadingProvider");
  }
  return context;
}

interface LoadingProviderProps {
  children: React.ReactNode;
}

export function LoadingProvider({ children }: LoadingProviderProps) {
  const [queue, setQueue] = useState<Map<string, LoaderOptions>>(new Map());
  const [isVisible, setIsVisible] = useState(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showLoader = useCallback((id: string, options?: LoaderOptions) => {
    setQueue((prev) => {
      const next = new Map(prev);
      next.set(id, options ?? {});
      return next;
    });

    if (debounceTimerRef.current !== null) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      setIsVisible(true);
      debounceTimerRef.current = null;
    }, 300);
  }, []);

  const hideLoader = useCallback((id: string) => {
    setQueue((prev) => {
      const next = new Map(prev);
      next.delete(id);
      if (next.size === 0) {
        if (debounceTimerRef.current !== null) {
          clearTimeout(debounceTimerRef.current);
          debounceTimerRef.current = null;
        }
        setIsVisible(false);
      }
      return next;
    });
  }, []);

  const updateProgress = useCallback((id: string, progress: number) => {
    setQueue((prev) => {
      const next = new Map(prev);
      const existing = next.get(id);
      next.set(id, { ...existing, progress });
      return next;
    });
  }, []);

  const value: LoadingContextType = { showLoader, hideLoader, updateProgress };

  return (
    <LoadingContext.Provider value={value}>
      {children}
      <GlobalLoader queue={queue} isVisible={isVisible} />
    </LoadingContext.Provider>
  );
}
