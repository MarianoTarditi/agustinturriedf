export const BUENOS_AIRES_TIMEZONE = "America/Argentina/Buenos_Aires";

const ISO_LOCAL_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const MILLIS_IN_DAY = 24 * 60 * 60 * 1000;
const BUENOS_AIRES_UTC_OFFSET_HOURS = 3;

const buenosAiresDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: BUENOS_AIRES_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const toUtcMidnightFromDateKey = (dateKey: string) => {
  const [yearRaw, monthRaw, dayRaw] = dateKey.split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const day = Number(dayRaw);

  return new Date(Date.UTC(year, month - 1, day, BUENOS_AIRES_UTC_OFFSET_HOURS));
};

export const toBuenosAiresDateKey = (value: Date) => buenosAiresDateFormatter.format(value);

export const normalizeToBuenosAiresDay = (value: Date) =>
  toUtcMidnightFromDateKey(toBuenosAiresDateKey(value));

export const parseBuenosAiresDateInput = (value: string) => {
  if (!ISO_LOCAL_DATE_REGEX.test(value)) {
    throw new Error("paymentDate debe usar formato YYYY-MM-DD");
  }

  const parsedDate = toUtcMidnightFromDateKey(value);
  const [yearRaw, monthRaw, dayRaw] = value.split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const day = Number(dayRaw);

  const isValidDate =
    parsedDate.getUTCFullYear() === year &&
    parsedDate.getUTCMonth() + 1 === month &&
    parsedDate.getUTCDate() === day;

  if (!isValidDate) {
    throw new Error("paymentDate debe ser una fecha válida");
  }

  return parsedDate;
};

export const todayInBuenosAires = (now = new Date()) => normalizeToBuenosAiresDay(now);

export const addDays = (value: Date, days: number) => {
  const nextDate = new Date(value);
  nextDate.setUTCDate(nextDate.getUTCDate() + days);
  return nextDate;
};

export const isOverdue = (dueDate: Date, now = new Date()) => {
  const dueDateAtDayPrecision = normalizeToBuenosAiresDay(dueDate);
  const today = todayInBuenosAires(now);

  return dueDateAtDayPrecision.getTime() < today.getTime();
};

export const isDueSoon = (dueDate: Date, now = new Date(), windowInDays = 3) => {
  const dueDateAtDayPrecision = normalizeToBuenosAiresDay(dueDate);
  const today = todayInBuenosAires(now);
  const dueSoonUntil = addDays(today, windowInDays);

  return (
    dueDateAtDayPrecision.getTime() >= today.getTime() &&
    dueDateAtDayPrecision.getTime() <= dueSoonUntil.getTime()
  );
};

export const getRollingThirtyDayWindow = (now = new Date()) => {
  const endDate = todayInBuenosAires(now);
  const startDate = addDays(endDate, -29);

  return {
    startDate,
    endDate,
  };
};

export const toEndOfDayUtc = (value: Date) => new Date(value.getTime() + MILLIS_IN_DAY - 1);
