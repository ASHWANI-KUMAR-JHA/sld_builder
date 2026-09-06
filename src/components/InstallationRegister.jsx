import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  ArrowLeft, LogOut, Plus, Trash2, Save, LayoutGrid, ClipboardList,
  Search, RefreshCw, MapPin, ClipboardPaste, Upload, Share2, Download, ChevronDown, X,
} from 'lucide-react';
import Logo from './Logo';
import {
  INSTALLATION_FIELDS,
  emptyInstallation,
  fetchInstallations,
  insertInstallations,
  deleteInstallation,
  parsePastedRows,
  parseUploadedFile,
} from '../utils/installations';
import './InstallationRegister.css';

// Fields shown as editable columns in the entry grid (excludes project/work order
// which are captured once at the top).
const ROW_FIELDS = INSTALLATION_FIELDS.filter(
  (f) => f.key !== 'project_name' && f.key !== 'work_order'
);

function InstallationRegister({ onBack, onLogout }) {
  const [mode, setMode] = useState('entry'); // 'entry' | 'dashboard'

  // Shared identifiers (nullable)
  const [projectName, setProjectName] = useState('');
  const [workOrder, setWorkOrder] = useState('');

  // Entry rows
  const [rows, setRows] = useState([{ _id: 1, ...emptyInstallation() }]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  // Dashboard state
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [dashError, setDashError] = useState(null);

  const addRow = useCallback(() => {
    setRows((prev) => [
      ...prev,
      { _id: prev.length ? Math.max(...prev.map((r) => r._id)) + 1 : 1, ...emptyInstallation() },
    ]);
  }, []);

  const removeRow = useCallback((id) => {
    setRows((prev) => (prev.length > 1 ? prev.filter((r) => r._id !== id) : prev));
  }, []);

  const updateCell = useCallback((id, key, value) => {
    setRows((prev) => prev.map((r) => (r._id === id ? { ...r, [key]: value } : r)));
  }, []);

  const handlePaste = useCallback(
    (e) => {
      const text = e.clipboardData?.getData('text');
      if (!text) return;
      const lines = text.split(/\r?\n/).filter((l) => l.trim() !== '');
      // Only intercept multi-cell/multi-row pastes.
      if (lines.length <= 1 && !text.includes('\t')) return;
      e.preventDefault();
      const parsed = parsePastedRows(text, { projectName, workOrder });
      if (parsed.length === 0) return;
      setRows((prev) => {
        const base = prev.length === 1 && isEmptyRow(prev[0]) ? [] : prev;
        let nextId = base.length ? Math.max(...base.map((r) => r._id)) + 1 : 1;
        const mapped = parsed.map((p) => ({ _id: nextId++, ...p }));
        return [...base, ...mapped];
      });
    },
    [projectName, workOrder]
  );

  const handleShareForm = useCallback(async () => {
    const url = `${window.location.origin}${window.location.pathname}?form=install`;
    try {
      await navigator.clipboard.writeText(url);
      setMessage({ type: 'success', text: `Shareable form link copied: ${url}` });
    } catch {
      // Fallback if clipboard API is unavailable.
      window.prompt('Copy this shareable form link:', url);
    }
  }, []);

  const handleBulkUpload = useCallback(
    async (file) => {
      if (!file) return;
      setMessage(null);
      try {
        const parsed = await parseUploadedFile(file, { projectName, workOrder });
        if (parsed.length === 0) {
          setMessage({ type: 'error', text: 'No data rows found in the uploaded file.' });
          return;
        }
        setRows((prev) => {
          const base = prev.length === 1 && isEmptyRow(prev[0]) ? [] : prev;
          let nextId = base.length ? Math.max(...base.map((r) => r._id)) + 1 : 1;
          const mapped = parsed.map((p) => ({ _id: nextId++, ...p }));
          return [...base, ...mapped];
        });
        setMessage({
          type: 'success',
          text: `Loaded ${parsed.length} row(s) from file. Review, then Save to Supabase.`,
        });
      } catch (err) {
        setMessage({ type: 'error', text: `Upload failed: ${err.message}` });
      }
    },
    [projectName, workOrder]
  );

  const handleSave = useCallback(async () => {
    setSaving(true);
    setMessage(null);
    try {
      const payload = rows.map((r) => ({ ...r, project_name: projectName, work_order: workOrder }));
      const { inserted } = await insertInstallations(payload);
      if (inserted === 0) {
        setMessage({ type: 'error', text: 'Nothing to save. Fill at least one row.' });
      } else {
        setMessage({ type: 'success', text: `Saved ${inserted} installation(s) to Supabase.` });
        setRows([{ _id: 1, ...emptyInstallation() }]);
      }
    } catch (err) {
      setMessage({ type: 'error', text: `Save failed: ${err.message}` });
    } finally {
      setSaving(false);
    }
  }, [rows, projectName, workOrder]);

  const loadRecords = useCallback(async () => {
    setLoading(true);
    setDashError(null);
    try {
      const data = await fetchInstallations({ search });
      setRecords(data);
    } catch (err) {
      setDashError(err.message);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    if (mode === 'dashboard') loadRecords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const handleDelete = useCallback(async (id) => {
    if (!window.confirm('Delete this installation record?')) return;
    try {
      await deleteInstallation(id);
      setRecords((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      setDashError(`Delete failed: ${err.message}`);
    }
  }, []);

  return (
    <div className="install-page">
      <header className="install-header">
        <div className="header-inner">
          <div className="header-left">
            <button className="header-btn" onClick={onBack} title="Back to Generator">
              <ArrowLeft size={18} />
              <span>Back</span>
            </button>
            <div className="logo">
              <Logo size="medium" />
              <div className="logo-text">
                <h1>Installation Register</h1>
                <span className="subtitle">Solar Street Light Installations</span>
              </div>
            </div>
          </div>
          <div className="header-right">
            <button className="header-btn" onClick={handleShareForm} title="Copy shareable form link">
              <Share2 size={18} />
              <span>Share Form</span>
            </button>
            <button className="header-btn logout" onClick={onLogout} title="Logout">
              <LogOut size={18} />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </header>

      <div className="install-body">
        <div className="mode-toggle">
          <button
            className={`toggle-btn ${mode === 'entry' ? 'active' : ''}`}
            onClick={() => setMode('entry')}
          >
            <ClipboardList size={16} /> Data Entry
          </button>
          <button
            className={`toggle-btn ${mode === 'dashboard' ? 'active' : ''}`}
            onClick={() => setMode('dashboard')}
          >
            <LayoutGrid size={16} /> Dashboard
          </button>
        </div>

        {mode === 'entry' ? (
          <EntryView
            projectName={projectName}
            setProjectName={setProjectName}
            workOrder={workOrder}
            setWorkOrder={setWorkOrder}
            rows={rows}
            addRow={addRow}
            removeRow={removeRow}
            updateCell={updateCell}
            handlePaste={handlePaste}
            handleSave={handleSave}
            handleBulkUpload={handleBulkUpload}
            saving={saving}
            message={message}
          />
        ) : (
          <DashboardView
            records={records}
            loading={loading}
            search={search}
            setSearch={setSearch}
            loadRecords={loadRecords}
            handleDelete={handleDelete}
            dashError={dashError}
          />
        )}
      </div>
    </div>
  );
}

function EntryView({
  projectName, setProjectName, workOrder, setWorkOrder,
  rows, addRow, removeRow, updateCell, handlePaste, handleSave, handleBulkUpload, saving, message,
}) {
  const fileInputRef = useRef(null);

  const onFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) handleBulkUpload(file);
    e.target.value = ''; // allow re-uploading the same file
  };

  return (
    <>
      <div className="id-panel">
        <div className="id-field">
          <label>Project Name <span className="opt">(optional)</span></label>
          <input
            type="text"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            placeholder="e.g., Panchkula Solar Street Light Phase-1"
          />
        </div>
        <div className="id-field">
          <label>Work Order <span className="opt">(optional)</span></label>
          <input
            type="text"
            value={workOrder}
            onChange={(e) => setWorkOrder(e.target.value)}
            placeholder="e.g., WO/2026/00123"
          />
        </div>
      </div>

      <div className="hint">
        <ClipboardPaste size={14} /> Tip: copy rows from Excel and paste into any cell to bulk-fill,
        or use <strong>Bulk Upload</strong> for a whole sheet (.xlsx / .xls / .csv / .tsv).
        Column order: S.No, Location, Latitude, Longitude, Village / Gram Panchayat, Block,
        Assembly, Commissioning Date, Module, Battery, Luminaire, RMS.
      </div>

      <div className="entry-actions">
        <button className="btn-add" onClick={addRow}><Plus size={16} /> Add Row</button>
        <button className="btn-add" onClick={() => fileInputRef.current?.click()}>
          <Upload size={16} /> Bulk Upload
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.tsv,.txt,.xlsx,.xls,text/csv"
          style={{ display: 'none' }}
          onChange={onFileChange}
        />
        <button className="btn-save" onClick={handleSave} disabled={saving}>
          <Save size={16} /> {saving ? 'Saving…' : 'Save to Supabase'}
        </button>
      </div>

      {message && <div className={`msg ${message.type}`}>{message.text}</div>}

      <div className="entry-table-wrapper" onPaste={handlePaste}>
        <table className="entry-table">
          <thead>
            <tr>
              {ROW_FIELDS.map((f) => (
                <th key={f.key}>{f.label}</th>
              ))}
              <th className="action-col">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row._id}>
                {ROW_FIELDS.map((f) => (
                  <td key={f.key}>
                    <input
                      type="text"
                      value={row[f.key] ?? ''}
                      onChange={(e) => updateCell(row._id, f.key, e.target.value)}
                    />
                  </td>
                ))}
                <td className="action-col">
                  <button className="btn-icon danger" onClick={() => removeRow(row._id)} title="Remove row">
                    <Trash2 size={15} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

// Columns that support click-to-sort. Serial-number columns are sorted
// numerically when possible, alphabetically otherwise.
const SORTABLE_COLS = [
  { key: 'sno', numeric: true },
  { key: 'module_serial', numeric: true },
  { key: 'battery_serial', numeric: true },
  { key: 'luminaire_serial', numeric: true },
];

// Dropdown filters shown above the dashboard table.
const FILTER_DEFS = [
  { key: 'project_name', label: 'Project' },
  { key: 'work_order', label: 'Work Order' },
  { key: 'village', label: 'Village / Gram Panchayat' },
  { key: 'block', label: 'Block' },
  { key: 'assembly_constituency', label: 'Assembly' },
  { key: 'exact_location', label: 'Location' },
];

function DashboardView({ records, loading, search, setSearch, loadRecords, handleDelete, dashError }) {
  // Selected values per filter key — an array of strings ([] = all).
  const [filters, setFilters] = useState({});
  // Which filter dropdown is currently open.
  const [openFilter, setOpenFilter] = useState(null);
  // { key, dir } — dir is 'asc' | 'desc'.
  const [sort, setSort] = useState(null);

  // Toggle a single value within a column's multi-select selection.
  const toggleFilterValue = useCallback((key, value) => {
    setFilters((prev) => {
      const current = prev[key] || [];
      const next = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      return { ...prev, [key]: next };
    });
  }, []);

  const clearFilterColumn = useCallback((key) => {
    setFilters((prev) => ({ ...prev, [key]: [] }));
  }, []);

  const clearFilters = useCallback(() => setFilters({}), []);

  // Close any open filter dropdown when clicking outside the filter bar.
  useEffect(() => {
    if (!openFilter) return;
    const onDocClick = (e) => {
      if (!e.target.closest('.filter-field')) setOpenFilter(null);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [openFilter]);

  const toggleSort = useCallback((key) => {
    setSort((prev) => {
      if (!prev || prev.key !== key) return { key, dir: 'asc' };
      if (prev.dir === 'asc') return { key, dir: 'desc' };
      return null; // third click clears the sort
    });
  }, []);

  // Unique, sorted option lists for each dropdown filter.
  const filterOptions = useMemo(() => {
    const opts = {};
    for (const { key } of FILTER_DEFS) {
      const values = new Set(
        records.map((r) => (r[key] == null ? '' : String(r[key]).trim())).filter(Boolean)
      );
      opts[key] = Array.from(values).sort((a, b) => a.localeCompare(b));
    }
    return opts;
  }, [records]);

  // Apply dropdown filters, then sorting.
  const visibleRecords = useMemo(() => {
    let list = records.filter((r) =>
      FILTER_DEFS.every(({ key }) => {
        const selected = filters[key];
        if (!selected || selected.length === 0) return true;
        return selected.includes(String(r[key] ?? '').trim());
      })
    );

    if (sort) {
      const col = SORTABLE_COLS.find((c) => c.key === sort.key);
      const dir = sort.dir === 'asc' ? 1 : -1;
      list = [...list].sort((a, b) => {
        const av = a[sort.key];
        const bv = b[sort.key];
        const aEmpty = av == null || String(av).trim() === '';
        const bEmpty = bv == null || String(bv).trim() === '';
        if (aEmpty && bEmpty) return 0;
        if (aEmpty) return 1; // empties always at the bottom
        if (bEmpty) return -1;
        if (col?.numeric) {
          const an = parseFloat(String(av).replace(/[^\d.-]/g, ''));
          const bn = parseFloat(String(bv).replace(/[^\d.-]/g, ''));
          if (!Number.isNaN(an) && !Number.isNaN(bn) && an !== bn) {
            return (an - bn) * dir;
          }
        }
        return String(av).localeCompare(String(bv), undefined, { numeric: true }) * dir;
      });
    }
    return list;
  }, [records, filters, sort]);

  const total = visibleRecords.length;
  const withRms = visibleRecords.filter((r) => String(r.rms).toUpperCase() === 'YES').length;
  const projects = new Set(visibleRecords.map((r) => r.project_name).filter(Boolean)).size;

  const activeFilterCount = FILTER_DEFS.filter(({ key }) => (filters[key] || []).length > 0).length;

  const sortIndicator = (key) => {
    if (!sort || sort.key !== key) return ' ↕';
    return sort.dir === 'asc' ? ' ▲' : ' ▼';
  };

  // Export the currently filtered + sorted records to a CSV file.
  const exportReport = useCallback(() => {
    if (visibleRecords.length === 0) return;
    const esc = (v) => {
      const s = v == null ? '' : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const header = INSTALLATION_FIELDS.map((f) => f.label);
    const lines = [header.map(esc).join(',')];
    for (const r of visibleRecords) {
      lines.push(INSTALLATION_FIELDS.map((f) => esc(r[f.key])).join(','));
    }
    // Prepend BOM so Excel opens UTF-8 correctly.
    const blob = new Blob(['\uFEFF' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const stamp = new Date().toISOString().slice(0, 10);
    a.download = `installations_report_${stamp}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [visibleRecords]);

  return (
    <>
      <div className="stats-row">
        <StatCard label="Total Installations" value={total} />
        <StatCard label="RMS Enabled" value={withRms} />
        <StatCard label="Distinct Projects" value={projects} />
      </div>

      <div className="dash-toolbar">
        <div className="search-box">
          <Search size={16} />
          <input
            type="text"
            value={search}
            placeholder="Search project, work order, location, village, module…"
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && loadRecords()}
          />
        </div>
        <button className="btn-refresh" onClick={loadRecords}>
          <RefreshCw size={16} /> {loading ? 'Loading…' : 'Refresh'}
        </button>
        <button
          className="btn-export"
          onClick={exportReport}
          disabled={visibleRecords.length === 0}
          title="Export the filtered records to CSV"
        >
          <Download size={16} /> Export Report
        </button>
      </div>

      <div className="dash-filters">
        {FILTER_DEFS.map(({ key, label }) => {
          const selected = filters[key] || [];
          const options = filterOptions[key] || [];
          const isOpen = openFilter === key;
          return (
            <div className="filter-field" key={key}>
              <label>{label}</label>
              <div className={`multiselect ${isOpen ? 'open' : ''}`}>
                <button
                  type="button"
                  className="multiselect-toggle"
                  onClick={() => setOpenFilter(isOpen ? null : key)}
                >
                  <span className="multiselect-value">
                    {selected.length === 0
                      ? 'All'
                      : selected.length === 1
                        ? selected[0]
                        : `${selected.length} selected`}
                  </span>
                  <ChevronDown size={14} />
                </button>
                {isOpen && (
                  <div className="multiselect-menu">
                    {options.length === 0 && (
                      <div className="multiselect-empty">No values</div>
                    )}
                    {options.map((opt) => (
                      <label className="multiselect-option" key={opt}>
                        <input
                          type="checkbox"
                          checked={selected.includes(opt)}
                          onChange={() => toggleFilterValue(key, opt)}
                        />
                        <span>{opt}</span>
                      </label>
                    ))}
                    {selected.length > 0 && (
                      <button
                        type="button"
                        className="multiselect-clear"
                        onClick={() => clearFilterColumn(key)}
                      >
                        <X size={12} /> Clear
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {activeFilterCount > 0 && (
          <button className="btn-clear-filters" onClick={clearFilters} title="Clear all filters">
            <RefreshCw size={14} /> Clear Filters
          </button>
        )}
      </div>

      {dashError && <div className="msg error">{dashError}</div>}

      <div className="dash-table-wrapper">
        <table className="dash-table">
          <thead>
            <tr>
              <th>Project</th>
              <th>Work Order</th>
              <th className="sortable" onClick={() => toggleSort('sno')} title="Sort by S.No">
                S.No{sortIndicator('sno')}
              </th>
              <th>Location</th>
              <th>Coordinates</th>
              <th>Village / Gram Panchayat</th>
              <th>Block</th>
              <th>Assembly</th>
              <th>Commissioned</th>
              <th className="sortable" onClick={() => toggleSort('module_serial')} title="Sort by Module SN">
                Module SN{sortIndicator('module_serial')}
              </th>
              <th className="sortable" onClick={() => toggleSort('battery_serial')} title="Sort by Battery SN">
                Battery SN{sortIndicator('battery_serial')}
              </th>
              <th className="sortable" onClick={() => toggleSort('luminaire_serial')} title="Sort by Luminaire SN">
                Luminaire SN{sortIndicator('luminaire_serial')}
              </th>
              <th>RMS</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {visibleRecords.length === 0 && !loading && (
              <tr><td colSpan={14} className="empty">No records found.</td></tr>
            )}
            {visibleRecords.map((r) => (
              <tr key={r.id}>
                <td>{r.project_name || '—'}</td>
                <td>{r.work_order || '—'}</td>
                <td>{r.sno || '—'}</td>
                <td>{r.exact_location || '—'}</td>
                <td>
                  {r.latitude && r.longitude ? (
                    <a
                      className="coord-link"
                      href={`https://maps.google.com/?q=${r.latitude},${r.longitude}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <MapPin size={12} /> {r.latitude}, {r.longitude}
                    </a>
                  ) : '—'}
                </td>
                <td>{r.village || r.gram_panchayat || '—'}</td>
                <td>{r.block || '—'}</td>
                <td>{r.assembly_constituency || '—'}</td>
                <td>{r.commissioning_date || '—'}</td>
                <td>{r.module_serial || '—'}</td>
                <td>{r.battery_serial || '—'}</td>
                <td>{r.luminaire_serial || '—'}</td>
                <td>
                  <span className={`badge ${String(r.rms).toUpperCase() === 'YES' ? 'yes' : 'no'}`}>
                    {r.rms || '—'}
                  </span>
                </td>
                <td>
                  <button className="btn-icon danger" onClick={() => handleDelete(r.id)} title="Delete">
                    <Trash2 size={15} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="stat-card">
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

function isEmptyRow(row) {
  return ROW_FIELDS.every((f) => String(row[f.key] ?? '').trim() === '' || f.key === 'rms');
}

export default InstallationRegister;
