// Shared spreadsheet parsing helpers built on SheetJS (xlsx).
// Handles binary Excel workbooks (.xlsx/.xls) as well as text formats
// (.csv/.tsv/.txt). Reading .xlsx as plain text corrupts the data, so we
// always route through SheetJS for spreadsheet files.
// SheetJS is loaded lazily (only when an Excel file is actually parsed) to
// keep it out of the initial bundle.

const EXCEL_EXT = /\.(xlsx|xlsm|xlsb|xls|ods)$/i;

// True when the file looks like a binary spreadsheet that must be parsed
// with SheetJS rather than read as text.
export function isSpreadsheetFile(file) {
  const name = file?.name || '';
  const type = file?.type || '';
  return (
    EXCEL_EXT.test(name) ||
    type.includes('spreadsheetml') ||
    type.includes('ms-excel') ||
    type.includes('opendocument.spreadsheet')
  );
}

// Read a file into an array-of-arrays (rows of string cells).
// - Excel files are decoded from an ArrayBuffer via SheetJS.
// - Text files (csv/tsv/txt) are read as text and delimiter-split.
export function readSheetRows(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => reject(new Error('Could not read the file.'));

    if (isSpreadsheetFile(file)) {
      reader.onload = async () => {
        try {
          const XLSX = await import('xlsx');
          const data = new Uint8Array(reader.result);
          const wb = XLSX.read(data, { type: 'array' });
          const sheet = wb.Sheets[wb.SheetNames[0]];
          const rows = XLSX.utils.sheet_to_json(sheet, {
            header: 1,
            blankrows: false,
            raw: false,
            defval: '',
          });
          resolve(rows.map((r) => r.map((c) => (c == null ? '' : String(c).trim()))));
        } catch (err) {
          reject(new Error(`Could not read Excel file: ${err.message}`));
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      reader.onload = () => {
        try {
          resolve(textToRows(String(reader.result || '')));
        } catch (err) {
          reject(err);
        }
      };
      reader.readAsText(file);
    }
  });
}

// Split delimited text (TSV / CSV) into rows of trimmed cells. Respects
// double-quoted fields that contain commas.
export function textToRows(text) {
  return text
    .split(/\r?\n/)
    .filter((l) => l.trim() !== '')
    .map((line) =>
      line
        .split(/\t|,(?=(?:[^"]*"[^"]*")*[^"]*$)/)
        .map((c) => c.trim().replace(/^"|"$/g, ''))
    );
}

// Extract a flat list of IDs from rows of cells, taking the first
// meaningful column of each row. Mirrors the paste-parsing rules used for
// the JCR attached lists (skips headers and leading row-numbers).
export function extractIdList(cellRows) {
  const ids = [];
  const isHeader = (v) =>
    /^(s\.?\s*no\.?|sr\.?\s*no\.?|count|id|serial|serial\s*no\.?|module\s*serial\s*no\.?)$/i.test(v);
  const isRowNumber = (v) => /^\d{1,4}[).]?$/.test(v);

  for (const rawCells of cellRows) {
    const cells = rawCells.map((c) => String(c).trim()).filter(Boolean);
    if (cells.length === 0) continue;

    let id = cells[0];
    if (isHeader(id)) continue;
    if (isRowNumber(id) && cells.length > 1) id = cells[1];
    id = id.replace(/^\d{1,4}[).]/, '').trim() || id;
    if (!id || isHeader(id)) continue;
    ids.push(id);
  }
  return ids;
}
