type LogPasswordResetEmailInput = {
  email: string;
  resetUrl: string;
  expiresAt: Date;
};

export class PasswordResetLogger {
  async logPasswordResetEmail(input: LogPasswordResetEmailInput) {
    console.info({
      event: "password_reset_requested",
      email: input.email,
      resetUrl: input.resetUrl,
      expiresAt: input.expiresAt,
    });
  }
}

export const passwordResetLogger = new PasswordResetLogger();
