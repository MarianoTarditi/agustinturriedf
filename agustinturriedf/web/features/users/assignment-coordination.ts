export const lockTrainerAssignmentCoordination = async (transaction: any, trainerId: string) =>
  transaction.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${trainerId}))`;
