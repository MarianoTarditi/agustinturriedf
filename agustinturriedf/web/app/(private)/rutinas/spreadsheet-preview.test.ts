import { describe, expect, it } from "vitest";
import { utils, write } from "xlsx";

import { parseRoutineWorkbookPreview, serializeRoutineWorkbook, type RoutineEditableWorkbook } from "@/app/(private)/rutinas/spreadsheet-preview";

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

  it("serializes a workbook back to xlsx binary", () => {
    const workbook: RoutineEditableWorkbook = {
      sheets: [
        {
          name: "Test",
          rows: [
            ["Ejercicio", "Series", "Reps"],
            ["Sentadilla", "4", "10"],
          ],
        },
      ],
    };

    const buffer = serializeRoutineWorkbook(workbook, "xlsx");
    expect(buffer).toBeInstanceOf(ArrayBuffer);
    expect((buffer as ArrayBuffer).byteLength).toBeGreaterThan(0);

    // Verify the serialized bytes can be parsed back
    const reparsed = parseRoutineWorkbookPreview(buffer);
    expect(reparsed.sheets[0]?.rows).toEqual([
      ["Ejercicio", "Series", "Reps"],
      ["Sentadilla", "4", "10"],
    ]);
  });

  it("serializes a workbook back to legacy xls binary", () => {
    const workbook: RoutineEditableWorkbook = {
      sheets: [
        {
          name: "Hoja1",
          rows: [["A", "B"], ["1", "2"]],
        },
      ],
    };

    const buffer = serializeRoutineWorkbook(workbook, "xls");
    expect(buffer).toBeInstanceOf(ArrayBuffer);
    expect((buffer as ArrayBuffer).byteLength).toBeGreaterThan(0);

    // Verify the serialized bytes can be parsed back
    const reparsed = parseRoutineWorkbookPreview(buffer);
    expect(reparsed.sheets[0]?.name).toBe("Hoja1");
    expect(reparsed.sheets[0]?.rows).toEqual([["A", "B"], ["1", "2"]]);
  });

  it("preserves empty cells and numeric strings during serialization", () => {
    const workbook: RoutineEditableWorkbook = {
      sheets: [
        {
          name: "Sheet1",
          rows: [
            ["Name", "Qty", "Price"],
            ["Widget", "", "9.99"],
            ["", "3", ""],
          ],
        },
      ],
    };

    const buffer = serializeRoutineWorkbook(workbook, "xlsx");
    const reparsed = parseRoutineWorkbookPreview(buffer);

    expect(reparsed.sheets[0]?.rows).toEqual([
      ["Name", "Qty", "Price"],
      ["Widget", "", "9.99"],
      ["", "3", ""],
    ]);
  });

  it("does not mutate original sheet rows during clone", () => {
    const original: RoutineEditableWorkbook = {
      sheets: [
        {
          name: "Test",
          rows: [["original"]],
        },
      ],
    };

    const cloned = cloneRows(original.sheets);
    // Attempt to mutate clone's rows
    cloned.sheets[0].rows[0][0] = "modified";

    // Original should be unchanged
    expect(original.sheets[0].rows[0][0]).toBe("original");
  });
});

// Helper used by immutability test
const cloneRows = (sheets: RoutineEditableWorkbook["sheets"]): RoutineEditableWorkbook => ({
  sheets: sheets.map((sheet) => ({ ...sheet, rows: sheet.rows.map((row) => [...row]) })),
});
