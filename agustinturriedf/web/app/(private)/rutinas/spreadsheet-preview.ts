import { utils, read } from "xlsx";

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
