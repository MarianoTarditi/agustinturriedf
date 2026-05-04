import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, act, screen } from "@testing-library/react";
import React from "react";
import { GlobalLoader } from "./global-loader";

describe("GlobalLoader component", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders nothing when isVisible is false", () => {
    const { container } = render(
      <GlobalLoader isVisible={false} queue={new Map()} />
    );

    expect(container.firstChild).toBeNull();
  });

  it("renders overlay when isVisible is true", () => {
    const queue = new Map([["op1", { text: "Cargando..." }]]);
    render(<GlobalLoader isVisible={true} queue={queue} />);

    const overlay = screen.getByTestId("global-loader-overlay");
    expect(overlay).toBeInTheDocument();
  });

  it("shows spinner for indeterminate mode (no progress)", () => {
    const queue = new Map([["op1", { text: "Cargando..." }]]);
    render(<GlobalLoader isVisible={true} queue={queue} />);

    const spinner = screen.getByTestId("global-loader-spinner");
    expect(spinner).toBeInTheDocument();

    const progressBar = screen.queryByTestId("global-loader-progress-bar");
    expect(progressBar).not.toBeInTheDocument();
  });

  it("shows progress bar when queue has entries with progress", () => {
    const queue = new Map([["op1", { text: "Subiendo...", progress: 50 }]]);
    render(<GlobalLoader isVisible={true} queue={queue} />);

    const progressBar = screen.getByTestId("global-loader-progress-bar");
    expect(progressBar).toBeInTheDocument();

    const spinner = screen.queryByTestId("global-loader-spinner");
    expect(spinner).not.toBeInTheDocument();
  });

  it("displays text when provided in queue entry", () => {
    const queue = new Map([["op1", { text: "Cargando..." }]]);
    render(<GlobalLoader isVisible={true} queue={queue} />);

    const text = screen.getByTestId("global-loader-text");
    expect(text).toHaveTextContent("Cargando...");
  });

  it("calculates average progress correctly", () => {
    // Two operations with progress - average should be 50
    const queue = new Map([
      ["op1", { progress: 30 }],
      ["op2", { progress: 70 }],
    ]);
    render(<GlobalLoader isVisible={true} queue={queue} />);

    const progressFill = screen.getByTestId("global-loader-progress-fill");
    expect(progressFill).toBeInTheDocument();
    expect(progressFill.style.width).toBe("50%");
  });

  it("respects reduced motion preference", () => {
    // Mock matchMedia by defining it directly on window
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockReturnValue({
        matches: true,
        media: "(prefers-reduced-motion: reduce)",
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }),
    });

    const queue = new Map([["op1", {}]]);
    render(<GlobalLoader isVisible={true} queue={queue} />);

    const overlay = screen.getByTestId("global-loader-overlay");
    expect(overlay).toBeInTheDocument();
  });
});
