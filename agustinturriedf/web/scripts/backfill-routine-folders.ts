import { prisma } from "../lib/prisma";

import { routinesRepository } from "../features/routines/repository";
import { ensureStudentRoutineDirectory } from "../features/routines/storage";

async function main() {
  const createdFolders = await routinesRepository.backfillMissingRoutineFolders();

  await Promise.all(
    createdFolders.map((folder: { studentProfileId: string }) =>
      ensureStudentRoutineDirectory(folder.studentProfileId)
    )
  );

  console.info(`Backfill complete. Created ${createdFolders.length} routine folder(s).`);
}

main()
  .catch((error) => {
    console.error("Routine folder backfill failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
