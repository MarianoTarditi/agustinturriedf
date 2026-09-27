import { z } from "zod";

import { cuidSchema, emailSchema, requiredStringSchema } from "@/lib/validation/common";

const normalizeNullableString = (value: unknown) => {
  if (value === null) return null;
  if (typeof value !== "string") return value;

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const profileGenderSchema = z.enum(["MALE", "FEMALE", "NON_BINARY", "OTHER"]);
const invitationRoleSchema = z.enum(["ADMIN", "TRAINER", "STUDENT"]);

const nullablePhoneSchema = z.preprocess(
  normalizeNullableString,
  z.string().max(30, "El teléfono no puede superar 30 caracteres").nullable()
);

const isValidIsoDate = (value: string) => {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return false;

  const [, yearRaw, monthRaw, dayRaw] = match;
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const day = Number(dayRaw);
  const date = new Date(Date.UTC(year, month - 1, day));

  return date.getUTCFullYear() === year && date.getUTCMonth() + 1 === month && date.getUTCDate() === day;
};

const nullableBirthDateSchema = z.preprocess(
  normalizeNullableString,
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "birthDate debe usar formato YYYY-MM-DD")
    .refine(isValidIsoDate, "birthDate debe ser una fecha válida")
    .nullable()
);

const nullableInitialPaymentStartDateSchema = z.preprocess(
  normalizeNullableString,
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "initialPaymentStartDate debe usar formato YYYY-MM-DD")
    .refine(isValidIsoDate, "initialPaymentStartDate debe ser una fecha válida")
    .nullable()
);

const nullableHeightSchema = z
  .number()
  .int("heightCm debe ser un entero")
  .min(50, "heightCm debe estar entre 50 y 300")
  .max(300, "heightCm debe estar entre 50 y 300")
  .nullable();

const nullableWeightSchema = z
  .number()
  .int("weightKg debe ser un entero")
  .min(20, "weightKg debe estar entre 20 y 500")
  .max(500, "weightKg debe estar entre 20 y 500")
  .nullable();

export const createInvitationSchema = z
  .object({
    firstName: requiredStringSchema,
    lastName: requiredStringSchema,
    email: emailSchema,
    role: invitationRoleSchema.default("STUDENT"),
    phone: nullablePhoneSchema.optional(),
    birthDate: nullableBirthDateSchema.optional(),
    gender: profileGenderSchema.nullable().optional(),
    heightCm: nullableHeightSchema.optional(),
    weightKg: nullableWeightSchema.optional(),
    trainerId: cuidSchema.optional(),
    initialPaymentStartDate: nullableInitialPaymentStartDateSchema.optional(),
  })
  .superRefine((value, context) => {
    if (value.role === "STUDENT" && !value.trainerId) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["trainerId"], message: "trainerId is required for STUDENT invitations" });
    }
    if (value.role === "STUDENT" && !value.initialPaymentStartDate) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["initialPaymentStartDate"],
        message: "initialPaymentStartDate es obligatorio para invitaciones STUDENT",
      });
    }
    if (value.role !== "STUDENT" && (value.trainerId || value.initialPaymentStartDate || value.birthDate || value.gender || value.heightCm || value.weightKg)) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["role"], message: "Student data is not allowed for team invitations" });
    }
  });

export const activateInvitationSchema = z
  .object({
    token: z.string().trim().min(1, "Token requerido"),
    password: z
      .string()
      .min(8, "Mínimo 8 caracteres")
      .regex(/[A-Z]/, "Debe incluir una mayúscula")
      .regex(/[a-z]/, "Debe incluir una minúscula")
      .regex(/[0-9]/, "Debe incluir un número"),
    confirmPassword: z.string(),
  })
  .superRefine((value, context) => {
    if (value.password !== value.confirmPassword) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["confirmPassword"],
        message: "Las contraseñas no coinciden",
      });
    }
  });

export const activateFromSessionSchema = z
  .object({
    password: z
      .string()
      .min(8, "Mínimo 8 caracteres")
      .regex(/[A-Z]/, "Debe incluir una mayúscula")
      .regex(/[a-z]/, "Debe incluir una minúscula")
      .regex(/[0-9]/, "Debe incluir un número"),
    confirmPassword: z.string(),
  })
  .refine((value) => value.password === value.confirmPassword, { path: ["confirmPassword"], message: "Las contraseñas no coinciden" });

export const resendInvitationSchema = z.object({
  invitationId: cuidSchema,
  expectedVersion: z.number().int().positive(),
});

export const invitationQueueQuerySchema = z.object({
  search: z.string().trim().min(1).max(100).optional(),
  status: z.enum(["PENDING", "SENT", "CONSUMED", "EXPIRED", "REVOKED"]).optional(),
  role: z.enum(["ADMIN", "TRAINER", "STUDENT"]).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  cursor: z.string().min(1).max(2000).optional(),
}).strict();

export const revokeInvitationSchema = resendInvitationSchema.extend({
  reason: z.string().trim().min(1).max(500),
});

export type CreateInvitationInput = z.infer<typeof createInvitationSchema>;
export type ActivateInvitationInput = z.infer<typeof activateInvitationSchema>;
export type InvitationQueueQuery = z.infer<typeof invitationQueueQuerySchema>;
export type ResendInvitationInput = z.infer<typeof resendInvitationSchema>;
