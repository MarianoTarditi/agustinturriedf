import { utils, read, write } from "xlsx";

export type RoutineWorkbookSheet = {
  name: string;
  rows: string[][];
};

export type RoutineWorkbookPreview = {
  sheets: RoutineWorkbookSheet[];
};

const normalizeWorksheet = (worksheet: unknown): string[][] => {
  const rawRows = utils.sheet_to_json<(string | number | boolean | Date | null)[]>(worksheet as never, {
    header: 1,
    raw: false,
    blankrows: true,
    defval: "",
  });

  return rawRows.map((row) => row.map((cell) => (cell == null ? "" : String(cell))));
};

export const parseRoutineWorkbookPreview = (buffer: ArrayBuffer): RoutineWorkbookPreview => {
  const workbook = read(buffer, {
    type: "array",
    cellDates: false,
  });

  const sheets = workbook.SheetNames.map((name) => {
    const worksheet = workbook.Sheets[name];
    return {
      name,
      rows: worksheet ? normalizeWorksheet(worksheet) : [],
    };
  });

  return { sheets };
};

export type RoutineEditableWorkbook = {
  sheets: RoutineWorkbookSheet[];
};

/**
 * Serialize an in-memory workbook back to binary Excel format.
 * Uses the same sheet_to_json round-trip that preserves cell content.
 * The caller is responsible for determining the correct bookType (xlsx vs xls)
 * based on the original file extension.
 */
export const serializeRoutineWorkbook = (
  workbook: RoutineEditableWorkbook,
  bookType: "xlsx" | "xls" = "xlsx"
): ArrayBuffer => {
  const newWorkbook = utils.book_new();

  workbook.sheets.forEach((sheet) => {
    const aoa = sheet.rows.map((row) =>
      row.map((cell) => {
        const parsed = Number(cell);
        if (!Number.isNaN(parsed) && cell.trim() !== "") {
          return parsed;
        }
        return cell;
      })
    );
    const worksheet = utils.aoa_to_sheet(aoa);
    utils.book_append_sheet(newWorkbook, worksheet, sheet.name);
  });

  return write(newWorkbook, { type: "array", bookType }) as unknown as ArrayBuffer;
};
