type LogPasswordResetEmailInput = {
  userId: string;
};

export class PasswordResetLogger {
  async logPasswordResetEmail(input: LogPasswordResetEmailInput) {
    console.info({
      event: "password_reset_queued",
      userId: input.userId,
    });
  }
}

export const passwordResetLogger = new PasswordResetLogger();
