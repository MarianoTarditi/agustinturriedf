"use client";

import { useEffect, useState } from "react";

type ToastType = "success" | "error" | "info" | "warning";

interface ToastEntry {
  id: string;
  type: ToastType;
  message: string;
  duration: number;
}

export function ToastIsland() {
  const [toasts, setToasts] = useState<ToastEntry[]>([]);

  useEffect(() => {
    const handler = (event: CustomEvent<{ type: ToastType; message: string; duration?: number }>) => {
      const { type, message, duration = 5000 } = event.detail;
      const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      setToasts((prev) => [...prev.slice(-4), { id, type, message, duration }]);
      
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    };

    window.addEventListener("kinetic-toast:show", handler as EventListener);
    return () => window.removeEventListener("kinetic-toast:show", handler as EventListener);
  }, []);

  if (toasts.length === 0) return null;

  const iconMap: Record<ToastType, string> = {
    success: "check_circle",
    error: "error",
    info: "info",
    warning: "warning",
  };

  return (
    <div
      role="status"
      aria-live="polite"
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
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`kinetic-toast kinetic-toast--${toast.type}`}
          style={{
            animation: "toastSlideInRight 300ms cubic-bezier(0.22, 1, 0.36, 1) forwards",
            pointerEvents: "auto",
          }}
        >
          <span className="kinetic-toast__icon material-symbols-outlined">
            {iconMap[toast.type]}
          </span>
          <span className="kinetic-toast__message">{toast.message}</span>
          <div
            className="kinetic-toast__progress"
            style={{
              animationDuration: `${toast.duration}ms`,
              animationTimingFunction: "linear",
              animationFillMode: "forwards",
            }}
          />
        </div>
      ))}
    </div>
  );
}