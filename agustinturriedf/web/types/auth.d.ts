import { DefaultSession } from "next-auth";

type Role = "ADMIN" | "TRAINER" | "STUDENT";
type StudentStatus = "ACTIVE" | "INACTIVE" | "BLOCKED";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      role: Role;
      studentStatus?: StudentStatus;
      studentProfileId?: string;
      trainerId?: string;
    };
  }

  interface User {
    role: Role;
    studentStatus?: StudentStatus;
    studentProfileId?: string;
    trainerId?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: Role;
    studentStatus?: StudentStatus;
    studentProfileId?: string;
    trainerId?: string;
  }
}
