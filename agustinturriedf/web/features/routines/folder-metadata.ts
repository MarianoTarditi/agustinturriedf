const normalizeEmail = (email: string) => email.trim().toLowerCase();

export const buildRoutineFolderDisplayName = (firstName: string, lastName: string) => {
  const fullName = `${firstName} ${lastName}`.trim();
  return fullName.length > 0 ? `Rutinas de ${fullName}` : "Rutinas del estudiante";
};

export const buildRoutineFolderStorageKey = (email: string) => {
  return `student:${normalizeEmail(email)}`;
};
