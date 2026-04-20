export type CreateFolderInput = {
  name: string;
};

export type CreateFolderDraft = {
  id: string;
  name: string;
  updatedAt: string;
  fileCount: number;
  tags: string[];
};

export function normalizeFolderName(name: string) {
  return name.trim().replace(/\s+/g, " ");
}

export function buildFolderDraft(
  input: CreateFolderInput,
): CreateFolderDraft | null {
  const name = normalizeFolderName(input.name);

  if (!name) return null;

  return {
    id: `folder-${Date.now()}`,
    name,
    updatedAt: new Date().toLocaleDateString("es-AR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }),
    fileCount: 0,
    tags: [],
  };
}
