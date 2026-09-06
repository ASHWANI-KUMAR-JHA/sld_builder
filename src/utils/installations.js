import { supabase } from './supabase';
import { readSheetRows, textToRows } from './spreadsheet';

// Table name in Supabase
export const INSTALLATIONS_TABLE = 'installations';

// Column keys used across the form, dashboard and Supabase.
// `key` maps to the DB column, `label` is shown in the UI.
export const INSTALLATION_FIELDS = [
  { key: 'project_name', label: 'Project Name' },
  { key: 'work_order', label: 'Work Order' },
  { key: 'sno', label: 'S.No.' },
  { key: 'exact_location', label: 'Exact Location (Landmark)' },
  { key: 'latitude', label: 'Latitude' },
  { key: 'longitude', label: 'Longitude' },
  { key: 'photo_date', label: 'Photo Date' },
  { key: 'village', label: 'Village / Gram Panchayat' },
  { key: 'block', label: 'Name of Block' },
  { key: 'assembly_constituency', label: 'Assembly Constituency' },
  { key: 'commissioning_date', label: 'Date of Commissioning' },
  { key: 'module_serial', label: 'Module Serial Number' },
  { key: 'battery_serial', label: 'Battery Serial Number' },
  { key: 'luminaire_serial', label: 'Luminaire Serial Number' },
  { key: 'rms', label: 'RMS' },
];

// An empty installation row used to seed the form.
export function emptyInstallation() {
  return {
    project_name: '',
    work_order: '',
    sno: '',
    exact_location: '',
    latitude: '',
    longitude: '',
    photo_date: '',
    village: '',
    block: '',
    assembly_constituency: '',
    commissioning_date: '',
    module_serial: '',
    battery_serial: '',
    luminaire_serial: '',
    rms: 'YES',
  };
}

// Normalize a row before inserting: convert empty strings to null so
// nullable columns (project_name, work_order, etc.) stay clean.
function normalizeRow(row) {
  const out = {};
  for (const { key } of INSTALLATION_FIELDS) {
    let value = row[key];
    if (typeof value === 'string') value = value.trim();
    out[key] = value === '' || value === undefined ? null : value;
  }
  return out;
}

// Fetch all installations, most recent first. Optional text search across
// a few key fields.
export async function fetchInstallations({ search = '' } = {}) {
  let query = supabase
    .from(INSTALLATIONS_TABLE)
    .select('*')
    .order('created_at', { ascending: false });

  if (search && search.trim()) {
    const term = `%${search.trim()}%`;
    query = query.or(
      [
        `project_name.ilike.${term}`,
        `work_order.ilike.${term}`,
        `exact_location.ilike.${term}`,
        `village.ilike.${term}`,
        `module_serial.ilike.${term}`,
      ].join(',')
    );
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

// Insert a batch of rows. Empty rows (no meaningful data) are skipped.
export async function insertInstallations(rows) {
  const payload = rows
    .filter((r) =>
      INSTALLATION_FIELDS.some(
        ({ key }) => key !== 'rms' && String(r[key] ?? '').trim() !== ''
      )
    )
    .map(normalizeRow);

  if (payload.length === 0) {
    return { inserted: 0, data: [] };
  }

  const { data, error } = await supabase
    .from(INSTALLATIONS_TABLE)
    .insert(payload)
    .select();

  if (error) throw error;
  return { inserted: data?.length || 0, data: data || [] };
}

export async function deleteInstallation(id) {
  const { error } = await supabase
    .from(INSTALLATIONS_TABLE)
    .delete()
    .eq('id', id);
  if (error) throw error;
}

// Parse pasted tabular data (TSV from Excel / Google Sheets or CSV).
// Expected column order matches your register:
// S.No | Location | Latitude | Longitude | Village/Gram Panchayat |
// Block | Assembly | CommissioningDate | Module | Battery | Luminaire | RMS
export function parsePastedRows(text, { projectName = '', workOrder = '' } = {}) {
  return rowsToInstallations(textToRows(text), { projectName, workOrder });
}

// Map an array-of-arrays (rows of cells) into installation records.
// Shared by pasted text, CSV/TSV and Excel uploads.
function rowsToInstallations(cellRows, { projectName = '', workOrder = '' } = {}) {
  const rows = [];

  for (const cells of cellRows) {
    // Skip a header row if present.
    const first = (cells[0] || '').toLowerCase();
    if (/^(s\.?\s*no\.?|sr\.?no\.?)$/.test(first)) continue;
    if (cells.every((c) => String(c).trim() === '')) continue;

    const [
      sno,
      exact_location,
      latitude,
      longitude,
      village,
      block,
      assembly_constituency,
      commissioning_date,
      module_serial,
      battery_serial,
      luminaire_serial,
      rms,
    ] = cells;

    rows.push({
      ...emptyInstallation(),
      project_name: projectName,
      work_order: workOrder,
      sno: sno || '',
      exact_location: exact_location || '',
      latitude: latitude || '',
      longitude: longitude || '',
      village: village || '',
      block: block || '',
      assembly_constituency: assembly_constituency || '',
      commissioning_date: commissioning_date || '',
      module_serial: module_serial || '',
      battery_serial: battery_serial || '',
      luminaire_serial: luminaire_serial || '',
      rms: rms || 'YES',
    });
  }

  return rows;
}

// Read an uploaded spreadsheet and return parsed installation rows.
// Accepts .xlsx / .xls / .csv / .tsv / .txt (Excel binary files are decoded
// with SheetJS so they no longer arrive corrupted).
export async function parseUploadedFile(file, { projectName = '', workOrder = '' } = {}) {
  const cellRows = await readSheetRows(file);
  return rowsToInstallations(cellRows, { projectName, workOrder });
}
