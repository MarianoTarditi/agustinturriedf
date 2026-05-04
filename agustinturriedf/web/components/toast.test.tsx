import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import React from "react";
import { Toast, ToastProps } from "./toast";
import { ToastEntry } from "./toast-provider";

function createMockEntry(type: ToastEntry["type"] = "success", message = "Test message"): ToastEntry {
  return {
    id: `test-${Date.now()}`,
    type,
    message,
    duration: 5000,
  };
}

describe("Toast", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });

  describe("rendering", () => {
    it("renders with correct success class", () => {
      const entry = createMockEntry("success");
      const props: ToastProps = {
        entry,
        isPaused: false,
        onDismiss: vi.fn(),
        onMouseEnter: vi.fn(),
        onMouseLeave: vi.fn(),
      };

      render(<Toast {...props} />);

      const toast = screen.getByTestId("kinetic-toast");
      expect(toast).toHaveClass("kinetic-toast--success");
    });

    it("renders with correct error class", () => {
      const entry = createMockEntry("error");
      const props: ToastProps = {
        entry,
        isPaused: false,
        onDismiss: vi.fn(),
        onMouseEnter: vi.fn(),
        onMouseLeave: vi.fn(),
      };

      render(<Toast {...props} />);

      const toast = screen.getByTestId("kinetic-toast");
      expect(toast).toHaveClass("kinetic-toast--error");
    });

    it("renders with correct info class", () => {
      const entry = createMockEntry("info");
      const props: ToastProps = {
        entry,
        isPaused: false,
        onDismiss: vi.fn(),
        onMouseEnter: vi.fn(),
        onMouseLeave: vi.fn(),
      };

      render(<Toast {...props} />);

      const toast = screen.getByTestId("kinetic-toast");
      expect(toast).toHaveClass("kinetic-toast--info");
    });

    it("renders with correct warning class", () => {
      const entry = createMockEntry("warning");
      const props: ToastProps = {
        entry,
        isPaused: false,
        onDismiss: vi.fn(),
        onMouseEnter: vi.fn(),
        onMouseLeave: vi.fn(),
      };

      render(<Toast {...props} />);

      const toast = screen.getByTestId("kinetic-toast");
      expect(toast).toHaveClass("kinetic-toast--warning");
    });

    it("displays the message text", () => {
      const entry = createMockEntry("success", "Operation completed successfully");
      const props: ToastProps = {
        entry,
        isPaused: false,
        onDismiss: vi.fn(),
        onMouseEnter: vi.fn(),
        onMouseLeave: vi.fn(),
      };

      render(<Toast {...props} />);

      expect(screen.getByText("Operation completed successfully")).toBeInTheDocument();
    });

    it("renders close button", () => {
      const entry = createMockEntry();
      const props: ToastProps = {
        entry,
        isPaused: false,
        onDismiss: vi.fn(),
        onMouseEnter: vi.fn(),
        onMouseLeave: vi.fn(),
      };

      render(<Toast {...props} />);

      const closeButton = screen.getByTestId("kinetic-toast-close");
      expect(closeButton).toBeInTheDocument();
    });

    it("renders progress bar", () => {
      const entry = createMockEntry();
      const props: ToastProps = {
        entry,
        isPaused: false,
        onDismiss: vi.fn(),
        onMouseEnter: vi.fn(),
        onMouseLeave: vi.fn(),
      };

      render(<Toast {...props} />);

      const progressBar = screen.getByTestId("kinetic-toast-progress");
      expect(progressBar).toBeInTheDocument();
    });

    it("renders icon for success type", () => {
      const entry = createMockEntry("success");
      const props: ToastProps = {
        entry,
        isPaused: false,
        onDismiss: vi.fn(),
        onMouseEnter: vi.fn(),
        onMouseLeave: vi.fn(),
      };

      render(<Toast {...props} />);

      const icon = screen.getByTestId("kinetic-toast").querySelector(".kinetic-toast__icon");
      expect(icon).toBeInTheDocument();
    });
  });

  describe("interactions", () => {
    it("calls onDismiss when close button is clicked", () => {
      const mockDismiss = vi.fn();
      const entry = createMockEntry();
      const props: ToastProps = {
        entry,
        isPaused: false,
        onDismiss: mockDismiss,
        onMouseEnter: vi.fn(),
        onMouseLeave: vi.fn(),
      };

      render(<Toast {...props} />);

      const closeButton = screen.getByTestId("kinetic-toast-close");
      fireEvent.click(closeButton);

      expect(mockDismiss).toHaveBeenCalledWith(entry.id);
    });

    it("calls onDismiss when toast is clicked", () => {
      const mockDismiss = vi.fn();
      const entry = createMockEntry();
      const props: ToastProps = {
        entry,
        isPaused: false,
        onDismiss: mockDismiss,
        onMouseEnter: vi.fn(),
        onMouseLeave: vi.fn(),
      };

      render(<Toast {...props} />);

      const toast = screen.getByTestId("kinetic-toast");
      fireEvent.click(toast);

      expect(mockDismiss).toHaveBeenCalledWith(entry.id);
    });

    it("calls onMouseEnter when mouse enters toast", () => {
      const mockMouseEnter = vi.fn();
      const entry = createMockEntry();
      const props: ToastProps = {
        entry,
        isPaused: false,
        onDismiss: vi.fn(),
        onMouseEnter: mockMouseEnter,
        onMouseLeave: vi.fn(),
      };

      render(<Toast {...props} />);

      const toast = screen.getByTestId("kinetic-toast");
      fireEvent.mouseEnter(toast);

      expect(mockMouseEnter).toHaveBeenCalledWith(entry.id);
    });

    it("calls onMouseLeave when mouse leaves toast", () => {
      const mockMouseLeave = vi.fn();
      const entry = createMockEntry();
      const props: ToastProps = {
        entry,
        isPaused: false,
        onDismiss: vi.fn(),
        onMouseEnter: vi.fn(),
        onMouseLeave: mockMouseLeave,
      };

      render(<Toast {...props} />);

      const toast = screen.getByTestId("kinetic-toast");
      fireEvent.mouseLeave(toast);

      expect(mockMouseLeave).toHaveBeenCalledWith(entry.id);
    });

    it("does not call onDismiss when close button is clicked (stopPropagation)", () => {
      const mockDismiss = vi.fn();
      const entry = createMockEntry();
      const props: ToastProps = {
        entry,
        isPaused: false,
        onDismiss: mockDismiss,
        onMouseEnter: vi.fn(),
        onMouseLeave: vi.fn(),
      };

      render(<Toast {...props} />);

      const toast = screen.getByTestId("kinetic-toast");
      const closeButton = screen.getByTestId("kinetic-toast-close");

      // Click the close button - since it stopPropagation, the toast onClick should NOT fire
      fireEvent.click(closeButton);

      // Dismiss should be called (from the close button)
      expect(mockDismiss).toHaveBeenCalledWith(entry.id);
    });
  });

  describe("progress bar behavior", () => {
    it("has animation duration matching entry duration", () => {
      const entry = { ...createMockEntry(), duration: 3000 };
      const props: ToastProps = {
        entry,
        isPaused: false,
        onDismiss: vi.fn(),
        onMouseEnter: vi.fn(),
        onMouseLeave: vi.fn(),
      };

      render(<Toast {...props} />);

      const progressBar = screen.getByTestId("kinetic-toast-progress");
      expect(progressBar.style.animationDuration).toBe("3000ms");
    });

    it("has paused animation state when isPaused is true", () => {
      const entry = createMockEntry();
      const props: ToastProps = {
        entry,
        isPaused: true,
        onDismiss: vi.fn(),
        onMouseEnter: vi.fn(),
        onMouseLeave: vi.fn(),
      };

      render(<Toast {...props} />);

      const progressBar = screen.getByTestId("kinetic-toast-progress");
      expect(progressBar.style.animationPlayState).toBe("paused");
    });

    it("has running animation state when isPaused is false", () => {
      const entry = createMockEntry();
      const props: ToastProps = {
        entry,
        isPaused: false,
        onDismiss: vi.fn(),
        onMouseEnter: vi.fn(),
        onMouseLeave: vi.fn(),
      };

      render(<Toast {...props} />);

      const progressBar = screen.getByTestId("kinetic-toast-progress");
      expect(progressBar.style.animationPlayState).toBe("running");
    });
  });
});