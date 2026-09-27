import { z } from "zod";

import { emailSchema } from "@/lib/validation/common";

const resetTokenSchema = z.string().trim().min(1, "El token es obligatorio");
const passwordSchema = z.string().min(8, "La contraseña debe tener al menos 8 caracteres");

export const requestPasswordResetSchema = z.object({
  email: emailSchema,
});

export const confirmPasswordResetSchema = z
  .object({
    token: resetTokenSchema,
    password: passwordSchema,
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

export const passwordResetTokenQuerySchema = z.object({
  token: resetTokenSchema,
});

export type RequestPasswordResetInput = z.infer<typeof requestPasswordResetSchema>;
export type ConfirmPasswordResetInput = z.infer<typeof confirmPasswordResetSchema>;
export type PasswordResetTokenQueryInput = z.infer<typeof passwordResetTokenQuerySchema>;
