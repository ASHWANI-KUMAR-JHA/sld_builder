// Helpers for capturing the device GPS location and stamping (superimposing)
// the latitude / longitude onto the bottom-right corner of a photo.
//
// The stamp is burned into the pixels of the image itself so the coordinates
// travel with the file everywhere it is shown (form review, admin register,
// exports, downloads) without any extra rendering logic.

// Ask the browser for the current GPS position.
// Resolves to { latitude, longitude, accuracy } or rejects with an Error.
export function getCurrentPosition(options = {}) {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error('Location is not supported on this device.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        resolve({ latitude, longitude, accuracy });
      },
      (err) => {
        const messages = {
          1: 'Location permission denied. Please allow location access and try again.',
          2: 'Location is unavailable right now. Move to an open area and try again.',
          3: 'Getting location timed out. Please try again.',
        };
        reject(new Error(messages[err.code] || 'Could not get your location.'));
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0, ...options }
    );
  });
}

// Format a coordinate to a fixed number of decimals for display / stamping.
export function formatCoord(value, digits = 6) {
  const n = Number(value);
  return Number.isFinite(n) ? n.toFixed(digits) : '';
}

// Reverse-geocode a latitude / longitude into place details using the free
// OpenStreetMap Nominatim API (no key required). Returns an object mapping the
// caller's semantics:
//   village  -> address.suburb (falls back to village / hamlet / town / neighbourhood)
//   assembly -> address.city   (falls back to town / county / municipality)
//   state    -> address.state
// The full Nominatim payload is returned under `raw` so callers can display /
// debug exactly what the API sent back.
// Any lookup failure resolves to empty strings so the flow never blocks on it.
//
// NOTE: `zoom=18` is used to match the Geolocation Inspector (GeoDebug) page.
// A lower zoom (e.g. 14) makes Nominatim snap to a larger/coarser area, which
// is why the form previously resolved a different suburb than the debug page.
export async function reverseGeocode(latitude, longitude) {
  const empty = { village: '', assembly: '', state: '', display: '', raw: null };
  const lat = Number(latitude);
  const lng = Number(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return empty;

  try {
    const url =
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2` +
      `&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return empty;
    const data = await res.json();
    const a = data.address || {};
    return {
      village:
        a.suburb || a.neighbourhood || a.village || a.hamlet ||
        a.town || a.city_district || a.residential || '',
      assembly:
        a.city || a.town || a.municipality || a.county || a.state_district || '',
      state: a.state || '',
      display: data.display_name || '',
      raw: data,
    };
  } catch {
    return empty;
  }
}

// Load a File / Blob into an HTMLImageElement.
function loadImage(fileOrBlob) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(fileOrBlob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not read the captured image.'));
    };
    img.src = url;
  });
}

// Draw the given lines of text as a translucent panel in the bottom-right
// corner of the canvas. Text auto-scales with the image size so it stays
// readable on both small and large photos.
function drawStamp(ctx, canvasWidth, canvasHeight, lines) {
  const base = Math.max(canvasWidth, canvasHeight);
  const fontSize = Math.max(14, Math.round(base * 0.022));
  const pad = Math.round(fontSize * 0.6);
  const lineHeight = Math.round(fontSize * 1.3);
  const margin = Math.round(fontSize * 0.8);

  ctx.font = `600 ${fontSize}px Arial, sans-serif`;
  ctx.textBaseline = 'top';

  const textWidth = Math.max(...lines.map((t) => ctx.measureText(t).width));
  const boxW = textWidth + pad * 2;
  const boxH = lines.length * lineHeight + pad * 2 - (lineHeight - fontSize);
  const boxX = canvasWidth - boxW - margin;
  const boxY = canvasHeight - boxH - margin;

  // Translucent dark background for contrast.
  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
  ctx.fillRect(boxX, boxY, boxW, boxH);

  // Text with a subtle shadow so it reads on any background.
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
  ctx.shadowBlur = Math.round(fontSize * 0.15);
  lines.forEach((text, i) => {
    ctx.fillText(text, boxX + pad, boxY + pad + i * lineHeight);
  });
  ctx.shadowBlur = 0;
}

// Stamp latitude / longitude (and an optional timestamp) onto a photo and
// return a new JPEG File with the coordinates burned into the bottom-right.
//
// `source`   : File | Blob of the original photo
// `latitude` : number
// `longitude`: number
// `place`    : optional address details to burn onto the photo. Any of:
//              { exact_location, village, block, assembly, state } — whichever
//              are present are stamped. This can come from reverseGeocode() or
//              directly from the values the user typed into the form fields.
// `fileName` : desired output file name (defaults to original / site-photo)
export async function stampCoordinatesOnImage(source, latitude, longitude, place = {}, fileName) {
  const img = await loadImage(source);

  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth || img.width;
  canvas.height = img.naturalHeight || img.height;

  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  const stamp = new Date();
  const lines = [
    `Lat ${formatCoord(latitude)}  Long ${formatCoord(longitude)}`,
  ];
  if (place.exact_location) lines.push(`Location: ${place.exact_location}`);
  if (place.village) lines.push(`Village: ${place.village}`);
  if (place.block) lines.push(`Block: ${place.block}`);
  if (place.assembly) lines.push(`Assembly: ${place.assembly}`);
  if (place.state) lines.push(`State: ${place.state}`);
  lines.push(stamp.toLocaleDateString());
  lines.push(stamp.toLocaleTimeString());
  drawStamp(ctx, canvas.width, canvas.height, lines);

  const blob = await new Promise((resolve) =>
    canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.92)
  );
  if (!blob) throw new Error('Could not process the captured image.');

  const baseName = (fileName || source.name || 'site-photo')
    .replace(/\.[^.]+$/, '')
    .replace(/[^\w.\-]+/g, '_') || 'site-photo';
  return new File([blob], `${baseName}_geotagged.jpg`, { type: 'image/jpeg' });
}
