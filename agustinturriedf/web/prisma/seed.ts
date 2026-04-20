import { PrismaClient, Role, StudentStatus } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

const DEFAULT_PASSWORD = "123456789";

async function main() {
  const passwordHash = await hash(DEFAULT_PASSWORD, 12);

  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@opecode.local";
  const adminFirstName = process.env.SEED_ADMIN_FIRST_NAME ?? "Admin";
  const adminLastName = process.env.SEED_ADMIN_LAST_NAME ?? "Principal";

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      firstName: adminFirstName,
      lastName: adminLastName,
      role: Role.ADMIN,
      passwordHash,
    },
    create: {
      firstName: adminFirstName,
      lastName: adminLastName,
      email: adminEmail,
      role: Role.ADMIN,
      passwordHash,
    },
  });

  if (process.env.SEED_CREATE_DEMO_DATA !== "false") {
    const trainerPasswordHash = await hash(DEFAULT_PASSWORD, 12);
    const studentPasswordHash = await hash(DEFAULT_PASSWORD, 12);

    const trainer = await prisma.user.upsert({
      where: { email: "trainer@opecode.local" },
      update: {
        firstName: "Trainer",
        lastName: "Demo",
        role: Role.TRAINER,
        passwordHash: trainerPasswordHash,
      },
      create: {
        firstName: "Trainer",
        lastName: "Demo",
        email: "trainer@opecode.local",
        role: Role.TRAINER,
        passwordHash: trainerPasswordHash,
      },
    });

    const student = await prisma.user.upsert({
      where: { email: "student@opecode.local" },
      update: {
        firstName: "Student",
        lastName: "Demo",
        role: Role.STUDENT,
        passwordHash: studentPasswordHash,
      },
      create: {
        firstName: "Student",
        lastName: "Demo",
        email: "student@opecode.local",
        role: Role.STUDENT,
        passwordHash: studentPasswordHash,
      },
    });

    await prisma.studentProfile.upsert({
      where: { userId: student.id },
      update: {
        trainerId: trainer.id,
        status: StudentStatus.ACTIVE,
      },
      create: {
        userId: student.id,
        trainerId: trainer.id,
        status: StudentStatus.ACTIVE,
      },
    });
  }

  console.info(`Seed completed. Admin user: ${admin.email}`);
}

main()
  .catch((error) => {
    console.error("Seed failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
