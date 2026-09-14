import { supabase } from './supabase';
import { readSheetRows, extractIdList } from './spreadsheet';

// Table names in Supabase.
export const WORK_ORDERS_TABLE = 'work_orders';
export const WORK_ORDER_ITEMS_TABLE = 'work_order_items';

// The three equipment categories a work order tracks.
export const WO_CATEGORIES = [
  { key: 'module', label: 'Solar Panel', csvLabel: 'Module Serial' },
  { key: 'battery', label: 'Battery', csvLabel: 'Battery Serial' },
  { key: 'luminaire', label: 'Luminaire', csvLabel: 'Luminaire Serial' },
];

export const CATEGORY_LABELS = WO_CATEGORIES.reduce((acc, c) => {
  acc[c.key] = c.label;
  return acc;
}, {});

// ===== Work orders =====

// List all work orders (most recent first).
export async function fetchWorkOrders() {
  const { data, error } = await supabase
    .from(WORK_ORDERS_TABLE)
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

// Create a work order and return the created row.
export async function createWorkOrder({ name, description = '', createdBy = '' }) {
  const clean = String(name || '').trim();
  if (!clean) throw new Error('Work order name is required.');
  const { data, error } = await supabase
    .from(WORK_ORDERS_TABLE)
    .insert([{ name: clean, description: description || null, created_by: createdBy || null }])
    .select();
  if (error) throw error;
  return data?.[0] || null;
}

// Find an existing work order by name (case-insensitive) or create it if it doesn't exist.
export async function findOrCreateWorkOrder({ name, description = '', createdBy = '' }) {
  const clean = String(name || '').trim();
  if (!clean) throw new Error('Work order name is required.');
  
  // First, try to find existing work order
  const { data: existing, error: findError } = await supabase
    .from(WORK_ORDERS_TABLE)
    .select('*')
    .ilike('name', clean)
    .limit(1);
  
  if (findError) throw findError;
  
  // If found, return it
  if (existing && existing.length > 0) {
    return existing[0];
  }
  
  // Otherwise, create new work order
  return await createWorkOrder({ name: clean, description, createdBy });
}

export async function deleteWorkOrder(id) {
  const { error } = await supabase.from(WORK_ORDERS_TABLE).delete().eq('id', id);
  if (error) throw error;
}

// ===== Work order items (serials) =====

// Fetch every item for a work order, paging past the 1000-row cap.
export async function fetchWorkOrderItems(workOrderId) {
  const batchSize = 1000;
  let from = 0;
  const all = [];
  for (;;) {
    const { data, error } = await supabase
      .from(WORK_ORDER_ITEMS_TABLE)
      .select('*')
      .eq('work_order_id', workOrderId)
      .order('created_at', { ascending: true })
      .range(from, from + batchSize - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < batchSize) break;
    from += batchSize;
  }
  return all;
}

// Insert serials for one category. Duplicates (same work order + category +
// serial) are ignored so re-uploading a sheet is safe.
export async function insertWorkOrderItems(workOrderId, category, serials) {
  const seen = new Set();
  const payload = [];
  for (const raw of serials) {
    const serial = String(raw || '').trim();
    if (!serial) continue;
    const dedupeKey = serial.toLowerCase();
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    payload.push({ work_order_id: workOrderId, category, serial });
  }
  if (payload.length === 0) return { inserted: 0 };

  // Ignore rows that collide with the unique index (already imported).
  const { data, error } = await supabase
    .from(WORK_ORDER_ITEMS_TABLE)
    .upsert(payload, {
      onConflict: 'work_order_id,category,serial',
      ignoreDuplicates: true,
    })
    .select();
  if (error) throw error;
  return { inserted: data?.length || 0 };
}

// Mark a single item as used.
export async function markItemUsed(id, usedBy = '') {
  const { data, error } = await supabase
    .from(WORK_ORDER_ITEMS_TABLE)
    .update({ status: 'used', used_by: usedBy || null, used_at: new Date().toISOString() })
    .eq('id', id)
    .select();
  if (error) throw error;
  return data?.[0] || null;
}

// Revert a used item back to available.
export async function markItemAvailable(id) {
  const { data, error } = await supabase
    .from(WORK_ORDER_ITEMS_TABLE)
    .update({ status: 'available', used_by: null, used_at: null })
    .eq('id', id)
    .select();
  if (error) throw error;
  return data?.[0] || null;
}

export async function deleteWorkOrderItem(id) {
  const { error } = await supabase.from(WORK_ORDER_ITEMS_TABLE).delete().eq('id', id);
  if (error) throw error;
}

// Mark several items as used in a single request. Cuts the per-submission
// request count (previously one UPDATE per serial) down to one.
export async function markItemsUsed(ids, usedBy = '') {
  const list = (ids || []).filter(Boolean);
  if (list.length === 0) return { updated: 0 };
  const { data, error } = await supabase
    .from(WORK_ORDER_ITEMS_TABLE)
    .update({ status: 'used', used_by: usedBy || null, used_at: new Date().toISOString() })
    .in('id', list)
    .select();
  if (error) throw error;
  return { updated: data?.length || 0 };
}

// Compute per-category totals/used counts from a flat items array.
export function summarizeItems(items) {
  const summary = {};
  for (const { key } of WO_CATEGORIES) {
    summary[key] = { total: 0, used: 0 };
  }
  for (const item of items) {
    const bucket = summary[item.category];
    if (!bucket) continue;
    bucket.total += 1;
    if (item.status === 'used') bucket.used += 1;
  }
  const total = Object.values(summary).reduce((s, b) => s + b.total, 0);
  const used = Object.values(summary).reduce((s, b) => s + b.used, 0);
  return { summary, total, used, pending: total - used };
}

// Read a serial list from an uploaded spreadsheet/CSV file.
export async function parseSerialFile(file) {
  const rows = await readSheetRows(file);
  return extractIdList(rows);
}


// Check if a serial number is already used in ANY work order.
// Returns { isUsed: boolean, workOrder: string|null, usedBy: string|null, usedAt: string|null }
export async function checkSerialUsageAcrossWorkOrders(serial, category) {
  const cleanSerial = String(serial || '').trim();
  if (!cleanSerial) return { isUsed: false, workOrder: null, usedBy: null, usedAt: null };

  // Query all work order items with this serial and category
  const { data, error } = await supabase
    .from(WORK_ORDER_ITEMS_TABLE)
    .select(`
      *,
      work_orders:work_order_id (name)
    `)
    .eq('category', category)
    .ilike('serial', cleanSerial)
    .eq('status', 'used')
    .limit(1);

  if (error) throw error;

  if (data && data.length > 0) {
    const item = data[0];
    return {
      isUsed: true,
      workOrder: item.work_orders?.name || 'Unknown',
      usedBy: item.used_by,
      usedAt: item.used_at,
    };
  }

  return { isUsed: false, workOrder: null, usedBy: null, usedAt: null };
}

// Check multiple serial numbers at once for efficiency
// Returns a map: { serial: { isUsed, workOrder, usedBy, usedAt } }
export async function checkMultipleSerialsUsage(serials, category) {
  const cleanSerials = serials.map(s => String(s || '').trim()).filter(Boolean);
  if (cleanSerials.length === 0) return {};

  const { data, error } = await supabase
    .from(WORK_ORDER_ITEMS_TABLE)
    .select(`
      *,
      work_orders:work_order_id (name)
    `)
    .eq('category', category)
    .in('serial', cleanSerials)
    .eq('status', 'used');

  if (error) throw error;

  const result = {};
  for (const serial of cleanSerials) {
    result[serial] = { isUsed: false, workOrder: null, usedBy: null, usedAt: null };
  }

  for (const item of data || []) {
    result[item.serial] = {
      isUsed: true,
      workOrder: item.work_orders?.name || 'Unknown',
      usedBy: item.used_by,
      usedAt: item.used_at,
    };
  }

  return result;
}
