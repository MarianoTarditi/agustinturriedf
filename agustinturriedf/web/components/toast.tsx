"use client";

import React, { useState, useEffect } from "react";
import type { ToastType, ToastEntry } from "./toast-provider";

export interface ToastProps {
  entry: ToastEntry;
  isPaused: boolean;
  onDismiss: (id: string) => void;
  onMouseEnter: (id: string) => void;
  onMouseLeave: (id: string) => void;
}

export function Toast({ entry, isPaused, onDismiss, onMouseEnter, onMouseLeave }: ToastProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mediaQuery.matches);

    const listener = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };
    mediaQuery.addEventListener("change", listener);
    return () => mediaQuery.removeEventListener("change", listener);
  }, []);

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

  const shouldAnimate = isVisible && !isPaused && !prefersReducedMotion;

  return (
    <div
      className={`kinetic-toast kinetic-toast--${entry.type}`}
      style={{
        animation: shouldAnimate
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