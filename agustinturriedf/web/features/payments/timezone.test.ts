import { describe, expect, it } from "vitest";

import {
  addDays,
  getRollingThirtyDayWindow,
  isDueSoon,
  isOverdue,
  parseBuenosAiresDateInput,
  todayInBuenosAires,
} from "@/features/payments/timezone";

describe("payments timezone helpers", () => {
  it("parses valid BA ISO date input", () => {
    const parsedDate = parseBuenosAiresDateInput("2026-04-21");

    expect(parsedDate.toISOString()).toBe("2026-04-21T03:00:00.000Z");
  });

  it("rejects invalid BA ISO date input", () => {
    expect(() => parseBuenosAiresDateInput("2026-02-31")).toThrow("paymentDate debe ser una fecha válida");
  });

  it("treats due-today as allowed and overdue from next day", () => {
    const now = new Date("2026-04-21T12:00:00.000Z");
    const dueToday = todayInBuenosAires(now);
    const dueYesterday = addDays(dueToday, -1);

    expect(isOverdue(dueToday, now)).toBe(false);
    expect(isOverdue(dueYesterday, now)).toBe(true);
  });

  it("computes rolling 30-day inclusive bounds", () => {
    const now = new Date("2026-04-21T12:00:00.000Z");
    const { startDate, endDate } = getRollingThirtyDayWindow(now);

    expect(startDate.toISOString()).toBe("2026-03-23T03:00:00.000Z");
    expect(endDate.toISOString()).toBe("2026-04-21T03:00:00.000Z");
  });

  it("marks due-soon inside [today..today+3] BA window", () => {
    const now = new Date("2026-04-21T12:00:00.000Z");
    const today = todayInBuenosAires(now);
    const dueInThreeDays = addDays(today, 3);
    const dueInFourDays = addDays(today, 4);

    expect(isDueSoon(dueInThreeDays, now, 3)).toBe(true);
    expect(isDueSoon(dueInFourDays, now, 3)).toBe(false);
  });
});
