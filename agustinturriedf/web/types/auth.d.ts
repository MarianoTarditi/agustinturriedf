import { DefaultSession } from "next-auth";

type Role = "ADMIN" | "TRAINER" | "STUDENT";
type StudentStatus = "ACTIVE" | "INACTIVE" | "BLOCKED";
type PaymentStatus = "CURRENT" | "OVERDUE" | "NO_CYCLE";
type AccessBlockReason = "ADMIN_INACTIVE" | "ADMIN_BLOCKED" | "PAYMENT_OVERDUE";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      role: Role;
      studentStatus?: StudentStatus;
      studentProfileId?: string;
      trainerId?: string;
      paymentStatus?: PaymentStatus;
      accessBlockReason?: AccessBlockReason;
    };
  }

  interface User {
    role: Role;
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
    studentStatus?: StudentStatus;
    studentProfileId?: string;
    trainerId?: string;
    paymentStatus?: PaymentStatus;
    accessBlockReason?: AccessBlockReason;
  }
}
