import { z } from "zod";

import { cuidSchema, emailSchema, requiredStringSchema, roleSchema, studentStatusSchema } from "@/lib/validation/common";

const selfProfileGenderSchema = z.enum(["MALE", "FEMALE", "NON_BINARY", "OTHER"]);

const normalizeNullableString = (value: unknown) => {
  if (value === null) {
    return null;
  }

  if (typeof value !== "string") {
    return value;
  }

  const trimmedValue = value.trim();
  return trimmedValue.length > 0 ? trimmedValue : null;
};

const nullablePhoneSchema = z.preprocess(
  normalizeNullableString,
  z.string().max(30, "El teléfono no puede superar 30 caracteres").nullable()
);

const nullablePhotoUrlSchema = z.preprocess(
  normalizeNullableString,
  z
    .string()
    .url("La foto debe ser una URL válida")
    .refine((url) => /^https?:\/\//i.test(url), "La foto debe usar protocolo http o https")
    .nullable()
);

const isValidIsoDate = (value: string) => {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (!match) {
    return false;
  }

  const [, yearRaw, monthRaw, dayRaw] = match;
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const day = Number(dayRaw);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() + 1 === month &&
    date.getUTCDate() === day
  );
};

const nullableBirthDateSchema = z.preprocess(
  normalizeNullableString,
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "birthDate debe usar formato YYYY-MM-DD")
    .refine(isValidIsoDate, "birthDate debe ser una fecha válida")
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

const selfProfileMutableKeys = [
  "firstName",
  "lastName",
  "phone",
  "photoUrl",
  "birthDate",
  "gender",
  "heightCm",
  "weightKg",
] as const;

type SelfProfileMutableKey = (typeof selfProfileMutableKeys)[number];

export const userIdParamSchema = z.object({
  userId: cuidSchema,
});

export const createUserSchema = z
  .object({
    firstName: requiredStringSchema,
    lastName: requiredStringSchema,
    email: emailSchema,
    role: roleSchema,
    phone: nullablePhoneSchema.optional(),
    photoUrl: nullablePhotoUrlSchema.optional(),
    birthDate: nullableBirthDateSchema.optional(),
    gender: selfProfileGenderSchema.nullable().optional(),
    heightCm: nullableHeightSchema.optional(),
    weightKg: nullableWeightSchema.optional(),
    trainerId: cuidSchema.optional(),
    studentStatus: studentStatusSchema.optional(),
  })
  .superRefine((value, context) => {
    if (value.role === "STUDENT" && !value.trainerId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["trainerId"],
        message: "trainerId es obligatorio para usuarios STUDENT",
      });
    }

    if (value.role !== "STUDENT" && value.trainerId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["trainerId"],
        message: "trainerId solo aplica para usuarios STUDENT",
      });
    }

    if (value.role !== "STUDENT" && value.studentStatus) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["studentStatus"],
        message: "studentStatus solo aplica para usuarios STUDENT",
      });
    }
  });

export const updateUserSchema = z
  .object({
    firstName: requiredStringSchema.optional(),
    lastName: requiredStringSchema.optional(),
    email: emailSchema.optional(),
    role: roleSchema.optional(),
    trainerId: cuidSchema.optional(),
    studentStatus: studentStatusSchema.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "Debe enviarse al menos un campo para actualizar",
  });

export const selfProfileSchema = z.object({
  firstName: requiredStringSchema,
  lastName: requiredStringSchema,
  email: emailSchema,
  phone: nullablePhoneSchema,
  photoUrl: nullablePhotoUrlSchema,
  birthDate: nullableBirthDateSchema,
  gender: selfProfileGenderSchema.nullable(),
  heightCm: nullableHeightSchema,
  weightKg: nullableWeightSchema,
});

export const updateSelfProfileSchema = z
  .object({
    firstName: requiredStringSchema.optional(),
    lastName: requiredStringSchema.optional(),
    phone: nullablePhoneSchema.optional(),
    photoUrl: nullablePhotoUrlSchema.optional(),
    birthDate: nullableBirthDateSchema.optional(),
    gender: selfProfileGenderSchema.nullable().optional(),
    heightCm: nullableHeightSchema.optional(),
    weightKg: nullableWeightSchema.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "Debe enviarse al menos un campo para actualizar",
  });

export const stripImmutableSelfProfileFields = (
  payload: unknown
): Partial<Record<SelfProfileMutableKey, unknown>> => {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return {};
  }

  const rawPayload = payload as Record<string, unknown>;

  return selfProfileMutableKeys.reduce(
    (accumulator, key) => {
      if (rawPayload[key] !== undefined) {
        accumulator[key] = rawPayload[key];
      }

      return accumulator;
    },
    {} as Partial<Record<SelfProfileMutableKey, unknown>>
  );
};

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type SelfProfileDTO = z.infer<typeof selfProfileSchema>;
export type UpdateSelfProfileInput = z.infer<typeof updateSelfProfileSchema>;
export type SelfProfileGender = z.infer<typeof selfProfileGenderSchema>;
