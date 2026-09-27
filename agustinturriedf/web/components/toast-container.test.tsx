import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import React from "react";
import { ToastContainer, ToastContainerProps } from "./toast-container";
import type { ToastEntry } from "./toast-provider";

function createMockEntry(
  id: string,
  type: ToastEntry["type"] = "success",
  message = "Test message"
): ToastEntry {
  return {
    id,
    type,
    message,
    duration: 5000,
  };
}

describe("ToastContainer", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });

  describe("rendering", () => {
    it("renders nothing when queue is empty", () => {
      const emptyMap = new Map<string, ToastEntry>();
      const props: ToastContainerProps = {
        queue: emptyMap,
        onDismiss: vi.fn(),
        onMouseEnter: vi.fn(),
        onMouseLeave: vi.fn(),
        hoveredIds: new Set(),
      };

      const { container } = render(<ToastContainer {...props} />);

      expect(container.firstChild).toBeNull();
    });

    it("renders toast for each entry in queue", () => {
      const entries = [
        createMockEntry("toast-1", "success", "First toast"),
        createMockEntry("toast-2", "error", "Second toast"),
      ];
      const queue = new Map(entries.map((e) => [e.id, e]));

      const props: ToastContainerProps = {
        queue,
        onDismiss: vi.fn(),
        onMouseEnter: vi.fn(),
        onMouseLeave: vi.fn(),
        hoveredIds: new Set(),
      };

      render(<ToastContainer {...props} />);

      const toasts = screen.queryAllByTestId("kinetic-toast");
      expect(toasts.length).toBe(2);
      expect(screen.getByText("First toast")).toBeInTheDocument();
      expect(screen.getByText("Second toast")).toBeInTheDocument();
    });

    it("renders toasts in correct order", () => {
      const entries = [
        createMockEntry("toast-1", "success", "First"),
        createMockEntry("toast-2", "info", "Second"),
        createMockEntry("toast-3", "warning", "Third"),
      ];
      const queue = new Map(entries.map((e) => [e.id, e]));

      const props: ToastContainerProps = {
        queue,
        onDismiss: vi.fn(),
        onMouseEnter: vi.fn(),
        onMouseLeave: vi.fn(),
        hoveredIds: new Set(),
      };

      render(<ToastContainer {...props} />);

      const toasts = screen.queryAllByTestId("kinetic-toast");
      expect(toasts.length).toBe(3);
    });

    it("marks hovered toasts as paused", () => {
      const entries = [createMockEntry("toast-1", "success", "Hover me")];
      const queue = new Map(entries.map((e) => [e.id, e]));

      const props: ToastContainerProps = {
        queue,
        onDismiss: vi.fn(),
        onMouseEnter: vi.fn(),
        onMouseLeave: vi.fn(),
        hoveredIds: new Set(["toast-1"]),
      };

      render(<ToastContainer {...props} />);

      const toast = screen.getByTestId("kinetic-toast");
      const progressBar = screen.getByTestId("kinetic-toast-progress");
      expect(progressBar.style.animationPlayState).toBe("paused");
    });
  });

  describe("interactions", () => {
    it("calls onMouseEnter with correct id when toast is hovered", () => {
      const mockMouseEnter = vi.fn();
      const entries = [createMockEntry("toast-1", "success", "Test")];
      const queue = new Map(entries.map((e) => [e.id, e]));

      const props: ToastContainerProps = {
        queue,
        onDismiss: vi.fn(),
        onMouseEnter: mockMouseEnter,
        onMouseLeave: vi.fn(),
        hoveredIds: new Set(),
      };

      render(<ToastContainer {...props} />);

      const toast = screen.getByTestId("kinetic-toast");
      fireEvent.mouseEnter(toast);

      expect(mockMouseEnter).toHaveBeenCalledWith("toast-1");
    });

    it("calls onMouseLeave with correct id when mouse leaves toast", () => {
      const mockMouseLeave = vi.fn();
      const entries = [createMockEntry("toast-1", "success", "Test")];
      const queue = new Map(entries.map((e) => [e.id, e]));

      const props: ToastContainerProps = {
        queue,
        onDismiss: vi.fn(),
        onMouseEnter: vi.fn(),
        onMouseLeave: mockMouseLeave,
        hoveredIds: new Set(),
      };

      render(<ToastContainer {...props} />);

      const toast = screen.getByTestId("kinetic-toast");
      fireEvent.mouseLeave(toast);

      expect(mockMouseLeave).toHaveBeenCalledWith("toast-1");
    });

    it("calls onDismiss when toast is clicked", () => {
      const mockDismiss = vi.fn();
      const entries = [createMockEntry("toast-1", "success", "Test")];
      const queue = new Map(entries.map((e) => [e.id, e]));

      const props: ToastContainerProps = {
        queue,
        onDismiss: mockDismiss,
        onMouseEnter: vi.fn(),
        onMouseLeave: vi.fn(),
        hoveredIds: new Set(),
      };

      render(<ToastContainer {...props} />);

      const toast = screen.getByTestId("kinetic-toast");
      fireEvent.click(toast);

      expect(mockDismiss).toHaveBeenCalledWith("toast-1");
    });
  });
});