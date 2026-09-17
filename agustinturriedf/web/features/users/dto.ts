export type UserDTO = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  photoUrl: string | null;
  birthDate: Date | null;
  gender: "MALE" | "FEMALE" | "NON_BINARY" | "OTHER" | null;
  heightCm: number | null;
  weightKg: number | null;
  role: "ADMIN" | "TRAINER" | "STUDENT";
  status: "ACTIVE" | "INACTIVE" | "BLOCKED" | "ARCHIVED";
  createdAt: Date;
  updatedAt: Date;
  studentProfile: { id: string; trainerId: string; status: "ACTIVE" | "INACTIVE" | "BLOCKED" } | null;
};
