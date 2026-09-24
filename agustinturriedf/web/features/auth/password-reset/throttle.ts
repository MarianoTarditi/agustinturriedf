import { prisma } from "@/lib/prisma";

type ThrottleClient = {
  $transaction: <T>(operation: (transaction: any) => Promise<T>) => Promise<T>;
  throttleBucket: any;
};

type ThrottleOptions = { limit: number; windowMs: number };

const defaultOptions = { limit: 5, windowMs: 15 * 60 * 1000 };

const isUniqueConflict = (error: unknown) =>
  typeof error === "object" && error !== null && "code" in error && error.code === "P2002";

export class PasswordResetThrottle {
  constructor(
    private readonly client: ThrottleClient = prisma as unknown as ThrottleClient,
    private readonly options: ThrottleOptions = defaultOptions,
    private readonly scope = "password-reset-public"
  ) {}

  async consume(subject: string) {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const accepted = await this.client.$transaction(async (transaction) => {
        const now = new Date();
        const bucket = await transaction.throttleBucket.findUnique({
          where: { scope_subject: { scope: this.scope, subject } },
        });

        if (bucket && bucket.resetAt > now) {
          const updated = await transaction.throttleBucket.updateMany({
            where: { id: bucket.id, resetAt: { gt: now }, count: { lt: this.options.limit } },
            data: { count: { increment: 1 } },
          });
          return updated.count === 1;
        }

        if (bucket) {
          const updated = await transaction.throttleBucket.updateMany({
            where: { id: bucket.id, resetAt: { lte: now } },
            data: { count: 1, resetAt: new Date(now.getTime() + this.options.windowMs) },
          });
          return updated.count === 1;
        }

        try {
          await transaction.throttleBucket.create({
            data: { scope: this.scope, subject, count: 1, resetAt: new Date(now.getTime() + this.options.windowMs) },
          });
          return true;
        } catch (error) {
          if (isUniqueConflict(error)) return null;
          throw error;
        }
      });

      if (accepted !== null) return accepted;
    }

    return false;
  }
}

export const passwordResetThrottle = new PasswordResetThrottle();
export const passwordResetActorThrottle = new PasswordResetThrottle(undefined, undefined, "password-reset-panel-actor");
export const passwordResetTargetThrottle = new PasswordResetThrottle(undefined, undefined, "password-reset-panel-target");
