import { useState, useCallback } from 'react';
import { MapPin, Loader2, RefreshCw, Globe } from 'lucide-react';
import './GeoDebug.css';

// A live diagnostic screen that shows EVERY field the browser Geolocation API
// can return, plus an optional reverse-geocode lookup to turn the coordinates
// into a human-readable address. Open it with ?geo=debug in the URL.

function fmt(value, digits = 6) {
  if (value === null || value === undefined) return '—';
  const n = Number(value);
  return Number.isFinite(n) ? n.toFixed(digits) : String(value);
}

// Every property exposed by GeolocationCoordinates + the position timestamp.
const COORD_FIELDS = [
  { key: 'latitude', label: 'Latitude', help: 'Decimal degrees. Always present.' },
  { key: 'longitude', label: 'Longitude', help: 'Decimal degrees. Always present.' },
  { key: 'accuracy', label: 'Accuracy', help: 'Radius of uncertainty in meters (lower is better).', unit: 'm', digits: 1 },
  { key: 'altitude', label: 'Altitude', help: 'Meters above sea level. Often null without a real GPS chip.', unit: 'm', digits: 1 },
  { key: 'altitudeAccuracy', label: 'Altitude Accuracy', help: 'Uncertainty of altitude in meters. Often null.', unit: 'm', digits: 1 },
  { key: 'heading', label: 'Heading', help: 'Direction of travel, 0–360° from true north. Null unless moving.', unit: '°', digits: 1 },
  { key: 'speed', label: 'Speed', help: 'Ground speed in meters/second. Null unless moving.', unit: 'm/s', digits: 2 },
];

function GeoDebug() {
  const [coords, setCoords] = useState(null);
  const [timestamp, setTimestamp] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [address, setAddress] = useState(null);
  const [addrLoading, setAddrLoading] = useState(false);
  const [addrError, setAddrError] = useState('');

  const capture = useCallback(() => {
    setError('');
    setAddress(null);
    setAddrError('');
    if (!('geolocation' in navigator)) {
      setError('Geolocation is not supported on this device/browser.');
      return;
    }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const c = pos.coords;
        // Copy every field explicitly — coords is not a plain object.
        setCoords({
          latitude: c.latitude,
          longitude: c.longitude,
          accuracy: c.accuracy,
          altitude: c.altitude,
          altitudeAccuracy: c.altitudeAccuracy,
          heading: c.heading,
          speed: c.speed,
        });
        setTimestamp(pos.timestamp);
        setLoading(false);
      },
      (err) => {
        const messages = {
          1: 'Permission denied. Allow location access and try again.',
          2: 'Position unavailable. Move to an open area and retry.',
          3: 'Timed out while getting your location.',
        };
        setError(messages[err.code] || err.message || 'Could not get location.');
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
    );
  }, []);

  // Reverse geocode with OpenStreetMap Nominatim (free, no API key).
  // This is where address-level data (village, district, state, pincode) comes from.
  const lookupAddress = useCallback(async () => {
    if (!coords) return;
    setAddrError('');
    setAddrLoading(true);
    try {
      const url =
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2` +
        `&lat=${coords.latitude}&lon=${coords.longitude}&addressdetails=1&zoom=18`;
      const res = await fetch(url, { headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error(`Lookup failed (HTTP ${res.status}).`);
      const data = await res.json();
      setAddress(data);
    } catch (err) {
      setAddrError(err.message || 'Reverse geocoding failed.');
    } finally {
      setAddrLoading(false);
    }
  }, [coords]);

  return (
    <div className="geo-page">
      <div className="geo-card">
        <header className="geo-head">
          <MapPin size={22} />
          <div>
            <h1>Geolocation Inspector</h1>
            <p>Shows every value the browser location API returns for your current position.</p>
          </div>
        </header>

        <div className="geo-actions">
          <button className="geo-btn geo-btn-primary" onClick={capture} disabled={loading}>
            {loading ? <><Loader2 size={16} className="geo-spin" /> Locating…</> : <><RefreshCw size={16} /> Capture my location</>}
          </button>
          {coords && (
            <button className="geo-btn" onClick={lookupAddress} disabled={addrLoading}>
              {addrLoading ? <><Loader2 size={16} className="geo-spin" /> Looking up…</> : <><Globe size={16} /> Resolve address</>}
            </button>
          )}
        </div>

        {error && <div className="geo-error">{error}</div>}

        {coords && (
          <section className="geo-section">
            <h2>Device GPS data (Geolocation API)</h2>
            <table className="geo-table">
              <tbody>
                {COORD_FIELDS.map((f) => {
                  const raw = coords[f.key];
                  const isNull = raw === null || raw === undefined;
                  const shown = isNull ? '—' : `${fmt(raw, f.digits ?? 6)}${f.unit ? ` ${f.unit}` : ''}`;
                  return (
                    <tr key={f.key}>
                      <th>{f.label}</th>
                      <td className={isNull ? 'geo-null' : ''}>{shown}</td>
                      <td className="geo-help">{f.help}</td>
                    </tr>
                  );
                })}
                <tr>
                  <th>Timestamp</th>
                  <td>{timestamp ? new Date(timestamp).toLocaleString() : '—'}</td>
                  <td className="geo-help">When this position fix was taken.</td>
                </tr>
              </tbody>
            </table>

            <a
              className="geo-map-link"
              href={`https://maps.google.com/?q=${coords.latitude},${coords.longitude}`}
              target="_blank"
              rel="noreferrer"
            >
              <MapPin size={14} /> Open on Google Maps
            </a>
          </section>
        )}

        {addrError && <div className="geo-error">{addrError}</div>}

        {address && (
          <section className="geo-section">
            <h2>Address data (reverse geocoding)</h2>
            <p className="geo-note">
              Source: OpenStreetMap Nominatim. This is a separate lookup — coordinates alone never
              contain an address.
            </p>
            <div className="geo-formatted">{address.display_name || '—'}</div>
            <table className="geo-table">
              <tbody>
                {address.address &&
                  Object.entries(address.address).map(([k, v]) => (
                    <tr key={k}>
                      <th>{k}</th>
                      <td colSpan={2}>{String(v)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </section>
        )}

        {coords && (
          <details className="geo-raw">
            <summary>Raw JSON</summary>
            <pre>{JSON.stringify({ coords, timestamp, address }, null, 2)}</pre>
          </details>
        )}
      </div>
    </div>
  );
}

export default GeoDebug;
