import { describe, expect, it } from "vitest";

import { PasswordResetThrottle } from "@/features/auth/password-reset/throttle";

type Bucket = { id: string; scope: string; subject: string; count: number; resetAt: Date };

const createClient = () => {
  const buckets = new Map<string, Bucket>();
  let nextId = 1;
  const key = (scope: string, subject: string) => `${scope}:${subject}`;

  const throttleBucket = {
    findUnique: async ({ where }: any) => buckets.get(key(where.scope_subject.scope, where.scope_subject.subject)) ?? null,
    updateMany: async ({ where, data }: any) => {
      const bucket = [...buckets.values()].find((value) => value.id === where.id);
      if (!bucket || (where.resetAt?.gt && bucket.resetAt <= where.resetAt.gt) || (where.resetAt?.lte && bucket.resetAt > where.resetAt.lte) || (where.count?.lt !== undefined && bucket.count >= where.count.lt)) return { count: 0 };
      bucket.count = data.count?.increment ? bucket.count + data.count.increment : data.count;
      bucket.resetAt = data.resetAt ?? bucket.resetAt;
      return { count: 1 };
    },
    create: async ({ data }: any) => {
      const bucketKey = key(data.scope, data.subject);
      if (buckets.has(bucketKey)) throw Object.assign(new Error("unique"), { code: "P2002" });
      const bucket = { id: String(nextId++), ...data };
      buckets.set(bucketKey, bucket);
      return bucket;
    },
  };

  return { $transaction: async (operation: any) => operation({ throttleBucket }), throttleBucket, buckets };
};

describe("PasswordResetThrottle", () => {
  it("admits only the configured number of concurrent requests for a public identity", async () => {
    const client = createClient();
    const throttle = new PasswordResetThrottle(client, { limit: 2, windowMs: 60_000 });

    const results = await Promise.all([
      throttle.consume("203.0.113.1"),
      throttle.consume("203.0.113.1"),
      throttle.consume("203.0.113.1"),
    ]);

    expect(results).toEqual([true, true, false]);
    expect(client.buckets.get("password-reset-public:203.0.113.1")?.count).toBe(2);
  });

  it("isolates concurrent actor and target capacities in distinct panel scopes", async () => {
    const client = createClient();
    const actorThrottle = new PasswordResetThrottle(client, { limit: 2, windowMs: 60_000 }, "password-reset-panel-actor");
    const targetThrottle = new PasswordResetThrottle(client, { limit: 2, windowMs: 60_000 }, "password-reset-panel-target");

    const results = await Promise.all([
      actorThrottle.consume("actor:admin-1"), actorThrottle.consume("actor:admin-1"), actorThrottle.consume("actor:admin-1"),
      targetThrottle.consume("target:user-1"), targetThrottle.consume("target:user-1"), targetThrottle.consume("target:user-1"),
    ]);

    expect(results).toEqual([true, true, false, true, true, false]);
    expect(client.buckets.get("password-reset-panel-actor:actor:admin-1")?.count).toBe(2);
    expect(client.buckets.get("password-reset-panel-target:target:user-1")?.count).toBe(2);
  });
});
