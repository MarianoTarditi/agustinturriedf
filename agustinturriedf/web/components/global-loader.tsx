import React, { useMemo } from "react";
import styles from "./global-loader.module.css";

export type LoaderOptions = { text?: string; progress?: number };

interface GlobalLoaderProps {
  queue: Map<string, LoaderOptions>;
  isVisible: boolean;
}

export function GlobalLoader({ queue, isVisible }: GlobalLoaderProps) {
  if (!isVisible) return null;

  const entries = Array.from(queue.values());
  const hasProgress = entries.some((e) => typeof e.progress === "number");

  const averageProgress = useMemo(() => {
    const progressEntries = entries.filter((e) => typeof e.progress === "number");
    if (progressEntries.length === 0) return 0;
    return progressEntries.reduce((sum, e) => sum + (e.progress ?? 0), 0) / progressEntries.length;
  }, [entries]);

  const displayText = entries.map((e) => e.text).find(Boolean) ?? null;

  const reducedMotion = typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  const overlayClass = [
    styles.overlay,
    reducedMotion ? "" : styles.enter,
  ].filter(Boolean).join(" ");

  if (hasProgress) {
    return (
      <div
        className={overlayClass}
        role="status"
        aria-live="polite"
        aria-label="Cargando"
        data-testid="global-loader-overlay"
      >
        <div className={styles.content} data-testid="global-loader-content">
          <div className={styles.progressBar} data-testid="global-loader-progress-bar">
            <div
              className={styles.progressFill}
              style={{ width: `${averageProgress}%` }}
              data-testid="global-loader-progress-fill"
            />
          </div>
          {displayText ? (
            <p className={styles.text} data-testid="global-loader-text">{displayText}</p>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div
      className={overlayClass}
      role="status"
      aria-live="polite"
      aria-label="Cargando"
      data-testid="global-loader-overlay"
    >
      <div className={styles.content} data-testid="global-loader-content">
        <div className={`${styles.spinner} ${reducedMotion ? "" : styles.spinnerAnimate}`} data-testid="global-loader-spinner" />
        {displayText ? (
          <p className={styles.text} data-testid="global-loader-text">{displayText}</p>
        ) : null}
      </div>
    </div>
  );
}
