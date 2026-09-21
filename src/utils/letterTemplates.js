import { supabase } from './supabase';

// Table name in Supabase.
export const LETTER_TEMPLATES_TABLE = 'letter_templates';

// Match {{ variableName }} placeholders. Names may contain letters, numbers,
// underscores, spaces and dots so labels like {{ customer name }} work too.
const VARIABLE_RE = /\{\{\s*([\w .-]+?)\s*\}\}/g;

// Extract the unique, ordered list of variable names used in a template body
// (and optional subject). Preserves first-seen order so the generated input
// fields line up with how they appear in the letter.
export function extractVariables(...texts) {
  const seen = new Set();
  const out = [];
  for (const text of texts) {
    if (!text) continue;
    let match;
    VARIABLE_RE.lastIndex = 0;
    while ((match = VARIABLE_RE.exec(text)) !== null) {
      const name = match[1].trim();
      if (!name) continue;
      const key = name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(name);
    }
  }
  return out;
}

// Replace every {{variable}} in `text` with the matching value from `values`
// (keyed case-insensitively). Missing values are left as an empty string.
export function applyVariables(text, values = {}) {
  if (!text) return '';
  // Build a case-insensitive lookup once.
  const lookup = {};
  for (const [k, v] of Object.entries(values)) {
    lookup[k.trim().toLowerCase()] = v;
  }
  return text.replace(VARIABLE_RE, (_, rawName) => {
    const key = rawName.trim().toLowerCase();
    const val = lookup[key];
    return val == null || val === '' ? '' : String(val);
  });
}

// Turn a variable name into a friendly field label.
export function humanizeVariable(name) {
  return String(name)
    .replace(/[_.-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// ===== CRUD =====

export async function fetchTemplates() {
  const { data, error } = await supabase
    .from(LETTER_TEMPLATES_TABLE)
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function createTemplate({ name, subject = '', body = '', createdBy = '' }) {
  const clean = String(name || '').trim();
  if (!clean) throw new Error('Template name is required.');
  const { data, error } = await supabase
    .from(LETTER_TEMPLATES_TABLE)
    .insert([{ name: clean, subject: subject || null, body: body || '', created_by: createdBy || null }])
    .select();
  if (error) throw error;
  return data?.[0] || null;
}

export async function updateTemplate(id, { name, subject, body }) {
  const patch = {};
  if (name !== undefined) patch.name = String(name).trim();
  if (subject !== undefined) patch.subject = subject || null;
  if (body !== undefined) patch.body = body || '';
  const { data, error } = await supabase
    .from(LETTER_TEMPLATES_TABLE)
    .update(patch)
    .eq('id', id)
    .select();
  if (error) throw error;
  return data?.[0] || null;
}

export async function deleteTemplate(id) {
  const { error } = await supabase.from(LETTER_TEMPLATES_TABLE).delete().eq('id', id);
  if (error) throw error;
}
