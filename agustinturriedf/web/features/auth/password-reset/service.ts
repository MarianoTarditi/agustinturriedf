import { createHash, randomBytes } from "node:crypto";

import { hash as hashPassword } from "bcryptjs";

import { passwordResetLogger } from "@/features/auth/password-reset/logger";
import { passwordResetRepository } from "@/features/auth/password-reset/repository";
import { ApiError } from "@/lib/http/api-response";

const RESET_TOKEN_EXPIRATION_MINUTES = 30;
const PASSWORD_HASH_ROUNDS = 10;
const PASSWORD_RESET_MESSAGE = "Si el email existe, te enviamos instrucciones.";
const PASSWORD_RESET_SUCCESS_MESSAGE = "Contraseña actualizada.";

const getResetBaseUrl = () => {
  return process.env.NEXTAUTH_URL?.trim() || "http://localhost:3010";
};

export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export const isExpired = (expiresAt: Date, now: Date) => expiresAt.getTime() <= now.getTime();

export const genericMessage = () => PASSWORD_RESET_MESSAGE;

const generateRawToken = () => randomBytes(32).toString("hex");

const addMinutes = (date: Date, minutes: number) => new Date(date.getTime() + minutes * 60 * 1000);

const buildResetUrl = (token: string) => `${getResetBaseUrl()}/reset-password/confirm?token=${token}`;

const createInvalidOrExpiredTokenError = () => new ApiError("Token inválido o expirado", 400, "INVALID_OR_EXPIRED_TOKEN");

type ConfirmResetInput = {
  token: string;
  password: string;
};

export class PasswordResetService {
  async requestReset(rawEmail: string) {
    const normalizedEmail = rawEmail.trim().toLowerCase();
    const user = await passwordResetRepository.findUserByEmail(normalizedEmail);

    if (!user) {
      return {
        message: genericMessage(),
      };
    }

    const rawToken = generateRawToken();
    const tokenHash = hashToken(rawToken);
    const expiresAt = addMinutes(new Date(), RESET_TOKEN_EXPIRATION_MINUTES);

    await passwordResetRepository.upsertResetToken({
      userId: user.id,
      tokenHash,
      expiresAt,
    });

    await passwordResetLogger.logPasswordResetEmail({
      email: user.email,
      resetUrl: buildResetUrl(rawToken),
      expiresAt,
    });

    return {
      message: genericMessage(),
    };
  }

  async confirmReset(input: ConfirmResetInput) {
    const tokenHash = hashToken(input.token);
    const now = new Date();
    const resetToken = await passwordResetRepository.findValidTokenByHash(tokenHash);

    if (!resetToken) {
      throw createInvalidOrExpiredTokenError();
    }

    if (isExpired(resetToken.expiresAt, now)) {
      throw createInvalidOrExpiredTokenError();
    }

    const nextPasswordHash = await hashPassword(input.password, PASSWORD_HASH_ROUNDS);
    const consumed = await passwordResetRepository.consumeTokenAndUpdatePassword({
      userId: resetToken.userId,
      passwordHash: nextPasswordHash,
      passwordUpdatedAt: now,
    });

    if (!consumed) {
      throw createInvalidOrExpiredTokenError();
    }

    return {
      message: PASSWORD_RESET_SUCCESS_MESSAGE,
    };
  }
}

export const passwordResetService = new PasswordResetService();
