import { z } from "zod";

import { cuidSchema } from "@/lib/validation/common";

const isoLocalDateSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "La fecha debe usar formato YYYY-MM-DD")
  .refine((value) => {
    const [yearRaw, monthRaw, dayRaw] = value.split("-");
    const year = Number(yearRaw);
    const month = Number(monthRaw);
    const day = Number(dayRaw);
    const date = new Date(Date.UTC(year, month - 1, day));

    return (
      date.getUTCFullYear() === year &&
      date.getUTCMonth() + 1 === month &&
      date.getUTCDate() === day
    );
  }, "La fecha debe ser válida");

export const paymentDashboardViewSchema = z.enum([
  "ALL",
  "DUE_TODAY",
  "DUE_THIS_WEEK",
  "OVERDUE",
]);

export const paymentDashboardFiltersSchema = z.object({
  query: z.string().trim().optional(),
  view: paymentDashboardViewSchema.optional(),
});

export const registerPaymentSchema = z.object({
  studentProfileId: cuidSchema,
  amountInCents: z
    .number()
    .int("amountInCents debe ser un entero")
    .positive("amountInCents debe ser mayor a 0"),
  paymentDate: isoLocalDateSchema,
});

export const editPaymentSchema = z.object({
  amountInCents: z
    .number()
    .int("amountInCents debe ser un entero")
    .positive("amountInCents debe ser mayor a 0"),
  startDate: isoLocalDateSchema,
});

export const paymentConfigUpdateSchema = z.object({
  defaultMonthlyAmountInCents: z
    .number()
    .int("defaultMonthlyAmountInCents debe ser un entero")
    .positive("defaultMonthlyAmountInCents debe ser mayor a 0"),
});

export const paymentStudentProfileParamSchema = z.object({
  studentProfileId: cuidSchema,
});

export type RegisterPaymentPayload = z.infer<typeof registerPaymentSchema>;
export type EditPaymentPayload = z.infer<typeof editPaymentSchema>;
export type PaymentConfigUpdatePayload = z.infer<typeof paymentConfigUpdateSchema>;
