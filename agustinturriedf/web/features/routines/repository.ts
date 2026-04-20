import { prisma } from "@/lib/prisma";

import {
  buildRoutineFolderDisplayName,
  buildRoutineFolderStorageKey,
} from "@/features/routines/folder-metadata";

const prismaRoutines = prisma as any;

const routineFolderWithFilesInclude = {
  files: {
    orderBy: {
      uploadedAt: "desc",
    },
  },
} as const;

type RoutineFolderCreateInput = {
  studentProfileId: string;
  firstName: string;
  lastName: string;
  email: string;
};

type CreateRoutineFileRepositoryInput = {
  folderId: string;
  originalName: string;
  normalizedName: string;
  extension: string;
  relativePath: string;
  sizeBytes: number;
  observations?: string | null;
};

type UpdateRoutineFileStorageRepositoryInput = {
  relativePath: string;
  normalizedName?: string;
};

const folderOwnershipInclude = {
  studentProfile: {
    select: {
      id: true,
      userId: true,
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
  },
  files: {
    orderBy: {
      uploadedAt: "desc",
    },
  },
} as const;

export class RoutinesRepository {
  async findFolderByStudentProfileId(studentProfileId: string) {
    return prismaRoutines.routineFolder.findUnique({
      where: { studentProfileId },
      include: routineFolderWithFilesInclude,
    });
  }

  async findFolderById(folderId: string) {
    return prismaRoutines.routineFolder.findUnique({
      where: { id: folderId },
      include: routineFolderWithFilesInclude,
    });
  }

  async findFolderWithOwnershipById(folderId: string) {
    return prismaRoutines.routineFolder.findUnique({
      where: { id: folderId },
      include: folderOwnershipInclude,
    });
  }

  async findFolderByStudentUserId(userId: string) {
    return prismaRoutines.routineFolder.findFirst({
      where: {
        studentProfile: {
          userId,
        },
      },
      include: folderOwnershipInclude,
    });
  }

  async listFoldersWithOwnership() {
    return prismaRoutines.routineFolder.findMany({
      include: folderOwnershipInclude,
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  async ensureFolderForStudent(input: RoutineFolderCreateInput) {
    return prismaRoutines.routineFolder.upsert({
      where: {
        studentProfileId: input.studentProfileId,
      },
      update: {},
      create: {
        studentProfileId: input.studentProfileId,
        displayName: buildRoutineFolderDisplayName(input.firstName, input.lastName),
        storageKey: buildRoutineFolderStorageKey(input.email),
      },
      include: routineFolderWithFilesInclude,
    });
  }

  async deleteFolderByStudentProfileId(studentProfileId: string) {
    const folder = await prismaRoutines.routineFolder.findUnique({
      where: { studentProfileId },
      include: routineFolderWithFilesInclude,
    });

    if (!folder) {
      return null;
    }

    await prismaRoutines.routineFolder.delete({
      where: { id: folder.id },
    });

    return folder;
  }

  async createFile(input: CreateRoutineFileRepositoryInput) {
    return prismaRoutines.routineFile.create({
      data: {
        folderId: input.folderId,
        originalName: input.originalName,
        normalizedName: input.normalizedName,
        extension: input.extension,
        relativePath: input.relativePath,
        sizeBytes: input.sizeBytes,
        observations: input.observations,
      },
    });
  }

  async updateFileStorage(fileId: string, input: UpdateRoutineFileStorageRepositoryInput) {
    return prismaRoutines.routineFile.update({
      where: { id: fileId },
      data: {
        relativePath: input.relativePath,
        ...(input.normalizedName
          ? {
              normalizedName: input.normalizedName,
            }
          : {}),
      },
    });
  }

  async findFileById(fileId: string) {
    return prismaRoutines.routineFile.findUnique({
      where: { id: fileId },
    });
  }

  async findFileWithOwnershipById(fileId: string) {
    return prismaRoutines.routineFile.findUnique({
      where: { id: fileId },
      include: {
        folder: {
          include: {
            studentProfile: {
              select: {
                id: true,
                userId: true,
              },
            },
          },
        },
      },
    });
  }

  async deleteFileById(fileId: string) {
    return prismaRoutines.routineFile.delete({
      where: { id: fileId },
    });
  }

  async listFilesByFolderId(folderId: string) {
    return prismaRoutines.routineFile.findMany({
      where: { folderId },
      orderBy: {
        uploadedAt: "desc",
      },
    });
  }

  async listStudentProfilesMissingRoutineFolder() {
    return prismaRoutines.studentProfile.findMany({
      where: {
        routineFolder: {
          is: null,
        },
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });
  }

  async backfillMissingRoutineFolders() {
    const studentsWithoutFolder = await this.listStudentProfilesMissingRoutineFolder();

    if (studentsWithoutFolder.length === 0) {
      return [];
    }

    const createdFolders = await prismaRoutines.$transaction(
      studentsWithoutFolder.map((student: any) =>
        prismaRoutines.routineFolder.create({
          data: {
            studentProfileId: student.id,
            displayName: buildRoutineFolderDisplayName(student.user.firstName, student.user.lastName),
            storageKey: buildRoutineFolderStorageKey(student.user.email),
          },
          include: routineFolderWithFilesInclude,
        })
      )
    );

    return createdFolders;
  }
}

export const routinesRepository = new RoutinesRepository();
