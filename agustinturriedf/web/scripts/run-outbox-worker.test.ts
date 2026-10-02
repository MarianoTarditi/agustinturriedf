import { describe, expect, it, vi } from "vitest";

import { runOutboxWorkerLoop } from "./run-outbox-worker";

const signalHarness = () => {
  const listeners = new Map<string, () => void>();
  return {
    listeners,
    onSignal: vi.fn((signal: string, listener: () => void) => listeners.set(signal, listener)),
    offSignal: vi.fn((signal: string) => listeners.delete(signal)),
    stop: (signal: "SIGINT" | "SIGTERM" = "SIGINT") => listeners.get(signal)?.(),
  };
};

const flush = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

describe("local outbox worker loop", () => {
  it("validates configuration before the first drain", async () => {
    const signals = signalHarness();
    const drain = vi.fn();
    const disconnect = vi.fn().mockResolvedValue(undefined);

    await expect(runOutboxWorkerLoop({
      drain,
      disconnect,
      validate: () => { throw new Error("invalid configuration"); },
      onSignal: signals.onSignal,
      offSignal: signals.offSignal,
    })).rejects.toThrow("invalid configuration");

    expect(drain).not.toHaveBeenCalled();
    expect(disconnect).toHaveBeenCalledOnce();
  });

  it("drains immediately and serially after each interval", async () => {
    const signals = signalHarness();
    const drain = vi.fn().mockResolvedValue(undefined);
    const wait = vi.fn()
      .mockResolvedValueOnce(undefined)
      .mockImplementationOnce(async () => signals.stop());
    const disconnect = vi.fn().mockResolvedValue(undefined);

    await runOutboxWorkerLoop({ drain, wait, disconnect, onSignal: signals.onSignal, offSignal: signals.offSignal });

    expect(drain).toHaveBeenCalledTimes(2);
    expect(wait).toHaveBeenCalledTimes(2);
    expect(disconnect).toHaveBeenCalledOnce();
  });

  it("never overlaps a slow drain", async () => {
    const signals = signalHarness();
    let resolveDrain!: () => void;
    const drain = vi.fn(() => new Promise<void>((resolve) => { resolveDrain = resolve; }));
    const disconnect = vi.fn().mockResolvedValue(undefined);
    const running = runOutboxWorkerLoop({ drain, disconnect, wait: vi.fn(), onSignal: signals.onSignal, offSignal: signals.offSignal });

    await flush();
    expect(drain).toHaveBeenCalledOnce();
    signals.stop();
    expect(disconnect).not.toHaveBeenCalled();
    resolveDrain();
    await running;
    expect(drain).toHaveBeenCalledOnce();
    expect(disconnect).toHaveBeenCalledOnce();
  });

  it("logs a safe loop error and continues polling", async () => {
    const signals = signalHarness();
    const drain = vi.fn().mockRejectedValueOnce(new Error("database contained secret data")).mockResolvedValueOnce(undefined);
    const logError = vi.fn();
    const wait = vi.fn()
      .mockResolvedValueOnce(undefined)
      .mockImplementationOnce(async () => signals.stop("SIGTERM"));

    await runOutboxWorkerLoop({ drain, disconnect: vi.fn(), wait, logError, onSignal: signals.onSignal, offSignal: signals.offSignal });

    expect(drain).toHaveBeenCalledTimes(2);
    expect(logError).toHaveBeenCalledWith({ event: "outbox_worker_cycle_failed", category: "INFRASTRUCTURE" });
    expect(JSON.stringify(logError.mock.calls)).not.toContain("secret data");
  });

  it("cancels an active wait and disconnects exactly once on repeated signals", async () => {
    const signals = signalHarness();
    const disconnect = vi.fn().mockResolvedValue(undefined);
    const wait = vi.fn((_milliseconds: number, signal: AbortSignal) => new Promise<void>((resolve) => signal.addEventListener("abort", () => resolve(), { once: true })));
    const running = runOutboxWorkerLoop({ drain: vi.fn(), disconnect, wait, onSignal: signals.onSignal, offSignal: signals.offSignal });

    await flush();
    signals.stop();
    signals.stop("SIGTERM");
    await running;

    expect(disconnect).toHaveBeenCalledOnce();
  });
});
