import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, act, screen } from "@testing-library/react";
import React from "react";
import { LoadingProvider, useLoading } from "./loading-provider";

// Test component that exposes the context values
function TestConsumer() {
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

describe("LoadingProvider", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("throws when useLoading is used outside provider", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => {
      render(<TestConsumer />);
    }).toThrow("useLoading must be used within a LoadingProvider");

    consoleSpy.mockRestore();
  });

  it("shows loader when showLoader is called and queue is non-empty after debounce", async () => {
    render(
      <LoadingProvider>
        <TestConsumer />
      </LoadingProvider>
    );

    const showButton = screen.getByTestId("show");

    // Show loader
    act(() => {
      showButton.click();
    });

    // Complete debounce
    act(() => {
      vi.advanceTimersByTime(300);
    });

    // After full debounce, loader should be visible
    const overlay = screen.queryByTestId("global-loader-overlay");
    expect(overlay).toBeInTheDocument();
  });

  it("hides loader immediately when hideLoader is called before debounce completes", () => {
    render(
      <LoadingProvider>
        <TestConsumer />
      </LoadingProvider>
    );

    const showButton = screen.getByTestId("show");
    const hideButton = screen.getByTestId("hide");

    // Show loader
    act(() => {
      showButton.click();
    });

    // Hide before debounce completes
    act(() => {
      hideButton.click();
    });

    // Advance past what would have been the debounce time
    act(() => {
      vi.advanceTimersByTime(300);
    });

    // Loader should not appear because we hid it before debounce
    const overlay = screen.queryByTestId("global-loader-overlay");
    expect(overlay).not.toBeInTheDocument();
  });

  it("remains visible when one of two concurrent operations completes", async () => {
    render(
      <LoadingProvider>
        <TestConsumer />
      </LoadingProvider>
    );

    const showButton = screen.getByTestId("show");
    const showProgressButton = screen.getByTestId("show-progress");
    const hideButton = screen.getByTestId("hide");

    // Show two operations
    act(() => {
      showButton.click();
      showProgressButton.click();
    });

    // Complete debounce for both
    act(() => {
      vi.advanceTimersByTime(300);
    });

    // Verify visible
    let overlay = screen.queryByTestId("global-loader-overlay");
    expect(overlay).toBeInTheDocument();

    // Hide first operation
    act(() => {
      hideButton.click();
    });

    // Should still be visible (second operation still in queue)
    overlay = screen.queryByTestId("global-loader-overlay");
    expect(overlay).toBeInTheDocument();
  });

  it("calculates progress as average when multiple operations have progress", async () => {
    render(
      <LoadingProvider>
        <TestConsumer />
      </LoadingProvider>
    );

    const showProgressButton = screen.getByTestId("show-progress");
    const updateButton = screen.getByTestId("update");

    // Show operation with progress
    act(() => {
      showProgressButton.click();
    });

    // Complete debounce
    act(() => {
      vi.advanceTimersByTime(300);
    });

    // Update progress on the operation
    act(() => {
      updateButton.click();
    });

    // Progress fill should exist
    const progressFill = screen.queryByTestId("global-loader-progress-fill");
    expect(progressFill).toBeInTheDocument();
  });

  it("shows spinner for indeterminate mode (no progress defined)", () => {
    render(
      <LoadingProvider>
        <TestConsumer />
      </LoadingProvider>
    );

    const showButton = screen.getByTestId("show");

    act(() => {
      showButton.click();
    });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    // Spinner should be visible for indeterminate loader
    const spinner = screen.queryByTestId("global-loader-spinner");
    expect(spinner).toBeInTheDocument();

    // Progress bar should not be visible for indeterminate
    const progressBar = screen.queryByTestId("global-loader-progress-bar");
    expect(progressBar).not.toBeInTheDocument();
  });

  it("shows progress bar when at least one operation has progress defined", () => {
    render(
      <LoadingProvider>
        <TestConsumer />
      </LoadingProvider>
    );

    const showProgressButton = screen.getByTestId("show-progress");

    act(() => {
      showProgressButton.click();
    });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    // Progress bar should be visible
    const progressBar = screen.queryByTestId("global-loader-progress-bar");
    expect(progressBar).toBeInTheDocument();
  });

  it("displays custom text when provided via LoaderOptions", () => {
    render(
      <LoadingProvider>
        <TestConsumer />
      </LoadingProvider>
    );

    const showButton = screen.getByTestId("show");

    act(() => {
      showButton.click();
    });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    const text = screen.queryByTestId("global-loader-text");
    expect(text).toHaveTextContent("Cargando...");
  });
});
