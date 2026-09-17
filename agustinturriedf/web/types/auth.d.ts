import { DefaultSession } from "next-auth";

type Role = "ADMIN" | "TRAINER" | "STUDENT";
type StudentStatus = "ACTIVE" | "INACTIVE" | "BLOCKED";
type AccountStatus = "ACTIVE" | "INACTIVE" | "BLOCKED" | "ARCHIVED";
type PaymentStatus = "CURRENT" | "OVERDUE" | "NO_CYCLE";
type AccessBlockReason = "ADMIN_INACTIVE" | "ADMIN_BLOCKED" | "PAYMENT_OVERDUE";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      role: Role;
      accountStatus?: AccountStatus;
      passwordUpdatedAt?: string;
      studentStatus?: StudentStatus;
      studentProfileId?: string;
      trainerId?: string;
      paymentStatus?: PaymentStatus;
      accessBlockReason?: AccessBlockReason;
    };
  }

  interface User {
    role: Role;
    accountStatus?: AccountStatus;
    passwordUpdatedAt?: string;
    studentStatus?: StudentStatus;
    studentProfileId?: string;
    trainerId?: string;
    paymentStatus?: PaymentStatus;
    accessBlockReason?: AccessBlockReason;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: Role;
    accountStatus?: AccountStatus;
    passwordUpdatedAt?: string;
    studentStatus?: StudentStatus;
    studentProfileId?: string;
    trainerId?: string;
    paymentStatus?: PaymentStatus;
    accessBlockReason?: AccessBlockReason;
  }
}
