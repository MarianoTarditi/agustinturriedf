import { pathToFileURL } from "node:url";

import { createProductionOutboxWorker } from "@/features/outbox/worker";
import { prisma } from "@/lib/prisma";

type WorkerSignal = "SIGINT" | "SIGTERM";
type SafeLogEntry = { event: "outbox_worker_cycle_failed" | "outbox_worker_startup_failed"; category: "INFRASTRUCTURE" | "CONFIGURATION" };

export type OutboxWorkerLoopDependencies = {
  drain: () => Promise<unknown>;
  disconnect: () => Promise<void>;
  validate?: () => void;
  wait?: (milliseconds: number, signal: AbortSignal) => Promise<void>;
  onSignal?: (signal: WorkerSignal, listener: () => void) => void;
  offSignal?: (signal: WorkerSignal, listener: () => void) => void;
  logError?: (entry: SafeLogEntry) => void;
  intervalMs?: number;
};

const defaultWait = (milliseconds: number, signal: AbortSignal) => new Promise<void>((resolve) => {
  if (signal.aborted) return resolve();
  const timer = setTimeout(done, milliseconds);
  signal.addEventListener("abort", done, { once: true });

  function done() {
    clearTimeout(timer);
    signal.removeEventListener("abort", done);
    resolve();
  }
});

export const validateOutboxWorkerConfiguration = (environment: NodeJS.ProcessEnv = process.env) => {
  const required = ["RESEND_API_KEY", "EMAIL_FROM", "OUTBOX_ENCRYPTION_KEY", "OUTBOX_ENCRYPTION_KEY_ID"] as const;
  if (required.some((name) => !environment[name]?.trim())) throw new Error("OUTBOX_WORKER_CONFIG_MISSING");

  const encodedKey = environment.OUTBOX_ENCRYPTION_KEY!.trim();
  const decodedKey = Buffer.from(encodedKey, "base64url");
  if (decodedKey.length !== 32 || decodedKey.toString("base64url") !== encodedKey) throw new Error("OUTBOX_WORKER_CONFIG_INVALID");
};

export async function runOutboxWorkerLoop(dependencies: OutboxWorkerLoopDependencies) {
  const wait = dependencies.wait ?? defaultWait;
  const onSignal = dependencies.onSignal ?? ((signal, listener) => process.on(signal, listener));
  const offSignal = dependencies.offSignal ?? ((signal, listener) => process.off(signal, listener));
  const logError = dependencies.logError ?? ((entry) => console.error(entry));
  const intervalMs = dependencies.intervalMs ?? 2_000;
  const waitController = new AbortController();
  let stopping = false;
  let disconnected = false;

  const stop = () => {
    if (stopping) return;
    stopping = true;
    waitController.abort();
  };
  const signals: WorkerSignal[] = ["SIGINT", "SIGTERM"];
  signals.forEach((signal) => onSignal(signal, stop));

  try {
    dependencies.validate?.();
    while (!stopping) {
      try {
        await dependencies.drain();
      } catch {
        logError({ event: "outbox_worker_cycle_failed", category: "INFRASTRUCTURE" });
      }
      if (!stopping) await wait(intervalMs, waitController.signal);
    }
  } finally {
    signals.forEach((signal) => offSignal(signal, stop));
    if (!disconnected) {
      disconnected = true;
      await dependencies.disconnect();
    }
  }
}

async function main() {
  const worker = createProductionOutboxWorker();
  await runOutboxWorkerLoop({
    drain: () => worker.drain(),
    disconnect: () => prisma.$disconnect(),
    validate: () => validateOutboxWorkerConfiguration(),
  });
}

const entryPoint = process.argv[1];
if (entryPoint && import.meta.url === pathToFileURL(entryPoint).href) {
  main().catch(() => {
    console.error({ event: "outbox_worker_startup_failed", category: "CONFIGURATION" });
    process.exitCode = 1;
  });
}
