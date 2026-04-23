import { prisma } from "../lib/prisma";

import { DEFAULT_MONTHLY_AMOUNT_IN_CENTS } from "../features/payments/repository";
import { addDays, normalizeToBuenosAiresDay } from "../features/payments/timezone";

const prismaPayments = prisma as any;

async function main() {
  const studentProfilesWithoutCurrentPayment = await prismaPayments.studentProfile.findMany({
    where: {
      currentPayment: {
        is: null,
      },
    },
    select: {
      id: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  if (studentProfilesWithoutCurrentPayment.length === 0) {
    console.info("Backfill complete. No students without current payment were found.");
    return;
  }

  await prismaPayments.currentPayment.createMany({
    data: studentProfilesWithoutCurrentPayment.map((studentProfile: { id: string; createdAt: Date }) => {
      const startDate = normalizeToBuenosAiresDay(studentProfile.createdAt);

      return {
        studentProfileId: studentProfile.id,
        amountInCents: DEFAULT_MONTHLY_AMOUNT_IN_CENTS,
        startDate,
        dueDate: addDays(startDate, 30),
      };
    }),
    skipDuplicates: true,
  });

  console.info(
    `Backfill complete. Created/ensured ${studentProfilesWithoutCurrentPayment.length} current payment row(s).`
  );
}

main()
  .catch((error) => {
    console.error("Current payment backfill failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
