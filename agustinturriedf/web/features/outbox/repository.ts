type OutboxWrite = {
  messageType: string;
  resourceType: string;
  resourceId: string;
  idempotencyKey: string;
  payloadEncrypted: string;
};

export type OutboxTransaction = {
  outboxMessage: { create: (input: { data: OutboxWrite }) => Promise<unknown> };
};

export class OutboxRepository {
  enqueue(data: OutboxWrite, transaction: OutboxTransaction) {
    return transaction.outboxMessage.create({ data });
  }
}
