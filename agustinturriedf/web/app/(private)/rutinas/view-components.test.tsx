import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const resolveRutinasFile = (...segments: string[]) =>
  path.join(process.cwd(), "app", "(private)", "rutinas", ...segments);

describe("rutinas view-components", () => {
  it("supports grid/list modes and keeps folder detail links", () => {
    const source = readFileSync(resolveRutinasFile("view-components.tsx"), "utf8");

    expect(source).toContain("type RoutineFolderViewMode");
    expect(source).toContain("viewMode = \"grid\"");
    expect(source).toContain("styles.folderGridList");
    expect(source).toContain("styles.folderCardList");
    expect(source).toContain("href={`/rutinas/${folder.id}`}");
  });
});
