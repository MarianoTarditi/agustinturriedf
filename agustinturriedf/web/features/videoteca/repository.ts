import { prisma } from "@/lib/prisma";

const prismaVideoteca = prisma as any;

const videotecaFolderWithFilesInclude = {
  files: {
    orderBy: [{ orderIndex: "asc" }, { createdAt: "asc" }],
  },
} as const;

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

export class VideotecaRepository {
  async findFolderById(folderId: string) {
    return prismaVideoteca.videotecaFolder.findUnique({
      where: { id: folderId },
      include: videotecaFolderWithFilesInclude,
    });
  }

  async getNextOrderIndex(folderId: string) {
    const result = await prismaVideoteca.videotecaFile.aggregate({
      where: { folderId },
      _max: {
        orderIndex: true,
      },
    });

    return (result._max.orderIndex ?? -1) + 1;
  }

  async createFile(input: CreateVideotecaFileRepositoryInput) {
    return prismaVideoteca.videotecaFile.create({
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
    return prismaVideoteca.videotecaFile.update({
      where: { id: fileId },
      data: { relativePath },
    });
  }

  async deleteFileById(fileId: string) {
    return prismaVideoteca.videotecaFile.delete({
      where: { id: fileId },
    });
  }

  async touchFolder(folderId: string) {
    return prismaVideoteca.videotecaFolder.update({
      where: { id: folderId },
      data: {
        updatedAt: new Date(),
      },
    });
  }
}

export const videotecaRepository = new VideotecaRepository();
