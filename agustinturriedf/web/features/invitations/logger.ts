type InvitationLogPayload = {
  invitationId: string;
  email: string;
  trainerId: string;
};

export class InvitationLogger {
  async created(payload: InvitationLogPayload) {
    console.info({ event: "invitation_created", ...payload });
  }

  async resent(payload: InvitationLogPayload) {
    console.info({ event: "invitation_resent", ...payload });
  }

  async consumed(payload: InvitationLogPayload) {
    console.info({ event: "invitation_consumed", ...payload });
  }

  async revoked(payload: InvitationLogPayload) {
    console.info({ event: "invitation_revoked", ...payload });
  }

  async expired(payload: InvitationLogPayload) {
    console.info({ event: "invitation_expired", ...payload });
  }
}

export const invitationLogger = new InvitationLogger();
