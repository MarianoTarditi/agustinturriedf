import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

type CreateVideotecaFileRepositoryInput = {
  folderId: string;
  originalName: string;
  normalizedName: string;
  extension: string;
  mediaType: "image" | "video";
  relativePath: string;
  sizeBytes: number;
  orderIndex: number;
};

type UpdateVideotecaFileMetadataRepositoryInput = {
  originalName: string;
  normalizedName: string;
};

const videotecaFolderSummarySelect = {
  id: true,
  name: true,
  parentId: true,
  updatedAt: true,
  _count: {
    select: {
      files: true,
    },
  },
} satisfies Prisma.VideotecaFolderSelect;

const videotecaFolderParentSelect = {
  id: true,
  name: true,
} satisfies Prisma.VideotecaFolderSelect;

const videotecaFolderDetailSelect = {
  id: true,
  name: true,
  parentId: true,
  updatedAt: true,
  parent: {
    select: videotecaFolderParentSelect,
  },
  children: {
    select: videotecaFolderSummarySelect,
    orderBy: {
      updatedAt: "desc",
    },
  },
  files: {
    orderBy: [{ orderIndex: "asc" }, { createdAt: "asc" }],
  },
} satisfies Prisma.VideotecaFolderSelect;

export class VideotecaRepository {
  async listFolders() {
    return prisma.videotecaFolder.findMany({
      where: {
        parentId: null,
      },
      select: videotecaFolderSummarySelect,
      orderBy: {
        updatedAt: "desc",
      },
    });
  }

  async createFolder(name: string, parentId: string | null) {
    return prisma.videotecaFolder.create({
      data: {
        name,
        parentId,
      },
      select: videotecaFolderSummarySelect,
    });
  }

  async renameFolder(folderId: string, name: string) {
    return prisma.videotecaFolder.update({
      where: { id: folderId },
      data: {
        name,
      },
      select: videotecaFolderSummarySelect,
    });
  }

  async deleteFolder(folderId: string) {
    return prisma.videotecaFolder.delete({
      where: { id: folderId },
      select: videotecaFolderSummarySelect,
    });
  }

  async findFolderById(folderId: string) {
    return prisma.videotecaFolder.findUnique({
      where: { id: folderId },
      select: videotecaFolderDetailSelect,
    });
  }

  async findFolderSummaryById(folderId: string) {
    return prisma.videotecaFolder.findUnique({
      where: { id: folderId },
      select: videotecaFolderSummarySelect,
    });
  }

  async getNextOrderIndex(folderId: string) {
    const result = await prisma.videotecaFile.aggregate({
      where: { folderId },
      _max: {
        orderIndex: true,
      },
    });

    return (result._max.orderIndex ?? -1) + 1;
  }

  async createFile(input: CreateVideotecaFileRepositoryInput) {
    return prisma.videotecaFile.create({
      data: {
        folderId: input.folderId,
        originalName: input.originalName,
        normalizedName: input.normalizedName,
        extension: input.extension,
        mediaType: input.mediaType,
        relativePath: input.relativePath,
        sizeBytes: input.sizeBytes,
        orderIndex: input.orderIndex,
      },
    });
  }

  async updateFileStorage(fileId: string, relativePath: string) {
    return prisma.videotecaFile.update({
      where: { id: fileId },
      data: { relativePath },
    });
  }

  async updateFileMetadata(fileId: string, input: UpdateVideotecaFileMetadataRepositoryInput) {
    return prisma.videotecaFile.update({
      where: { id: fileId },
      data: {
        originalName: input.originalName,
        normalizedName: input.normalizedName,
      },
    });
  }

  async findFileById(fileId: string) {
    return prisma.videotecaFile.findUnique({
      where: { id: fileId },
    });
  }

  async deleteFileById(fileId: string) {
    return prisma.videotecaFile.delete({
      where: { id: fileId },
    });
  }

  async touchFolder(folderId: string) {
    return prisma.videotecaFolder.update({
      where: { id: folderId },
      data: {
        updatedAt: new Date(),
      },
    });
  }
}

export const videotecaRepository = new VideotecaRepository();
