import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, act, screen } from "@testing-library/react";
import React from "react";
import { LoadingProvider } from "./loading-provider";
import { useLoading } from "./use-loading";

// Test component that uses the hook
function TestHookConsumer() {
  const { showLoader, hideLoader, updateProgress } = useLoading();

  return (
    <div>
      <button data-testid="show" onClick={() => showLoader("op1", { text: "Cargando..." })}>
        Show
      </button>
      <button data-testid="show-progress" onClick={() => showLoader("op2", { text: "Subiendo...", progress: 0 })}>
        Show Progress
      </button>
      <button data-testid="hide" onClick={() => hideLoader("op1")}>
        Hide
      </button>
      <button data-testid="update" onClick={() => updateProgress("op2", 50)}>
        Update Progress
      </button>
    </div>
  );
}

describe("useLoading hook", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns context functions when used within provider", async () => {
    render(
      <LoadingProvider>
        <TestHookConsumer />
      </LoadingProvider>
    );

    const showButton = screen.getByTestId("show");

    act(() => {
      showButton.click();
    });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    // If we get here without throwing, the hook returned context functions
    const overlay = screen.queryByTestId("global-loader-overlay");
    expect(overlay).toBeInTheDocument();
  });

  it("throws when used outside provider", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => {
      render(<TestHookConsumer />);
    }).toThrow("useLoading must be used within a LoadingProvider");

    consoleSpy.mockRestore();
  });

  it("showLoader triggers loader visibility", async () => {
    render(
      <LoadingProvider>
        <TestHookConsumer />
      </LoadingProvider>
    );

    const showButton = screen.getByTestId("show");

    act(() => {
      showButton.click();
    });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    const overlay = screen.queryByTestId("global-loader-overlay");
    expect(overlay).toBeInTheDocument();
  });

  it("hideLoader removes loader from queue", async () => {
    render(
      <LoadingProvider>
        <TestHookConsumer />
      </LoadingProvider>
    );

    const showButton = screen.getByTestId("show");
    const hideButton = screen.getByTestId("hide");

    act(() => {
      showButton.click();
    });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    let overlay = screen.queryByTestId("global-loader-overlay");
    expect(overlay).toBeInTheDocument();

    act(() => {
      hideButton.click();
    });

    act(() => {
      vi.advanceTimersByTime(10);
    });

    overlay = screen.queryByTestId("global-loader-overlay");
    expect(overlay).not.toBeInTheDocument();
  });

  it("updateProgress updates the progress value in queue", async () => {
    render(
      <LoadingProvider>
        <TestHookConsumer />
      </LoadingProvider>
    );

    const showProgressButton = screen.getByTestId("show-progress");
    const updateButton = screen.getByTestId("update");

    act(() => {
      showProgressButton.click();
    });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    act(() => {
      updateButton.click();
    });

    const progressFill = screen.queryByTestId("global-loader-progress-fill");
    expect(progressFill).toBeInTheDocument();
  });
});
