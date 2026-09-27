"use client";

import React from "react";
import type { ToastEntry } from "./toast-provider";
import { Toast } from "./toast";
import styles from "./toast-container.module.css";

export interface ToastContainerProps {
  queue: Map<string, ToastEntry>;
  onDismiss: (id: string) => void;
  onMouseEnter: (id: string) => void;
  onMouseLeave: (id: string) => void;
  hoveredIds: Set<string>;
}

export function ToastContainer({ queue, onDismiss, onMouseEnter, onMouseLeave, hoveredIds }: ToastContainerProps) {
  const entries = Array.from(queue.values());

  if (entries.length === 0) return null;

  return (
    <div className={styles.container} role="status" aria-live="polite">
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