import { describe, expect, it } from "vitest";
import { utils, write } from "xlsx";

import { parseRoutineWorkbookPreview } from "@/app/(private)/rutinas/spreadsheet-preview";

const buildWorkbookBytes = (bookType: "xls" | "xlsx") => {
  const workbook = utils.book_new();
  const primarySheet = utils.aoa_to_sheet([
    ["Ejercicio", "Series", "Reps"],
    ["Sentadilla", 4, 10],
    ["Press banca", "", 8],
  ]);
  const secondarySheet = utils.aoa_to_sheet([
    ["Día", "Cardio"],
    ["Lunes", "30 min"],
  ]);

  utils.book_append_sheet(workbook, primarySheet, "Fuerza");
  utils.book_append_sheet(workbook, secondarySheet, "Cardio");

  return write(workbook, { type: "array", bookType });
};

describe("spreadsheet preview parser", () => {
  it("parses xlsx files preserving full rows and empty cells", () => {
    const workbook = parseRoutineWorkbookPreview(buildWorkbookBytes("xlsx"));

    expect(workbook.sheets).toHaveLength(2);
    expect(workbook.sheets[0]?.name).toBe("Fuerza");
    expect(workbook.sheets[0]?.rows).toEqual([
      ["Ejercicio", "Series", "Reps"],
      ["Sentadilla", "4", "10"],
      ["Press banca", "", "8"],
    ]);
  });

  it("parses legacy xls files with multiple sheets", () => {
    const workbook = parseRoutineWorkbookPreview(buildWorkbookBytes("xls"));

    expect(workbook.sheets.map((sheet) => sheet.name)).toEqual(["Fuerza", "Cardio"]);
    expect(workbook.sheets[1]?.rows).toEqual([
      ["Día", "Cardio"],
      ["Lunes", "30 min"],
    ]);
  });
});
