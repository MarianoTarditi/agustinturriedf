"use client";

import React, { createContext, useCallback, useContext, useRef, useState, useEffect } from "react";

export type ToastType = "success" | "error" | "info" | "warning";

export interface ToastOptions {
  duration?: number;
}

export interface ToastEntry {
  id: string;
  type: ToastType;
  message: string;
  duration: number;
}

interface ToastContextType {
  showToast: (type: ToastType, message: string, options?: ToastOptions) => void;
  dismissToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function useToast(): ToastContextType {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

interface ToastProviderProps {
  children: React.ReactNode;
}

const MAX_VISIBLE_TOASTS = 5;
const DEFAULT_DURATION = 5000;

interface ToastTimerData {
  timeoutId: ReturnType<typeof setTimeout>;
  remainingMs: number;
  startedAt: number;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [queue, setQueue] = useState<Map<string, ToastEntry>>(new Map());
  const [hoveredIds, setHoveredIds] = useState<Set<string>>(new Set());
  const timersRef = useRef<Map<string, ToastTimerData>>(new Map());

  const clearToastTimer = useCallback((id: string) => {
    const data = timersRef.current.get(id);
    if (data) {
      clearTimeout(data.timeoutId);
      timersRef.current.delete(id);
    }
  }, []);

  const startToastTimer = useCallback((id: string, duration: number) => {
    clearToastTimer(id);

    // Use a wrapper to track remaining time
    let remaining = duration;
    const startedAt = Date.now();

    const timeoutId = setTimeout(() => {
      setQueue((prev) => {
        const next = new Map(prev);
        next.delete(id);
        return next;
      });
      timersRef.current.delete(id);
    }, remaining);

    timersRef.current.set(id, { timeoutId, remainingMs: remaining, startedAt });
  }, [clearToastTimer]);

  const pauseTimer = useCallback((id: string) => {
    const data = timersRef.current.get(id);
    if (data) {
      clearTimeout(data.timeoutId);

      // Calculate actual remaining time based on how much has passed
      const elapsed = Date.now() - data.startedAt;
      const remaining = Math.max(0, data.remainingMs - elapsed);

      // Store remaining time separately
      timersRef.current.set(id, {
        ...data,
        timeoutId: undefined as unknown as ReturnType<typeof setTimeout>,
        remainingMs: remaining,
      });
    }

    setHoveredIds((prev) => new Set(prev).add(id));
  }, []);

  const resumeTimer = useCallback((id: string) => {
    setHoveredIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });

    const data = timersRef.current.get(id);
    if (!data || data.remainingMs <= 0) return;

    // Clear the paused timer data and create a new one with remaining time
    const remaining = data.remainingMs;

    const timeoutId = setTimeout(() => {
      setQueue((prev) => {
        const next = new Map(prev);
        next.delete(id);
        return next;
      });
      timersRef.current.delete(id);
    }, remaining);

    timersRef.current.set(id, {
      timeoutId,
      remainingMs: remaining,
      startedAt: Date.now(),
    });
  }, []);

  const showToast = useCallback((type: ToastType, message: string, options?: ToastOptions) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const duration = options?.duration ?? DEFAULT_DURATION;

    setQueue((prev) => {
      const next = new Map(prev);

      // Remove oldest if at capacity
      if (next.size >= MAX_VISIBLE_TOASTS) {
        const firstKey = next.keys().next().value;
        if (firstKey) {
          clearToastTimer(firstKey);
          next.delete(firstKey);
        }
      }

      next.set(id, { id, type, message, duration });
      return next;
    });

    startToastTimer(id, duration);
  }, [clearToastTimer, startToastTimer]);

  const dismissToast = useCallback((id: string) => {
    clearToastTimer(id);
    setQueue((prev) => {
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
  }, [clearToastTimer]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      timersRef.current.forEach((data) => {
        if (data.timeoutId) clearTimeout(data.timeoutId);
      });
      timersRef.current.clear();
    };
  }, []);

  const value: ToastContextType = { showToast, dismissToast };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer
        queue={queue}
        onDismiss={dismissToast}
        onMouseEnter={pauseTimer}
        onMouseLeave={resumeTimer}
        hoveredIds={hoveredIds}
      />
    </ToastContext.Provider>
  );
}

// ToastContainer component (internal)
export interface ToastContainerProps {
  queue: Map<string, ToastEntry>;
  onDismiss: (id: string) => void;
  onMouseEnter: (id: string) => void;
  onMouseLeave: (id: string) => void;
  hoveredIds: Set<string>;
}

function ToastContainer({ queue, onDismiss, onMouseEnter, onMouseLeave, hoveredIds }: ToastContainerProps) {
  const entries = Array.from(queue.values());

  if (entries.length === 0) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: "1rem",
        right: "1rem",
        zIndex: 100000,
        display: "flex",
        flexDirection: "column",
        gap: "0.75rem",
        pointerEvents: "none",
      }}
    >
      {entries.map((entry) => (
        <Toast
          key={entry.id}
          entry={entry}
          isPaused={hoveredIds.has(entry.id)}
          onDismiss={onDismiss}
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
        />
      ))}
    </div>
  );
}

// Toast component (internal)
interface ToastProps {
  entry: ToastEntry;
  isPaused: boolean;
  onDismiss: (id: string) => void;
  onMouseEnter: (id: string) => void;
  onMouseLeave: (id: string) => void;
}

function Toast({ entry, isPaused, onDismiss, onMouseEnter, onMouseLeave }: ToastProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => {
      setIsVisible(true);
    });
  }, []);

  const iconMap: Record<ToastType, string> = {
    success: "check_circle",
    error: "error",
    info: "info",
    warning: "warning",
  };

  return (
    <div
      className={`kinetic-toast kinetic-toast--${entry.type}`}
      style={{
        animation: isVisible && !isPaused
          ? `toastSlideInRight 300ms cubic-bezier(0.22, 1, 0.36, 1) forwards`
          : "none",
        pointerEvents: "auto",
      }}
      data-testid="kinetic-toast"
      onMouseEnter={() => onMouseEnter(entry.id)}
      onMouseLeave={() => onMouseLeave(entry.id)}
      onClick={() => onDismiss(entry.id)}
    >
      <span className="kinetic-toast__icon material-symbols-outlined">
        {iconMap[entry.type]}
      </span>
      <span className="kinetic-toast__message">{entry.message}</span>
      <button
        className="kinetic-toast__close"
        data-testid="kinetic-toast-close"
        onClick={(e) => {
          e.stopPropagation();
          onDismiss(entry.id);
        }}
        aria-label="Dismiss"
      >
        <span className="material-symbols-outlined" style={{ fontSize: "1rem" }}>
          close
        </span>
      </button>
      <div
        className="kinetic-toast__progress"
        data-testid="kinetic-toast-progress"
        style={{
          animationDuration: `${entry.duration}ms`,
          animationPlayState: isPaused ? "paused" : "running",
          animationTimingFunction: "linear",
          animationFillMode: "forwards",
        }}
      />
    </div>
  );
}