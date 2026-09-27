import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, act, screen, cleanup } from "@testing-library/react";
import React from "react";
import { ToastProvider, useToast } from "./toast-provider";

function ToastTestConsumer() {
  const { showToast, dismissToast } = useToast();

  return (
    <div>
      <button data-testid="show-success" onClick={() => showToast("success", "Success message")}>
        Show Success
      </button>
      <button data-testid="show-error" onClick={() => showToast("error", "Error message")}>
        Show Error
      </button>
      <button data-testid="show-info" onClick={() => showToast("info", "Info message")}>
        Show Info
      </button>
      <button data-testid="show-warning" onClick={() => showToast("warning", "Warning message")}>
        Show Warning
      </button>
      <button data-testid="dismiss" onClick={() => dismissToast("test-id")}>
        Dismiss
      </button>
    </div>
  );
}

describe("useToast", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });

  it("throws when useToast is used outside ToastProvider", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => {
      render(<ToastTestConsumer />);
    }).toThrow("useToast must be used within a ToastProvider");

    consoleSpy.mockRestore();
  });

  it("returns showToast and dismissToast functions when inside provider", () => {
    render(
      <ToastProvider>
        <ToastTestConsumer />
      </ToastProvider>
    );

    const showButton = screen.getByTestId("show-success");
    expect(showButton).toBeInTheDocument();
  });

  it("showToast renders a toast with correct type and message", () => {
    render(
      <ToastProvider>
        <ToastTestConsumer />
      </ToastProvider>
    );

    const showButton = screen.getByTestId("show-success");

    act(() => {
      showButton.click();
    });

    const toast = screen.getByTestId("kinetic-toast");
    expect(toast).toBeInTheDocument();
    expect(toast).toHaveClass("kinetic-toast--success");
    expect(screen.getByText("Success message")).toBeInTheDocument();
  });

  it("dismissToast removes the toast", () => {
    render(
      <ToastProvider>
        <ToastTestConsumer />
      </ToastProvider>
    );

    const showButton = screen.getByTestId("show-success");

    act(() => {
      showButton.click();
    });

    let toast = screen.getByTestId("kinetic-toast");
    expect(toast).toBeInTheDocument();

    const closeButton = screen.getByTestId("kinetic-toast-close");

    act(() => {
      closeButton.click();
    });

    expect(screen.queryByTestId("kinetic-toast")).not.toBeInTheDocument();
  });
});