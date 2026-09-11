import { supabase } from './supabase';

// Supabase Storage bucket that holds installation file uploads.
// Create it in the Supabase dashboard (or via SQL) as a PUBLIC bucket.
export const INSTALLATION_BUCKET = 'installation-files';

// Build a safe, unique storage path for an uploaded file.
// Files are grouped by the logical key (site_image / signed_pdf / attachments)
// so the bucket stays organised and the keys are preserved.
function buildPath(key, file) {
  const stamp = Date.now();
  const rand = Math.random().toString(36).slice(2, 8);
  const safeName = (file.name || 'file')
    .replace(/[^\w.\-]+/g, '_')
    .slice(-80);
  return `${key}/${stamp}_${rand}_${safeName}`;
}

// Upload a single file under the given logical key. Returns metadata that is
// stored on the installation record: { name, path, url, size, type }.
async function uploadOne(key, file) {
  const path = buildPath(key, file);
  const { error } = await supabase.storage
    .from(INSTALLATION_BUCKET)
    .upload(path, file, { cacheControl: '3600', upsert: false });
  if (error) throw new Error(`Upload failed for ${file.name}: ${error.message}`);

  const { data } = supabase.storage.from(INSTALLATION_BUCKET).getPublicUrl(path);
  return {
    name: file.name,
    path,
    url: data?.publicUrl || '',
    size: file.size,
    type: file.type,
  };
}

// Upload the three file groups collected in the form.
// `files` shape: { site_image: File|null, signed_pdf: File|null, attachments: File[] }
// Returns { site_image, signed_pdf, attachments } where the single keys hold one
// metadata object (or null) and attachments holds an array of metadata objects.
// Keys are preserved so they can be written straight onto the installation row.
// `onProgress({ done, total, label })` is called before each file uploads so
// the UI can show a live "Uploading X of Y" indicator.
export async function uploadInstallationFiles(files = {}, onProgress) {
  const result = { site_image: null, signed_pdf: null, attachments: [] };

  const attachments = Array.isArray(files.attachments) ? files.attachments : [];
  const queue = [];
  if (files.site_image) queue.push(['site_image', files.site_image]);
  if (files.signed_pdf) queue.push(['signed_pdf', files.signed_pdf]);
  for (const f of attachments) if (f) queue.push(['attachments', f]);

  const total = queue.length;
  let done = 0;
  for (const [key, file] of queue) {
    onProgress?.({ done, total, label: file.name });
    const meta = await uploadOne(key, file);
    if (key === 'attachments') result.attachments.push(meta);
    else result[key] = meta;
    done += 1;
    onProgress?.({ done, total, label: file.name });
  }

  return result;
}
