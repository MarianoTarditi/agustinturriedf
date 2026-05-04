import { useEffect, useMemo, useRef, useState } from "react";

interface LoaderEntry {
  text?: string;
  progress?: number;
}

export default function AstroGlobalLoader() {
  const [queue, setQueue] = useState<Map<string, LoaderEntry>>(new Map());
  const [isVisible, setIsVisible] = useState(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handleShow = (e: Event) => {
      const detail = (e as CustomEvent<{ id: string; text?: string; progress?: number }>).detail;
      setQueue((prev) => {
        const next = new Map(prev);
        next.set(detail.id, { text: detail.text, progress: detail.progress });
        return next;
      });

      if (debounceTimerRef.current !== null) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
        setIsVisible(true);
        debounceTimerRef.current = null;
      }, 300);
    };

    const handleHide = (e: Event) => {
      const detail = (e as CustomEvent<{ id: string }>).detail;

      // CRITICAL: Clear the debounce timer to prevent stale callback
      // from calling setIsVisible(true) after we've already hidden the loader
      if (debounceTimerRef.current !== null) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }

      setQueue((prev) => {
        const next = new Map(prev);
        next.delete(detail.id);
        return next;
      });

      // Check if queue is now empty - hide immediately
      setTimeout(() => {
        setQueue((current) => {
          if (current.size === 0) {
            setIsVisible(false);
          }
          return current;
        });
      }, 0);
    };

    const handleUpdate = (e: Event) => {
      const detail = (e as CustomEvent<{ id: string; progress: number }>).detail;
      setQueue((prev) => {
        const next = new Map(prev);
        const existing = next.get(detail.id);
        next.set(detail.id, { ...existing, progress: detail.progress });
        return next;
      });
    };

    window.addEventListener("global-loader:show", handleShow);
    window.addEventListener("global-loader:hide", handleHide);
    window.addEventListener("global-loader:update", handleUpdate);

    return () => {
      window.removeEventListener("global-loader:show", handleShow);
      window.removeEventListener("global-loader:hide", handleHide);
      window.removeEventListener("global-loader:update", handleUpdate);
    };
  }, []);

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
    "global-loader-overlay",
    reducedMotion ? "" : "global-loader-enter",
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
        <div className="global-loader-content" data-testid="global-loader-content">
          <div className="global-loader-progress-bar" data-testid="global-loader-progress-bar">
            <div
              className="global-loader-progress-fill"
              style={{ width: `${averageProgress}%` }}
              data-testid="global-loader-progress-fill"
            />
          </div>
          {displayText ? (
            <p className="global-loader-text" data-testid="global-loader-text">{displayText}</p>
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
      <div className="global-loader-content" data-testid="global-loader-content">
        <div className={`global-loader-spinner ${reducedMotion ? "" : "global-loader-spinner-animate"}`} data-testid="global-loader-spinner" />
        {displayText ? (
          <p className="global-loader-text" data-testid="global-loader-text">{displayText}</p>
        ) : null}
      </div>
    </div>
  );
}
