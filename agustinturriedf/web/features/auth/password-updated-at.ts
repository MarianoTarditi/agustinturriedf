export const toPasswordUpdatedAtIso = (value: unknown): string | undefined => {
  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === "string") {
    const date = new Date(value);

    if (!Number.isNaN(date.getTime())) {
      return date.toISOString();
    }
  }

  return undefined;
};

export const isTokenIssuedBeforePasswordUpdate = (
  jwtIatSeconds: unknown,
  passwordUpdatedAt: unknown
): boolean => {
  if (typeof jwtIatSeconds !== "number" || !Number.isFinite(jwtIatSeconds)) {
    return false;
  }

  const passwordUpdatedAtIso = toPasswordUpdatedAtIso(passwordUpdatedAt);

  if (!passwordUpdatedAtIso) {
    return false;
  }

  return jwtIatSeconds * 1000 < new Date(passwordUpdatedAtIso).getTime();
};
