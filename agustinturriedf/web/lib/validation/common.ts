import { z } from "zod";

export const roleSchema = z.enum(["ADMIN", "TRAINER", "STUDENT"]);
export const studentStatusSchema = z.enum(["ACTIVE", "INACTIVE", "BLOCKED"]);

export const cuidSchema = z
  .string()
  .trim()
  .min(1, "El id es obligatorio")
  .regex(/^c[a-z0-9]{24}$/i, "El id debe ser un CUID válido");

export const requiredStringSchema = z
  .string()
  .trim()
  .min(1, "Este campo es obligatorio");

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("Email inválido");
