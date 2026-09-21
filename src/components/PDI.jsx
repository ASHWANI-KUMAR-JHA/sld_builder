import { useState, useCallback, useEffect, useRef } from 'react';
import { ArrowLeft, LogOut, Plus, Trash2, Download, FileText, Save, Upload, AlertTriangle, CheckCircle2, Send, RefreshCw } from 'lucide-react';
import jsPDF from 'jspdf';
import Logo from './Logo';
import { readSheetRows, extractIdList } from '../utils/spreadsheet';
import { findOrCreateWorkOrder, insertWorkOrderItems } from '../utils/workorders';
import './PDI.css';

const DEFAULT_HEADING = 'FORMAT OF INSPECTION REPORT OF SOLAR STREET LIGHTING SYSTEM';
const PDI_STORAGE_KEY = 'pdi-report-data';

// General info field definitions (numbered label + editable value)
const GENERAL_FIELDS = [
  { key: 'department', no: '1', label: 'NAME OF THE DEPARTMENT', multiline: true },
  { key: 'rateContractNo', no: '2 (i)', label: 'RATE CONTRACT NO & DATE', multiline: false },
  // 2 (ii) WORK ORDER NO & DATE is a dynamic table, handled separately
  { key: 'orderedQty', no: '3', label: 'ORDERED QUANTITY (NOS)', multiline: false },
  { key: 'consigneeDept', no: '4', label: 'CONSIGNEE DEPARTMENT/OFFICE', multiline: true },
  { key: 'companyName', no: '5', label: 'NAME OF THE COMPANY WHO OFFERED THE MATERIAL FOR INSPECTION', multiline: true },
  { key: 'dateOfInspection', no: '6', label: 'DATE OF INSPECTION', multiline: false },
  { key: 'systemsOffered', no: '7', label: 'NO. OF SYSTEMS OFFERED FOR INSPECTION', multiline: false },
  { key: 'spvSerialNos', no: '8', label: 'SERIAL NO. OF SPV MODULES (PL ALSO ATTACH LIST OF MODULES AND MANUFACTURERS FOR PV MODULES EMPANELLED BY MNRE AS PER ITS ALMM ORDER)', multiline: true },
  { key: 'luminaireSerialNos', no: '9', label: 'SERIAL NO OF LUMINAIRE (PI ATTACH LIST)', multiline: true },
  { key: 'batterySerialNos', no: '10', label: 'SERIAL NO OF BATTERY (PI ATTACH LIST)', multiline: true },
];

const ADDITIONAL_FIELDS = [
  { key: 'chargeController', no: '12', label: 'TYPE OF CHARGE CONTROLLER' },
  { key: 'electronicEfficiency', no: '13', label: 'ELECTRONIC EFFICIENCY OF SYSTEM' },
  { key: 'poleType', no: '14', label: 'TYPE OF POLE, LENGTH & OUTER DIA OF THE POLE' },
  { key: 'cableType', no: '15', label: 'TYPE, MAKE, SIZE & STANDARD OF CABLE USED' },
  { key: 'ledIndicator', no: '16', label: 'TWO LED INDICATOR (GREEN ON- CHARGING, RED ON- BATTERY DEEP DISCHARGE)' },
  { key: 'rms', no: '17', label: 'REMOTE MONITORING SYSTEM (RMS) AS PER RATE CONTRACT' },
];

const SPV_COLS = [
  { key: 'srNo', label: 'SR. NO OF SPV MODULE' },
  { key: 'make', label: 'SPV MODULE MAKE' },
  { key: 'type', label: 'TYPE OF MODULE' },
  { key: 'wattageSpec', label: 'WATTAGE AS PER SPECIFICATION (IN WATT)' },
  { key: 'voc', label: 'VOC', group: true },
  { key: 'isc', label: 'ISC', group: true },
  { key: 'wattage', label: 'WATTAGE', group: true },
  { key: 'efficiency', label: 'EFFICIENCY', group: true },
];

// Columns for user-added custom sample tables (same layout as SPV module table)
const CUSTOM_SAMPLE_COLS = [
  { key: 'srNo', label: 'SR. NO' },
  { key: 'make', label: 'MAKE' },
  { key: 'type', label: 'TYPE' },
  { key: 'wattageSpec', label: 'WATTAGE AS PER SPECIFICATION (IN WATT)' },
  { key: 'voc', label: 'VOC', group: true },
  { key: 'isc', label: 'ISC', group: true },
  { key: 'wattage', label: 'WATTAGE', group: true },
  { key: 'efficiency', label: 'EFFICIENCY', group: true },
];

const BATTERY_COLS = [
  { key: 'srNo', label: 'SR. NO OF BATTERY' },
  { key: 'make', label: 'BATTERY MAKE' },
  { key: 'type', label: 'TYPE OF BATTERY' },
  { key: 'voltage', label: 'VOLTAGE' },
  { key: 'capacity', label: 'CAPACITY' },
];

const LUMINAIRE_COLS = [
  { key: 'srNo', label: 'SR. NO OF LUMINARIES' },
  { key: 'make', label: 'LUMINARY MAKE' },
  { key: 'power', label: 'POWER CONSUMPTION OF THE LUMINAIRE (IN WATT)' },
  { key: 'noLoadCurrent', label: 'NO LOAD CURRENT OF LUMINAIRE (IN mA)' },
];

// Component categories a custom section can belong to. In the exported report,
// custom sections are placed directly below the matching component's section,
// and use the same column layout as that component.
const COMPONENT_CATEGORIES = [
  { value: 'spv', label: 'SPV Module' },
  { value: 'battery', label: 'Battery' },
  { value: 'luminaire', label: 'Luminaire' },
];

// Column layout + grouped-header + empty-row factory per category.
const CATEGORY_CONFIG = {
  spv: {
    cols: CUSTOM_SAMPLE_COLS,
    groupLabel: 'AS PER I-V CURVE OF SOLAR PV MODULE',
    makeEmpty: () => ({ srNo: '', make: '', type: '', wattageSpec: '', voc: '', isc: '', wattage: '', efficiency: '' }),
  },
  battery: {
    cols: BATTERY_COLS,
    groupLabel: '',
    makeEmpty: () => ({ srNo: '', make: '', type: '', voltage: '', capacity: '' }),
  },
  luminaire: {
    cols: LUMINAIRE_COLS,
    groupLabel: '',
    makeEmpty: () => ({ srNo: '', make: '', power: '', noLoadCurrent: '' }),
  },
};

const getCategoryConfig = (category) => CATEGORY_CONFIG[category] || CATEGORY_CONFIG.spv;

// Parse IDs from pasted / uploaded text. Takes the FIRST column of each line.
function parseIdList(text) {
  const lines = text.split(/\r?\n/);
  const ids = [];
  const isHeader = (v) => /^(s\.?\s*no\.?|sr\.?\s*no\.?|count|id|serial|serial\s*no\.?|module\s*serial\s*no\.?)$/i.test(v);
  const isRowNumber = (v) => /^\d{1,4}[).]?$/.test(v); // 1, 2, 3) etc. — a leading index, not an ID

  for (const line of lines) {
    if (!line.trim()) continue;
    // Split on comma, tab, or runs of 2+ spaces (spreadsheet paste), fall back to single space.
    let cells = line.split(/\s*[,\t]\s*|\s{2,}/).map(c => c.trim()).filter(Boolean);
    if (cells.length <= 1) {
      cells = line.trim().split(/\s+/).filter(Boolean);
    }
    if (cells.length === 0) continue;

    // Choose the ID: first cell, unless it's a header or a leading row-number,
    // in which case take the next cell.
    let id = cells[0];
    if (isHeader(id)) continue;
    if (isRowNumber(id) && cells.length > 1) {
      id = cells[1];
    }
    // Strip a trailing ")" or "." that sometimes attaches to numbered serials like "1)ABC123"
    id = id.replace(/^\d{1,4}[).]/, '').trim() || id;
    if (!id || isHeader(id)) continue;
    ids.push(id);
  }
  return ids;
}

// Normalize an ID for duplicate comparison (trim + case-insensitive).
const normalizeId = (id) => String(id ?? '').trim().toLowerCase();

// Given a list of IDs, return an array of duplicate entries: { id, count }
// (only IDs that appear more than once). Preserves first-seen original casing
// and first-seen order.
function findDuplicates(list) {
  const counts = new Map();
  const original = new Map();
  for (const raw of list || []) {
    const id = String(raw ?? '').trim();
    if (!id) continue;
    const key = normalizeId(id);
    counts.set(key, (counts.get(key) || 0) + 1);
    if (!original.has(key)) original.set(key, id);
  }
  const dups = [];
  for (const [key, count] of counts) {
    if (count > 1) dups.push({ id: original.get(key), count });
  }
  return dups;
}

// Return only unique IDs (first occurrence kept), preserving order.
function uniqueIds(list) {
  const seen = new Set();
  const out = [];
  for (const raw of list || []) {
    const id = String(raw ?? '').trim();
    if (id === '') continue;
    const key = normalizeId(id);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(id);
  }
  return out;
}

// Resize an array of row objects to a given length, preserving existing data.
function resizeRows(rows, count, makeEmpty) {
  const n = Math.max(0, Math.floor(count) || 0);
  if (n === rows.length) return rows;
  if (n < rows.length) return rows.slice(0, n);
  const next = [...rows];
  for (let i = rows.length; i < n; i++) next.push(makeEmpty(i));
  return next;
}

// Load persisted PDI data from localStorage (returns null on failure/empty)
function loadPersisted() {
  try {
    const raw = localStorage.getItem(PDI_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.error('Failed to load PDI data:', e);
    return null;
  }
}

const PERSISTED = loadPersisted() || {};

// Export duplicate entries (serial number + count) for one section as CSV.
function exportDuplicatesCsv(title, duplicates) {
  const header = 'Serial Number,Count';
  const body = duplicates.map(d => `${String(d.id).replace(/"/g, '""')},${d.count}`);
  const csv = [header, ...body].join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const safe = (title || 'section').replace(/[^\w\-]+/g, '_');
  a.download = `${safe}_duplicates.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Section-wise duplicate report: shows each duplicate serial number with its
// count, and offers an export of (serial number + count).
function DuplicatePanel({ title, list }) {
  const cleaned = (list || []).filter(id => String(id).trim() !== '');
  const duplicates = findDuplicates(cleaned);
  const uniqueCount = uniqueIds(cleaned).length;
  if (duplicates.length === 0) {
    return (
      <div className="dup-panel dup-ok">
        <CheckCircle2 size={13} /> No duplicates ({uniqueCount} unique)
      </div>
    );
  }
  const totalExtra = duplicates.reduce((s, d) => s + (d.count - 1), 0);
  return (
    <div className="dup-panel dup-warn">
      <div className="dup-head">
        <span className="dup-title">
          <AlertTriangle size={13} /> {duplicates.length} duplicate serial{duplicates.length > 1 ? 's' : ''}
          {' '}({totalExtra} extra, {uniqueCount} unique)
        </span>
        <button
          className="btn-remove-text dup-export"
          onClick={() => exportDuplicatesCsv(title, duplicates)}
          title="Export duplicate serial numbers with counts"
        >
          <Download size={13} /> Export
        </button>
      </div>
      <div className="dup-list">
        <div className="dup-row dup-row-head">
          <span>Serial Number</span>
          <span>Count</span>
        </div>
        {duplicates.map((d, i) => (
          <div className="dup-row" key={`${d.id}-${i}`}>
            <span className="dup-id">{d.id}</span>
            <span className="dup-count">{d.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Reusable bulk-upload box for one ID list (SPV / Battery / Luminaire)
function BulkUploadBox({ title, list, onUpload, onPaste, onClear, onChange, onTitleChange }) {
  const inputRef = useRef(null);
  return (
    <div className="bulk-box">
      <div className="bulk-box-head">
        {onTitleChange ? (
          <input
            className="bulk-title-input"
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            title="Edit the heading printed on this list's PDF pages"
          />
        ) : (
          <span className="bulk-title">{title}</span>
        )}
        <span className="bulk-count">{list.filter(id => id.trim() !== '').length} IDs</span>
      </div>
      <div className="bulk-actions">
        <button className="btn-add-sm" onClick={() => inputRef.current?.click()}>
          <Upload size={14} /> Upload File
        </button>
        <button className="btn-remove-text" onClick={onClear} disabled={list.length === 0}>
          <Trash2 size={14} /> Clear
        </button>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.txt,.tsv,.xlsx,.xls"
          style={{ display: 'none' }}
          onChange={onUpload}
        />
      </div>
      <textarea
        className="bulk-paste"
        rows={5}
        placeholder={`Type or paste ${title} IDs here (one per line, or first column of pasted rows)`}
        onPaste={onPaste}
        value={list.join('\n')}
        onChange={(e) => onChange(e.target.value.split(/\r?\n/))}
      />
      <DuplicatePanel title={title} list={list} />
    </div>
  );
}

function PDI({ onBack, onLogout }) {
  const [projectName, setProjectName] = useState(PERSISTED.projectName ?? '');
  const [reportHeading, setReportHeading] = useState(PERSISTED.reportHeading ?? DEFAULT_HEADING);

  const [fields, setFields] = useState(PERSISTED.fields ?? {
    department: '',
    rateContractNo: '',
    orderedQty: '',
    consigneeDept: '',
    companyName: '',
    dateOfInspection: '',
    systemsOffered: '',
    spvSerialNos: '',
    luminaireSerialNos: '',
    batterySerialNos: '',
  });

  const [additionalFields, setAdditionalFields] = useState(PERSISTED.additionalFields ?? {
    chargeController: '',
    electronicEfficiency: '',
    poleType: '',
    cableType: '',
    ledIndicator: '',
    rms: '',
  });

  // Field #2 (ii) — Work Order No & Date dynamic table
  const [workOrders, setWorkOrders] = useState(PERSISTED.workOrders ?? [{ id: 1, orderNo: '', date: '' }]);

  // Field #11 — number of samples drives the 3 tables
  const [sampleCount, setSampleCount] = useState(PERSISTED.sampleCount ?? 0);
  const [spvRows, setSpvRows] = useState(PERSISTED.spvRows ?? []);
  const [batteryRows, setBatteryRows] = useState(PERSISTED.batteryRows ?? []);
  const [luminaireRows, setLuminaireRows] = useState(PERSISTED.luminaireRows ?? []);

  // User-added custom sample sections. Each: { id, title, groupLabel, rows: [] }
  // Same tabular format as the SPV module table, sized to sampleCount.
  const [customSections, setCustomSections] = useState(PERSISTED.customSections ?? []);

  // User-added custom bulk-upload sections (free-text header, same sheet as SPV Modules)
  // Each: { id, title, list: [] }
  const [customBulkSections, setCustomBulkSections] = useState(PERSISTED.customBulkSections ?? []);

  const [committeeComments, setCommitteeComments] = useState(PERSISTED.committeeComments ?? 'Material verified and accepted.');

  // Supplier firm signature block (fixed block from the format)
  const [supplier, setSupplier] = useState(PERSISTED.supplier ?? {
    firmName: 'For Sunfeed Ecosolutions India Pvt. Ltd.',
    name: '',
    designation: '',
  });

  // Signatures (committee members)
  const [signatureCount, setSignatureCount] = useState(PERSISTED.signatureCount ?? 0);
  const [signatures, setSignatures] = useState(PERSISTED.signatures ?? []);

  // Editable headings for the three attached ID-list sections. These titles are
  // shown in the UI and printed at the top of each list's PDF pages.
  const [listTitles, setListTitles] = useState(PERSISTED.listTitles ?? {
    spv: 'SPV MODULE SERIAL NUMBERS (ATTACHED LIST)',
    battery: 'BATTERY SERIAL NUMBERS (ATTACHED LIST)',
    luminaire: 'LUMINAIRE SERIAL NUMBERS (ATTACHED LIST)',
  });

  // Bulk uploaded ID lists (attached lists) — printed as paginated pages in the PDF
  const [spvList, setSpvList] = useState(PERSISTED.spvList ?? []);       // array of id strings
  const [batteryList, setBatteryList] = useState(PERSISTED.batteryList ?? []);
  const [luminaireList, setLuminaireList] = useState(PERSISTED.luminaireList ?? []);

  // Work Order submission state
  const [submitting, setSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState(null);

  // PDF layout / spacing controls (all in mm unless noted). Adjustable so you can
  // tighten spacing and control where page breaks fall before exporting.
  const [layout, setLayout] = useState(PERSISTED.layout ?? {
    lineGap: 3.6,       // extra height per text line inside rows
    rowPad: 2,          // vertical padding added to each table/info row
    sectionGap: 3,      // gap after a table/section
    bottomMargin: 20,   // distance from page bottom before a page break
    keepRows: 2,        // min rows kept with header (avoids orphan rows on a new page)
  });

  // PDF preview modal
  const [previewUrl, setPreviewUrl] = useState(null);
  const [showPreview, setShowPreview] = useState(false);

  const fileInputRef = useRef(null);

  // Keep sample tables sized to sampleCount
  useEffect(() => {
    setSpvRows(prev => resizeRows(prev, sampleCount, () => ({ srNo: '', make: '', type: '', wattageSpec: '', voc: '', isc: '', wattage: '', efficiency: '' })));
    setBatteryRows(prev => resizeRows(prev, sampleCount, () => ({ srNo: '', make: '', type: '', voltage: '', capacity: '' })));
    setLuminaireRows(prev => resizeRows(prev, sampleCount, () => ({ srNo: '', make: '', power: '', noLoadCurrent: '' })));
    setCustomSections(prev => prev.map(sec => ({
      ...sec,
      rows: resizeRows(sec.rows ?? [], sampleCount, getCategoryConfig(sec.category).makeEmpty),
    })));
  }, [sampleCount]);

  // Keep signatures sized to signatureCount
  useEffect(() => {
    setSignatures(prev => resizeRows(prev, signatureCount, () => ({ name: '', designation: '' })));
  }, [signatureCount]);

  // Persist all PDI data to localStorage whenever anything changes
  useEffect(() => {
    const data = {
      projectName, reportHeading, fields, additionalFields, workOrders,
      sampleCount, spvRows, batteryRows, luminaireRows, customSections, committeeComments,
      supplier, signatureCount, signatures, spvList, batteryList, luminaireList, customBulkSections,
      layout, listTitles,
    };
    try {
      localStorage.setItem(PDI_STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('Failed to save PDI data:', e);
    }
  }, [
    projectName, reportHeading, fields, additionalFields, workOrders,
    sampleCount, spvRows, batteryRows, luminaireRows, customSections, committeeComments,
    supplier, signatureCount, signatures, spvList, batteryList, luminaireList, customBulkSections,
    layout, listTitles,
  ]);

  // Export all current PDI data as a downloadable JSON file
  const exportJSON = useCallback(() => {
    const data = {
      projectName, reportHeading, fields, additionalFields, workOrders,
      sampleCount, spvRows, batteryRows, luminaireRows, customSections, committeeComments,
      supplier, signatureCount, signatures, spvList, batteryList, luminaireList, customBulkSections,
      layout, listTitles,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safeName = (projectName || 'PDI_report').replace(/[^\w\-]+/g, '_');
    a.download = `${safeName}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [
    projectName, reportHeading, fields, additionalFields, workOrders,
    sampleCount, spvRows, batteryRows, luminaireRows, customSections, committeeComments,
    supplier, signatureCount, signatures, spvList, batteryList, luminaireList, customBulkSections,
    layout, listTitles,
  ]);

  // Load PDI data from a user-selected JSON file
  const loadJSON = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const d = JSON.parse(ev.target.result);
        if (d.projectName !== undefined) setProjectName(d.projectName);
        if (d.reportHeading !== undefined) setReportHeading(d.reportHeading);
        if (d.fields) setFields(d.fields);
        if (d.additionalFields) setAdditionalFields(d.additionalFields);
        if (d.workOrders) setWorkOrders(d.workOrders);
        if (d.sampleCount !== undefined) setSampleCount(d.sampleCount);
        if (d.spvRows) setSpvRows(d.spvRows);
        if (d.batteryRows) setBatteryRows(d.batteryRows);
        if (d.luminaireRows) setLuminaireRows(d.luminaireRows);
        if (d.committeeComments !== undefined) setCommitteeComments(d.committeeComments);
        if (d.supplier) setSupplier(d.supplier);
        if (d.signatureCount !== undefined) setSignatureCount(d.signatureCount);
        if (d.signatures) setSignatures(d.signatures);
        if (d.customSections) setCustomSections(d.customSections);
        if (d.spvList) setSpvList(d.spvList);
        if (d.batteryList) setBatteryList(d.batteryList);
        if (d.luminaireList) setLuminaireList(d.luminaireList);
        if (d.customBulkSections) setCustomBulkSections(d.customBulkSections);
        if (d.layout) setLayout(prev => ({ ...prev, ...d.layout }));
        if (d.listTitles) setListTitles(prev => ({ ...prev, ...d.listTitles }));
      } catch (err) {
        console.error('Failed to parse JSON file:', err);
        alert('Could not load file: invalid JSON.');
      }
    };
    reader.readAsText(file);
    // reset input so the same file can be selected again
    e.target.value = '';
  }, []);

  const handleField = useCallback((key, value) => {
    setFields(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleAdditional = useCallback((key, value) => {
    setAdditionalFields(prev => ({ ...prev, [key]: value }));
  }, []);

  // Work order handlers
  const addWorkOrder = useCallback(() => {
    setWorkOrders(prev => [...prev, { id: prev.length ? Math.max(...prev.map(r => r.id)) + 1 : 1, orderNo: '', date: '' }]);
  }, []);
  const removeWorkOrder = useCallback((id) => {
    setWorkOrders(prev => (prev.length === 1 ? prev : prev.filter(r => r.id !== id)));
  }, []);
  const updateWorkOrder = useCallback((id, key, value) => {
    setWorkOrders(prev => prev.map(r => (r.id === id ? { ...r, [key]: value } : r)));
  }, []);

  // Generic table cell updater
  const updateSpv = useCallback((idx, key, value) => {
    setSpvRows(prev => prev.map((r, i) => (i === idx ? { ...r, [key]: value } : r)));
  }, []);
  const updateBattery = useCallback((idx, key, value) => {
    setBatteryRows(prev => prev.map((r, i) => (i === idx ? { ...r, [key]: value } : r)));
  }, []);
  const updateLuminaire = useCallback((idx, key, value) => {
    setLuminaireRows(prev => prev.map((r, i) => (i === idx ? { ...r, [key]: value } : r)));
  }, []);

  const updateSignature = useCallback((idx, key, value) => {
    setSignatures(prev => prev.map((r, i) => (i === idx ? { ...r, [key]: value } : r)));
  }, []);

  // Custom sample section handlers
  const addCustomSection = useCallback(() => {
    setCustomSections(prev => [
      ...prev,
      {
        id: prev.length ? Math.max(...prev.map(s => s.id)) + 1 : 1,
        title: '',
        category: 'spv',
        groupLabel: CATEGORY_CONFIG.spv.groupLabel,
        rows: resizeRows([], sampleCount, CATEGORY_CONFIG.spv.makeEmpty),
      },
    ]);
  }, [sampleCount]);
  const removeCustomSection = useCallback((id) => {
    setCustomSections(prev => prev.filter(s => s.id !== id));
  }, []);
  const updateCustomSectionMeta = useCallback((id, key, value) => {
    setCustomSections(prev => prev.map(s => {
      if (s.id !== id) return s;
      if (key === 'category') {
        const cfg = getCategoryConfig(value);
        return {
          ...s,
          category: value,
          groupLabel: cfg.groupLabel,
          rows: resizeRows([], s.rows?.length ?? 0, cfg.makeEmpty),
        };
      }
      return { ...s, [key]: value };
    }));
  }, []);
  const updateCustomSectionRow = useCallback((id, rowIdx, key, value) => {
    setCustomSections(prev => prev.map(s => (
      s.id === id
        ? { ...s, rows: s.rows.map((r, i) => (i === rowIdx ? { ...r, [key]: value } : r)) }
        : s
    )));
  }, []);

  // Custom bulk-upload section handlers
  const addCustomBulkSection = useCallback(() => {
    setCustomBulkSections(prev => [
      ...prev,
      { id: prev.length ? Math.max(...prev.map(s => s.id)) + 1 : 1, title: '', category: 'spv', list: [] },
    ]);
  }, []);
  const removeCustomBulkSection = useCallback((id) => {
    setCustomBulkSections(prev => prev.filter(s => s.id !== id));
  }, []);
  const updateCustomBulkSection = useCallback((id, key, value) => {
    setCustomBulkSections(prev => prev.map(s => (s.id === id ? { ...s, [key]: value } : s)));
  }, []);
  const handleCustomBulkUpload = useCallback(async (e, id) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const rows = await readSheetRows(file);
      const list = extractIdList(rows);
      setCustomBulkSections(prev => prev.map(s => (s.id === id ? { ...s, list } : s)));
    } catch (err) {
      console.error('Failed to read list file:', err);
      alert(`Could not read file: ${err.message}`);
    }
  }, []);
  const handleCustomBulkPaste = useCallback((id) => (e) => {
    const text = e.clipboardData?.getData('text');
    if (!text) return;
    const lines = text.split(/\r?\n/).filter(l => l.trim() !== '');
    if (lines.length > 1) {
      e.preventDefault();
      const list = parseIdList(text);
      setCustomBulkSections(prev => prev.map(s => (s.id === id ? { ...s, list } : s)));
    }
  }, []);

  const handleSupplier = useCallback((key, value) => {
    setSupplier(prev => ({ ...prev, [key]: value }));
  }, []);

  // Bulk upload handlers for the three attached ID lists.
  // Supports Excel (.xlsx/.xls) and text (.csv/.tsv/.txt) — Excel files are
  // decoded via SheetJS so they no longer arrive corrupted.
  const handleListUpload = useCallback(async (e, setList) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const rows = await readSheetRows(file);
      setList(extractIdList(rows));
    } catch (err) {
      console.error('Failed to read list file:', err);
      alert(`Could not read file: ${err.message}`);
    }
  }, []);

  const handleListPaste = useCallback((setList) => (e) => {
    const text = e.clipboardData?.getData('text');
    if (!text) return;
    const lines = text.split(/\r?\n/).filter(l => l.trim() !== '');
    if (lines.length > 1) {
      e.preventDefault();
      setList(parseIdList(text));
    }
  }, []);

  // ============ WORK ORDER SUBMISSION ============
  const handleSubmitToWorkOrder = useCallback(async () => {
    setSubmitMessage(null);
    
    // Validation
    const rateContract = fields.rateContractNo?.trim();
    if (!rateContract) {
      setSubmitMessage({ type: 'error', text: 'Please fill Rate Contract No. & Date (Field 2(i)) before submitting.' });
      return;
    }
    
    if (workOrders.length === 0 || !workOrders[0].orderNo?.trim()) {
      setSubmitMessage({ type: 'error', text: 'Please fill at least one Work Order No. & Date (Field 2(ii)) before submitting.' });
      return;
    }

    const pdiDate = fields.dateOfInspection?.trim();
    if (!pdiDate) {
      setSubmitMessage({ type: 'error', text: 'Please fill Date of Inspection (Field 6) before submitting.' });
      return;
    }

    // Check if any lists have data
    const hasSpv = spvList.filter(id => id.trim() !== '').length > 0;
    const hasBattery = batteryList.filter(id => id.trim() !== '').length > 0;
    const hasLuminaire = luminaireList.filter(id => id.trim() !== '').length > 0;

    if (!hasSpv && !hasBattery && !hasLuminaire) {
      setSubmitMessage({ type: 'error', text: 'Please upload at least one serial number list (SPV Modules, Batteries, or Luminaires) before submitting.' });
      return;
    }

    if (!window.confirm('Submit this PDI data to create/update a Work Order? This will upload all serial numbers from the bulk lists.')) {
      return;
    }

    setSubmitting(true);
    
    try {
      // Create work order name: RateContractNo + WorkOrderNos + PDIDate
      // Combine ALL filled work order numbers as comma-separated values so a
      // single work order entry represents every order number entered.
      const allWorkOrderNos = workOrders
        .map(w => w.orderNo?.trim())
        .filter(Boolean)
        .join(', ');
      const workOrderName = `${rateContract} | ${allWorkOrderNos} | ${pdiDate}`;
      const workOrderDescription = `PDI Report - ${projectName || 'Solar Street Lighting'}`;
      // Individual order numbers stored as an array so the shared serial pool
      // can be reached by any one of them on the public form.
      const orderNumbersArray = workOrders
        .map(w => w.orderNo?.trim())
        .filter(Boolean);
      console.log('[PDI Submit] workOrders rows:', workOrders);
      console.log('[PDI Submit] order numbers array:', orderNumbersArray);
      console.log('[PDI Submit] final work order name:', workOrderName);

      // Find or create work order
      const workOrder = await findOrCreateWorkOrder({
        name: workOrderName,
        description: workOrderDescription,
        createdBy: 'PDI Form',
        orderNumbers: orderNumbersArray,
      });

      // Upload serial numbers for each category
      let totalInserted = 0;
      const results = [];

      if (hasSpv) {
        const cleanSpv = uniqueIds(spvList);
        const { inserted } = await insertWorkOrderItems(workOrder.id, 'module', cleanSpv);
        totalInserted += inserted;
        results.push(`${inserted} SPV modules`);
      }

      if (hasBattery) {
        const cleanBattery = uniqueIds(batteryList);
        const { inserted } = await insertWorkOrderItems(workOrder.id, 'battery', cleanBattery);
        totalInserted += inserted;
        results.push(`${inserted} batteries`);
      }

      if (hasLuminaire) {
        const cleanLuminaire = uniqueIds(luminaireList);
        const { inserted } = await insertWorkOrderItems(workOrder.id, 'luminaire', cleanLuminaire);
        totalInserted += inserted;
        results.push(`${inserted} luminaires`);
      }

      setSubmitMessage({
        type: 'success',
        text: `✓ Work Order "${workOrderName}" created/updated successfully! Added: ${results.join(', ')}. (${totalInserted} new serials total)`,
      });

    } catch (err) {
      console.error('Work order submission failed:', err);
      setSubmitMessage({ type: 'error', text: `Submission failed: ${err.message}` });
    } finally {
      setSubmitting(false);
    }
  }, [fields, workOrders, spvList, batteryList, luminaireList, projectName]);

  // ============ PDF BUILD ============
  // Builds the full jsPDF document using the current layout/spacing settings and
  // returns the doc (does not save). Used by both preview and export.
  const buildPDF = useCallback(() => {
    const doc = new jsPDF('portrait', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth(); // 210
    const pageHeight = doc.internal.pageSize.getHeight(); // 297
    const margin = 12;
    const contentWidth = pageWidth - margin * 2;
    // Adjustable spacing knobs
    const lineGap = Number(layout.lineGap) || 3.6;
    const rowPad = Number(layout.rowPad) || 2;
    const sectionGap = Number(layout.sectionGap) || 3;
    // The footer divider sits at pageHeight - 14. Content must never cross it,
    // otherwise the footer line prints through the last row. Clamp so the
    // smallest allowed bottom margin still leaves room for the footer.
    const FOOTER_RESERVE = 16; // mm reserved for footer line + page number
    const requestedBottom = Number(layout.bottomMargin) || 20;
    const bottomLimit = pageHeight - Math.max(requestedBottom, FOOTER_RESERVE);

    let pageNo = 0;

    const drawFooter = () => {
      const footerY = pageHeight - 14;
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.3);
      doc.line(margin, footerY, pageWidth - margin, footerY);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      doc.text(`Page ${pageNo}`, pageWidth / 2, footerY + 5, { align: 'center' });
    };

    const newPage = (withTitle = true) => {
      if (pageNo > 0) doc.addPage();
      pageNo += 1;
      let y = margin;
      // FORMAT-I top right
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      doc.text('FORMAT-I', pageWidth - margin, y, { align: 'right' });
      y += 5;
      if (withTitle) {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        const headingLines = doc.splitTextToSize(reportHeading || DEFAULT_HEADING, contentWidth);
        doc.text(headingLines, pageWidth / 2, y + 2, { align: 'center' });
        y += headingLines.length * 4.5 + 2;
        // if (projectName) {
        //   doc.setFontSize(9);
        //   doc.setFont('helvetica', 'bolditalic');
        //   const projLines = doc.splitTextToSize(`Project: ${projectName}`, contentWidth);
        //   doc.text(projLines, pageWidth / 2, y + 2, { align: 'center' });
        //   y += projLines.length * 4 + 2;
        // }
      }
      return y + 2;
    };

    // Helper: ensure vertical space, else new page
    const ensureSpace = (y, needed) => {
      if (y + needed > bottomLimit) {
        drawFooter();
        return newPage(true);
      }
      return y;
    };

    // Draw a label/value row (2-col bordered). Returns new y.
    const labelColW = contentWidth * 0.05; // number col
    const midColW = contentWidth * 0.5;
    const valColW = contentWidth - labelColW - midColW;

    const drawInfoRow = (y, no, label, value) => {
      doc.setFontSize(7.5);
      const labelLines = doc.splitTextToSize(label, midColW - 3);
      const valueLines = doc.splitTextToSize(value || '', valColW - 3);
      const linesN = Math.max(labelLines.length, valueLines.length, 1);
      const rowH = Math.max(6, linesN * lineGap + rowPad);
      y = ensureSpace(y, rowH);
      const x = margin;
      // borders
      doc.setDrawColor(120, 120, 120);
      doc.setLineWidth(0.2);
      doc.rect(x, y, labelColW, rowH);
      doc.rect(x + labelColW, y, midColW, rowH);
      doc.rect(x + labelColW + midColW, y, valColW, rowH);
      // text
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'bold');
      doc.text(no, x + labelColW / 2, y + 4, { align: 'center' });
      doc.text(labelLines, x + labelColW + 1.5, y + 4);
      doc.setFont('helvetica', 'normal');
      doc.text(valueLines, x + labelColW + midColW + 1.5, y + 4);
      return y + rowH;
    };

    // Generic data table renderer
    const drawTable = (y, title, cols, rows, groupLabel) => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      y = ensureSpace(y, 12);
      doc.setTextColor(0, 0, 0);
      doc.text(title, margin, y + 3);
      y += 6;

      const colW = contentWidth / cols.length;
      const x = margin;
      doc.setDrawColor(80, 80, 80);
      doc.setLineWidth(0.2);

      // grouped super-header if present
      const hasGroup = cols.some(c => c.group);
      if (hasGroup && groupLabel) {
        const groupStart = cols.findIndex(c => c.group);
        const groupCount = cols.filter(c => c.group).length;
        const gH = 6;
        y = ensureSpace(y, gH);
        // empty cells above non-group cols
        doc.rect(x, y, colW * groupStart, gH);
        doc.rect(x + colW * groupStart, y, colW * groupCount, gH);
        doc.setFontSize(6.5);
        doc.setFont('helvetica', 'bold');
        const gl = doc.splitTextToSize(groupLabel, colW * groupCount - 2);
        doc.text(gl, x + colW * groupStart + (colW * groupCount) / 2, y + 4, { align: 'center' });
        y += gH;
      }

      // header row metrics
      const headerLinesArr = cols.map(c => doc.splitTextToSize(c.label, colW - 2));
      const headerLineN = Math.max(...headerLinesArr.map(l => l.length), 1);
      const headerH = Math.max(8, headerLineN * 3 + 2);

      const drawHeader = (hy) => {
        doc.setFontSize(6.5);
        doc.setFont('helvetica', 'bold');
        cols.forEach((c, i) => {
          const cx = x + colW * i;
          doc.rect(cx, hy, colW, headerH);
          doc.text(headerLinesArr[i], cx + colW / 2, hy + 3.5, { align: 'center' });
        });
        return hy + headerH;
      };

      // Precompute every row's rendered lines + height so we can reason about breaks.
      const rowsMeta = rows.map((row) => {
        const cellLinesArr = cols.map((c) => {
          const val = c.key === 'srNo' && (row.srNo === undefined || row.srNo === '')
            ? '' : (row[c.key] ?? '');
          return doc.splitTextToSize(String(val), colW - 2);
        });
        const rowLineN = Math.max(...cellLinesArr.map(l => l.length), 1);
        const rowH = Math.max(6, rowLineN * (lineGap - 0.4) + rowPad);
        return { cellLinesArr, rowH };
      });

      // Keep the header together with the first few rows. If they don't fit on
      // the current page, move the whole table start to a fresh page. This is
      // what stops a table from leaving a lone orphan row on the next page.
      const keepN = Math.max(1, Math.min(Number(layout.keepRows) || 1, rowsMeta.length || 1));
      const firstBlockH = headerH + rowsMeta.slice(0, keepN).reduce((s, m) => s + m.rowH, 0);
      if (y + firstBlockH > bottomLimit) {
        drawFooter();
        y = newPage(true);
      }

      y = drawHeader(y);

      // data rows
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      rowsMeta.forEach((meta, ri) => {
        const { cellLinesArr, rowH } = meta;
        // Rows still remaining after this one (used to avoid orphaning the tail).
        const remainingAfter = rowsMeta.slice(ri + 1).reduce((s, m) => s + m.rowH, 0);
        const needsBreak = y + rowH > bottomLimit;
        if (needsBreak) {
          drawFooter();
          y = newPage(true);
          y = drawHeader(y);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(7);
        }
        cols.forEach((c, i) => {
          const cx = x + colW * i;
          doc.rect(cx, y, colW, rowH);
          doc.text(cellLinesArr[i], cx + colW / 2, y + 4, { align: 'center' });
        });
        y += rowH;
        // Suppress unused-var lint for remainingAfter (kept for readability).
        void remainingAfter;
      });

      return y + sectionGap;
    };

    // ===== PAGE 1 =====
    let y = newPage(true);

    // Fields 1..(before work order)
    y = drawInfoRow(y, GENERAL_FIELDS[0].no, GENERAL_FIELDS[0].label, fields.department);
    y = drawInfoRow(y, GENERAL_FIELDS[1].no, GENERAL_FIELDS[1].label, fields.rateContractNo);

    // Work order table stacked inside value cell
    const woValue = workOrders
      .filter(w => w.orderNo || w.date)
      .map(w => `${w.orderNo}${w.date ? '   DATED: ' + w.date : ''}`)
      .join('\n');
    y = drawInfoRow(y, '2 (ii)', 'WORK ORDER NO & DATE', woValue);

    // Fields 3..10
    for (let i = 2; i < GENERAL_FIELDS.length; i++) {
      const f = GENERAL_FIELDS[i];
      y = drawInfoRow(y, f.no, f.label, fields[f.key]);
    }

    // Field 11
    y = drawInfoRow(y, '11', 'NOS. OF SAMPLE TAKEN AT RANDOM FOR TESTING AS PER DETAILS GIVEN BELOW', String(sampleCount || ''));

    // Render custom sample sections belonging to a given component category.
    const drawCustomSectionsFor = (yPos, category) => {
      customSections
        .filter(sec => (sec.category || 'spv') === category)
        .forEach((sec) => {
          const cfg = getCategoryConfig(sec.category);
          const title = (sec.title || 'CUSTOM SECTION').trim();
          yPos = drawTable(
            yPos,
            title,
            cfg.cols,
            (sec.rows ?? []).map((r, i) => ({ ...r, srNo: r.srNo || i + 1 })),
            cfg.groupLabel,
          );
        });
      return yPos;
    };

    // Sample tables — each component followed by its custom sections
    y = drawTable(y, '(I) SPV MODULE:', SPV_COLS, spvRows.map((r, i) => ({ ...r, srNo: r.srNo || i + 1 })), 'AS PER I-V CURVE OF SOLAR PV MODULE');
    y = drawCustomSectionsFor(y, 'spv');
    y = drawTable(y, '(II) BATTERY:', BATTERY_COLS, batteryRows);
    y = drawCustomSectionsFor(y, 'battery');
    y = drawTable(y, '(III) LUMINARIES:', LUMINAIRE_COLS, luminaireRows);
    y = drawCustomSectionsFor(y, 'luminaire');

    // ===== PAGE 2 (additional fields) =====
    drawFooter();
    y = newPage(true);

    ADDITIONAL_FIELDS.forEach(f => {
      y = drawInfoRow(y, f.no, f.label, additionalFields[f.key]);
    });

    // Comments
    y = ensureSpace(y, 20);
    y += 4;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text('COMMENTS OF THE COMMITTEE:', margin, y);
    doc.setFont('helvetica', 'normal');
    const commentLines = doc.splitTextToSize(committeeComments || '', contentWidth - 60);
    doc.text(commentLines, margin + 58, y);
    y += Math.max(6, commentLines.length * 4) + 6;

    // Signatures — evenly spaced, blank space above name/designation
    if (signatures.length > 0) {
      const perRow = Math.min(3, signatures.length);
      const blockH = 34; // space per signature block (incl blank sign space)
      const colW = contentWidth / perRow;
      for (let i = 0; i < signatures.length; i++) {
        const rowIdx = Math.floor(i / perRow);
        const colIdx = i % perRow;
        if (colIdx === 0) {
          y = ensureSpace(y, blockH);
        }
        const baseY = y + rowIdx * 0; // rows advanced below
        const cx = margin + colW * colIdx + colW / 2;
        const sig = signatures[i];
        // blank signature space (line for physical signature)
        const lineY = baseY + 18;
        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(0.3);
        doc.line(cx - colW / 2 + 6, lineY, cx + colW / 2 - 6, lineY);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text(sig.name || '', cx, lineY + 5, { align: 'center' });
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        const desLines = doc.splitTextToSize(sig.designation || '', colW - 6);
        doc.text(desLines, cx, lineY + 9, { align: 'center' });
        // advance y after finishing a row
        if (colIdx === perRow - 1 || i === signatures.length - 1) {
          y += blockH;
        }
      }
    }

    // Supplier firm signature block (SIGNATURE OF REP. OF SUPPLIER FIRM / WITH SEAL / NAME / DESIGNATION)
    y = ensureSpace(y, 34);
    y += 6;
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bolditalic');
    if (supplier.firmName) {
      doc.text(supplier.firmName, margin, y);
      y += 6;
    }
    doc.setFont('helvetica', 'bold');
    doc.text('SIGNATURE OF REP. OF SUPPLIER FIRM', margin, y);
    y += 6;
    doc.text('WITH SEAL', margin, y);
    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.text(`NAME: ${supplier.name || ''}`, margin, y);
    y += 6;
    doc.text(`DESIGNATION: ${supplier.designation || ''}`, margin, y);

    // ===== ATTACHED ID-LIST PAGES (bulk uploaded lists) =====
    // 3 side-by-side blocks of (COUNT | ID) with a readable fixed row height.
    const LIST_COLS = 3;
    const LIST_ROW_H = 5.2; // mm — readable
    const drawIdListPages = (title, ids) => {
      if (!ids || ids.length === 0) return;

      // Compute how many rows fit per column on a page (measured once, after title).
      // Title takes ~6mm below the standard page header.
      const probeTop = margin + 5 + 6; // approx top after FORMAT-I + title
      const rowsPerCol = Math.max(1, Math.floor((bottomLimit - probeTop - LIST_ROW_H) / LIST_ROW_H));
      const perPage = rowsPerCol * LIST_COLS;
      const totalPages = Math.ceil(ids.length / perPage);

      const blockW = contentWidth / LIST_COLS;
      const countW = blockW * 0.26;
      const idW = blockW - countW;

      for (let p = 0; p < totalPages; p++) {
        drawFooter();
        let ly = newPage(false);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text(title, pageWidth / 2, ly, { align: 'center' });
        ly += 6;

        const pageIds = ids.slice(p * perPage, (p + 1) * perPage);

        doc.setDrawColor(120, 120, 120);
        doc.setLineWidth(0.15);

        // Header cells for each of the 3 blocks
        for (let c = 0; c < LIST_COLS; c++) {
          const cx = margin + c * blockW;
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(7.5);
          doc.rect(cx, ly, countW, LIST_ROW_H);
          doc.rect(cx + countW, ly, idW, LIST_ROW_H);
          doc.text('COUNT', cx + countW / 2, ly + LIST_ROW_H - 1.6, { align: 'center' });
          doc.text('ID', cx + countW + idW / 2, ly + LIST_ROW_H - 1.6, { align: 'center' });
        }
        const dataStartY = ly + LIST_ROW_H;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        pageIds.forEach((id, i) => {
          const col = Math.floor(i / rowsPerCol); // which of the 3 blocks
          const rowIdx = i % rowsPerCol;
          const cx = margin + col * blockW;
          const ry = dataStartY + rowIdx * LIST_ROW_H;
          const globalCount = p * perPage + i + 1;
          doc.rect(cx, ry, countW, LIST_ROW_H);
          doc.rect(cx + countW, ry, idW, LIST_ROW_H);
          doc.text(String(globalCount), cx + countW / 2, ry + LIST_ROW_H - 1.6, { align: 'center' });
          const idStr = doc.splitTextToSize(String(id), idW - 2)[0]; // keep to one line
          doc.text(idStr, cx + countW + 1.5, ry + LIST_ROW_H - 1.6);
        });
      }
    };

    // Render custom bulk-upload lists belonging to a given component category.
    // Only UNIQUE serial numbers are printed (duplicates are removed).
    const drawCustomBulkFor = (category) => {
      customBulkSections
        .filter(sec => (sec.category || 'spv') === category)
        .forEach((sec) => {
          const title = (sec.title || 'CUSTOM ATTACHED LIST').trim();
          drawIdListPages(title, uniqueIds(sec.list ?? []));
        });
    };

    // Each component's attached list followed by its custom bulk lists.
    // uniqueIds() ensures only unique serial numbers reach the PDF.
    drawIdListPages(listTitles.spv || 'SPV MODULE SERIAL NUMBERS (ATTACHED LIST)', uniqueIds(spvList));
    drawCustomBulkFor('spv');
    drawIdListPages(listTitles.battery || 'BATTERY SERIAL NUMBERS (ATTACHED LIST)', uniqueIds(batteryList));
    drawCustomBulkFor('battery');
    drawIdListPages(listTitles.luminaire || 'LUMINAIRE SERIAL NUMBERS (ATTACHED LIST)', uniqueIds(luminaireList));
    drawCustomBulkFor('luminaire');

    drawFooter();

    return doc;
  }, [layout, projectName, reportHeading, fields, additionalFields, workOrders, sampleCount, spvRows, batteryRows, luminaireRows, customSections, committeeComments, signatures, supplier, spvList, batteryList, luminaireList, customBulkSections, listTitles]);

  // Download the PDF using the current settings.
  const exportPDF = useCallback(() => {
    const doc = buildPDF();
    const safeName = (projectName || 'PDI_report').replace(/[^\w\-]+/g, '_');
    doc.save(`${safeName}.pdf`);
  }, [buildPDF, projectName]);

  // Open a live preview of the PDF in a modal (so pages can be checked before export).
  const previewPDF = useCallback(() => {
    const doc = buildPDF();
    const url = doc.output('bloburl');
    setPreviewUrl(prev => {
      if (prev) URL.revokeObjectURL(prev);
      return url;
    });
    setShowPreview(true);
  }, [buildPDF]);

  const closePreview = useCallback(() => {
    setShowPreview(false);
    setPreviewUrl(prev => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  }, []);

  const updateLayout = useCallback((key, value) => {
    setLayout(prev => ({ ...prev, [key]: value }));
  }, []);

  return (
    <div className="jcr-page">
      <header className="jcr-header">
        <div className="header-inner">
          <div className="header-left">
            <button className="header-btn" onClick={onBack} title="Back to Generator">
              <ArrowLeft size={18} />
              <span>Back</span>
            </button>
            <div className="logo">
              <Logo size="medium" />
              <div className="logo-text">
                <h1>PDI</h1>
                <span className="subtitle">Pre-Dispatch Inspection Report Generator</span>
              </div>
            </div>
          </div>
          <div className="header-right">
            <input
              type="file"
              accept="application/json,.json"
              ref={fileInputRef}
              onChange={loadJSON}
              style={{ display: 'none' }}
            />
            <button className="header-btn" onClick={() => fileInputRef.current?.click()} title="Load JSON">
              <Upload size={18} />
              <span>Load JSON</span>
            </button>
            <button className="header-btn" onClick={exportJSON} title="Export as JSON">
              <Save size={18} />
              <span>Export JSON</span>
            </button>
            <button className="header-btn" onClick={previewPDF} title="Preview PDF before export">
              <FileText size={18} />
              <span>Preview PDF</span>
            </button>
            <button className="header-btn export" onClick={exportPDF} title="Export PDF">
              <Download size={18} />
              <span>Export PDF</span>
            </button>
            <button className="header-btn logout" onClick={onLogout} title="Logout">
              <LogOut size={18} />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </header>

      <div className="jcr-body">
        {/* Title bar */}
        <section className="jcr-card">
          <div className="jcr-field-block">
            <label>Project Name (printed as title on every page)</label>
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="Enter project name"
            />
          </div>
          <div className="jcr-field-block">
            <label>Report Heading (editable)</label>
            <input
              type="text"
              value={reportHeading}
              onChange={(e) => setReportHeading(e.target.value)}
              placeholder="Report heading"
            />
          </div>
        </section>

        {/* PDF spacing controls */}
        <section className="jcr-card">
          <h3 className="pdi-spacing-title">PDF Spacing &amp; Page Layout</h3>
          <p className="pdi-spacing-hint">
            Adjust these to control how much space rows take and where page breaks fall.
            Lower values pack more onto each page. Use Preview PDF to check pages before exporting.
          </p>
          <div className="pdi-spacing-grid">
            <div className="jcr-field-block">
              <label>Line spacing (mm/line)</label>
              <input
                type="number" step="0.1" min="2.4" max="8"
                value={layout.lineGap}
                onChange={(e) => updateLayout('lineGap', e.target.value)}
              />
            </div>
            <div className="jcr-field-block">
              <label>Row padding (mm)</label>
              <input
                type="number" step="0.5" min="0" max="8"
                value={layout.rowPad}
                onChange={(e) => updateLayout('rowPad', e.target.value)}
              />
            </div>
            <div className="jcr-field-block">
              <label>Gap after section (mm)</label>
              <input
                type="number" step="0.5" min="0" max="12"
                value={layout.sectionGap}
                onChange={(e) => updateLayout('sectionGap', e.target.value)}
              />
            </div>
            <div className="jcr-field-block">
              <label>Bottom margin before break (mm)</label>
              <input
                type="number" step="1" min="16" max="40"
                value={layout.bottomMargin}
                onChange={(e) => updateLayout('bottomMargin', e.target.value)}
              />
            </div>
            <div className="jcr-field-block">
              <label>Keep rows with header (min)</label>
              <input
                type="number" step="1" min="1" max="20"
                value={layout.keepRows}
                onChange={(e) => updateLayout('keepRows', e.target.value)}
              />
            </div>
          </div>
          <div className="pdi-spacing-actions">
            <button
              type="button"
              className="header-btn"
              onClick={() => setLayout({ lineGap: 3.6, rowPad: 2, sectionGap: 3, bottomMargin: 20, keepRows: 2 })}
              title="Reset spacing to defaults"
            >
              Reset spacing
            </button>
            <button type="button" className="header-btn export" onClick={previewPDF}>
              <FileText size={16} />
              <span>Preview PDF</span>
            </button>
          </div>
        </section>

        {/* Page 1 — General fields */}
        <section className="jcr-card">
          <h3><FileText size={16} /> Page 1 — General Information</h3>

          <div className="jcr-info-grid">
            <div className="jcr-info-row">
              <span className="jcr-no">{GENERAL_FIELDS[0].no}</span>
              <span className="jcr-label">{GENERAL_FIELDS[0].label}</span>
              <input type="text" value={fields.department} onChange={(e) => handleField('department', e.target.value)} />
            </div>
            <div className="jcr-info-row">
              <span className="jcr-no">{GENERAL_FIELDS[1].no}</span>
              <span className="jcr-label">{GENERAL_FIELDS[1].label}</span>
              <input type="text" value={fields.rateContractNo} onChange={(e) => handleField('rateContractNo', e.target.value)} />
            </div>

            {/* Work Order dynamic table */}
            <div className="jcr-info-row work-order-row">
              <span className="jcr-no">2 (ii)</span>
              <span className="jcr-label">WORK ORDER NO & DATE</span>
              <div className="work-order-table">
                {workOrders.map((w) => (
                  <div className="work-order-line" key={w.id}>
                    <input
                      type="text"
                      className="wo-no"
                      value={w.orderNo}
                      onChange={(e) => updateWorkOrder(w.id, 'orderNo', e.target.value)}
                      placeholder="Work Order No (e.g. DNRE/2025-2026/10060)"
                    />
                    <input
                      type="text"
                      className="wo-date"
                      value={w.date}
                      onChange={(e) => updateWorkOrder(w.id, 'date', e.target.value)}
                      placeholder="Date (e.g. 04-02-2026)"
                    />
                    <button
                      className="btn-remove"
                      onClick={() => removeWorkOrder(w.id)}
                      disabled={workOrders.length === 1}
                      title="Remove"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
                <button className="btn-add-sm" onClick={addWorkOrder}>
                  <Plus size={14} /> Add Work Order
                </button>
              </div>
            </div>

            {GENERAL_FIELDS.slice(2).map((f) => (
              <div className="jcr-info-row" key={f.key}>
                <span className="jcr-no">{f.no}</span>
                <span className="jcr-label">{f.label}</span>
                {f.multiline ? (
                  <textarea rows={2} value={fields[f.key]} onChange={(e) => handleField(f.key, e.target.value)} />
                ) : (
                  <input type="text" value={fields[f.key]} onChange={(e) => handleField(f.key, e.target.value)} />
                )}
              </div>
            ))}

            {/* Field 11 — sample count */}
            <div className="jcr-info-row">
              <span className="jcr-no">11</span>
              <span className="jcr-label">NOS. OF SAMPLE TAKEN AT RANDOM FOR TESTING AS PER DETAILS GIVEN BELOW</span>
              <input
                type="number"
                min="0"
                value={sampleCount}
                onChange={(e) => setSampleCount(parseInt(e.target.value, 10) || 0)}
                placeholder="Enter number of samples"
              />
            </div>
          </div>
        </section>

        {/* Sample tables */}
        {sampleCount > 0 && (
          <>
            <section className="jcr-card">
              <h3>(I) SPV MODULE</h3>
              <div className="jcr-table-wrapper">
                <table className="jcr-table">
                  <thead>
                    <tr>
                      <th rowSpan={2}>SR. NO OF SPV MODULE</th>
                      <th rowSpan={2}>SPV MODULE MAKE</th>
                      <th rowSpan={2}>TYPE OF MODULE</th>
                      <th rowSpan={2}>WATTAGE AS PER SPECIFICATION (IN WATT)</th>
                      <th colSpan={4}>AS PER I-V CURVE OF SOLAR PV MODULE</th>
                    </tr>
                    <tr>
                      <th>VOC</th>
                      <th>ISC</th>
                      <th>WATTAGE</th>
                      <th>EFFICIENCY</th>
                    </tr>
                  </thead>
                  <tbody>
                    {spvRows.map((row, idx) => (
                      <tr key={idx}>
                        <td><input value={row.srNo} onChange={(e) => updateSpv(idx, 'srNo', e.target.value)} placeholder={`${idx + 1})`} /></td>
                        <td><input value={row.make} onChange={(e) => updateSpv(idx, 'make', e.target.value)} /></td>
                        <td><input value={row.type} onChange={(e) => updateSpv(idx, 'type', e.target.value)} /></td>
                        <td><input value={row.wattageSpec} onChange={(e) => updateSpv(idx, 'wattageSpec', e.target.value)} /></td>
                        <td><input value={row.voc} onChange={(e) => updateSpv(idx, 'voc', e.target.value)} /></td>
                        <td><input value={row.isc} onChange={(e) => updateSpv(idx, 'isc', e.target.value)} /></td>
                        <td><input value={row.wattage} onChange={(e) => updateSpv(idx, 'wattage', e.target.value)} /></td>
                        <td><input value={row.efficiency} onChange={(e) => updateSpv(idx, 'efficiency', e.target.value)} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="jcr-card">
              <h3>(II) BATTERY</h3>
              <div className="jcr-table-wrapper">
                <table className="jcr-table">
                  <thead>
                    <tr>
                      <th>SR. NO OF BATTERY</th>
                      <th>BATTERY MAKE</th>
                      <th>TYPE OF BATTERY</th>
                      <th>VOLTAGE</th>
                      <th>CAPACITY</th>
                    </tr>
                  </thead>
                  <tbody>
                    {batteryRows.map((row, idx) => (
                      <tr key={idx}>
                        <td><input value={row.srNo} onChange={(e) => updateBattery(idx, 'srNo', e.target.value)} /></td>
                        <td><input value={row.make} onChange={(e) => updateBattery(idx, 'make', e.target.value)} /></td>
                        <td><input value={row.type} onChange={(e) => updateBattery(idx, 'type', e.target.value)} /></td>
                        <td><input value={row.voltage} onChange={(e) => updateBattery(idx, 'voltage', e.target.value)} /></td>
                        <td><input value={row.capacity} onChange={(e) => updateBattery(idx, 'capacity', e.target.value)} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="jcr-card">
              <h3>(III) LUMINARIES</h3>
              <div className="jcr-table-wrapper">
                <table className="jcr-table">
                  <thead>
                    <tr>
                      <th>SR. NO OF LUMINARIES</th>
                      <th>LUMINARY MAKE</th>
                      <th>POWER CONSUMPTION (IN WATT)</th>
                      <th>NO LOAD CURRENT (IN mA)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {luminaireRows.map((row, idx) => (
                      <tr key={idx}>
                        <td><input value={row.srNo} onChange={(e) => updateLuminaire(idx, 'srNo', e.target.value)} /></td>
                        <td><input value={row.make} onChange={(e) => updateLuminaire(idx, 'make', e.target.value)} /></td>
                        <td><input value={row.power} onChange={(e) => updateLuminaire(idx, 'power', e.target.value)} /></td>
                        <td><input value={row.noLoadCurrent} onChange={(e) => updateLuminaire(idx, 'noLoadCurrent', e.target.value)} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* User-added custom sample sections (same layout as SPV module table) */}
            {customSections.map((sec) => (
              <section className="jcr-card" key={sec.id}>
                <div className="jcr-custom-head">
                  <input
                    type="text"
                    className="jcr-custom-title"
                    value={sec.title}
                    onChange={(e) => updateCustomSectionMeta(sec.id, 'title', e.target.value)}
                    placeholder="Section title (e.g. (IV) CHARGE CONTROLLER)"
                  />
                  <select
                    className="jcr-category-select"
                    value={sec.category || 'spv'}
                    onChange={(e) => updateCustomSectionMeta(sec.id, 'category', e.target.value)}
                    title="Place this section below the selected component in the report"
                  >
                    {COMPONENT_CATEGORIES.map(c => (
                      <option key={c.value} value={c.value}>Under: {c.label}</option>
                    ))}
                  </select>
                  <button className="btn-remove-text" onClick={() => removeCustomSection(sec.id)}>
                    <Trash2 size={14} /> Remove Section
                  </button>
                </div>
                {getCategoryConfig(sec.category).cols.some(c => c.group) && (
                  <div className="jcr-field-block">
                    <label>Grouped header label (spans the grouped columns)</label>
                    <input
                      type="text"
                      value={sec.groupLabel}
                      onChange={(e) => updateCustomSectionMeta(sec.id, 'groupLabel', e.target.value)}
                      placeholder="e.g. AS PER I-V CURVE OF SOLAR PV MODULE"
                    />
                  </div>
                )}
                {(() => {
                  const cfg = getCategoryConfig(sec.category);
                  const baseCols = cfg.cols.filter(c => !c.group);
                  const groupCols = cfg.cols.filter(c => c.group);
                  return (
                    <div className="jcr-table-wrapper">
                      <table className="jcr-table">
                        <thead>
                          <tr>
                            {baseCols.map(c => (
                              <th key={c.key} rowSpan={groupCols.length ? 2 : 1}>{c.label}</th>
                            ))}
                            {groupCols.length > 0 && (
                              <th colSpan={groupCols.length}>{sec.groupLabel || '\u00A0'}</th>
                            )}
                          </tr>
                          {groupCols.length > 0 && (
                            <tr>
                              {groupCols.map(c => (
                                <th key={c.key}>{c.label}</th>
                              ))}
                            </tr>
                          )}
                        </thead>
                        <tbody>
                          {(sec.rows ?? []).map((row, idx) => (
                            <tr key={idx}>
                              {cfg.cols.map(c => (
                                <td key={c.key}>
                                  <input
                                    value={row[c.key] ?? ''}
                                    onChange={(e) => updateCustomSectionRow(sec.id, idx, c.key, e.target.value)}
                                    placeholder={c.key === 'srNo' ? `${idx + 1})` : undefined}
                                  />
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                })()}
              </section>
            ))}

            <section className="jcr-card jcr-add-section-card">
              <button className="btn-add-sm" onClick={addCustomSection}>
                <Plus size={14} /> Add Custom Sample Section
              </button>
              <span className="jcr-hint">Same tabular format as the SPV Module table, sized to the sample count above.</span>
            </section>
          </>
        )}

        {/* Page 2 — additional fields */}
        <section className="jcr-card">
          <h3><FileText size={16} /> Page 2 — Additional Specifications</h3>
          <div className="jcr-info-grid">
            {ADDITIONAL_FIELDS.map((f) => (
              <div className="jcr-info-row" key={f.key}>
                <span className="jcr-no">{f.no}</span>
                <span className="jcr-label">{f.label}</span>
                <input type="text" value={additionalFields[f.key]} onChange={(e) => handleAdditional(f.key, e.target.value)} />
              </div>
            ))}
          </div>

          <div className="jcr-field-block">
            <label>Comments of the Committee</label>
            <textarea
              rows={2}
              value={committeeComments}
              onChange={(e) => setCommitteeComments(e.target.value)}
              placeholder="Committee comments"
            />
          </div>
        </section>

        {/* Supplier firm signature block */}
        <section className="jcr-card">
          <h3>Supplier Firm (Signature Block)</h3>
          <div className="jcr-field-block">
            <label>Firm Name (printed above signature)</label>
            <input
              type="text"
              value={supplier.firmName}
              onChange={(e) => handleSupplier('firmName', e.target.value)}
              placeholder="e.g., For Sunfeed Ecosolutions India Pvt. Ltd."
            />
          </div>
          <div className="jcr-field-block">
            <label>Name</label>
            <input
              type="text"
              value={supplier.name}
              onChange={(e) => handleSupplier('name', e.target.value)}
              placeholder="e.g., MR VISHAL SEHGAL"
            />
          </div>
          <div className="jcr-field-block">
            <label>Designation</label>
            <input
              type="text"
              value={supplier.designation}
              onChange={(e) => handleSupplier('designation', e.target.value)}
              placeholder="e.g., GENERAL MANAGER"
            />
          </div>
        </section>

        {/* Signatures */}
        <section className="jcr-card">
          <h3>Signatures</h3>
          <div className="jcr-field-block">
            <label>Number of Signatures</label>
            <input
              type="number"
              min="0"
              value={signatureCount}
              onChange={(e) => setSignatureCount(parseInt(e.target.value, 10) || 0)}
              placeholder="Enter number of signatures"
            />
          </div>

          {signatures.length > 0 && (
            <div className="signature-grid">
              {signatures.map((sig, idx) => (
                <div className="signature-slot" key={idx}>
                  <div className="signature-space">Signature {idx + 1}</div>
                  <input
                    type="text"
                    value={sig.name}
                    onChange={(e) => updateSignature(idx, 'name', e.target.value)}
                    placeholder="Name"
                  />
                  <input
                    type="text"
                    value={sig.designation}
                    onChange={(e) => updateSignature(idx, 'designation', e.target.value)}
                    placeholder="Designation"
                  />
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Bulk upload — attached ID lists */}
        <section className="jcr-card">
          <h3><Upload size={16} /> Bulk Upload — Attached ID Lists</h3>
          <p className="jcr-hint">
            Upload or paste each list separately. The first column of each row is used as the ID.
            Each list is printed on its own PDF pages (~140 IDs per page across 3 Count &amp; ID column blocks).
          </p>
          <div className="bulk-upload-grid">
            <BulkUploadBox
              title={listTitles.spv}
              onTitleChange={(v) => setListTitles(prev => ({ ...prev, spv: v }))}
              list={spvList}
              onUpload={(e) => handleListUpload(e, setSpvList)}
              onPaste={handleListPaste(setSpvList)}
              onChange={setSpvList}
              onClear={() => setSpvList([])}
            />
            <BulkUploadBox
              title={listTitles.battery}
              onTitleChange={(v) => setListTitles(prev => ({ ...prev, battery: v }))}
              list={batteryList}
              onUpload={(e) => handleListUpload(e, setBatteryList)}
              onPaste={handleListPaste(setBatteryList)}
              onChange={setBatteryList}
              onClear={() => setBatteryList([])}
            />
            <BulkUploadBox
              title={listTitles.luminaire}
              onTitleChange={(v) => setListTitles(prev => ({ ...prev, luminaire: v }))}
              list={luminaireList}
              onUpload={(e) => handleListUpload(e, setLuminaireList)}
              onPaste={handleListPaste(setLuminaireList)}
              onChange={setLuminaireList}
              onClear={() => setLuminaireList([])}
            />

            {/* User-added custom bulk-upload sections (free-text header, same sheet) */}
            {customBulkSections.map((sec) => (
              <div className="bulk-box" key={sec.id}>
                <div className="bulk-box-head">
                  <input
                    type="text"
                    className="bulk-title-input"
                    value={sec.title}
                    onChange={(e) => updateCustomBulkSection(sec.id, 'title', e.target.value)}
                    placeholder="Header (free text)"
                  />
                  <span className="bulk-count">{(sec.list ?? []).filter(id => id.trim() !== '').length} IDs</span>
                </div>
                <select
                  className="jcr-category-select bulk-category-select"
                  value={sec.category || 'spv'}
                  onChange={(e) => updateCustomBulkSection(sec.id, 'category', e.target.value)}
                  title="Place this list below the selected component in the report"
                >
                  {COMPONENT_CATEGORIES.map(c => (
                    <option key={c.value} value={c.value}>Under: {c.label}</option>
                  ))}
                </select>
                <div className="bulk-actions">
                  <label className="btn-add-sm bulk-upload-label">
                    <Upload size={14} /> Upload File
                    <input
                      type="file"
                      accept=".csv,.txt,.tsv,.xlsx,.xls"
                      style={{ display: 'none' }}
                      onChange={(e) => handleCustomBulkUpload(e, sec.id)}
                    />
                  </label>
                  <button className="btn-remove-text" onClick={() => updateCustomBulkSection(sec.id, 'list', [])} disabled={(sec.list ?? []).length === 0}>
                    <Trash2 size={14} /> Clear
                  </button>
                  <button className="btn-remove-text" onClick={() => removeCustomBulkSection(sec.id)}>
                    <Trash2 size={14} /> Remove
                  </button>
                </div>
                <textarea
                  className="bulk-paste"
                  rows={5}
                  placeholder="Type or paste IDs here (one per line, or first column of pasted rows)"
                  onPaste={handleCustomBulkPaste(sec.id)}
                  value={(sec.list ?? []).join('\n')}
                  onChange={(e) => updateCustomBulkSection(sec.id, 'list', e.target.value.split(/\r?\n/))}
                />
                <DuplicatePanel title={sec.title || 'Custom List'} list={sec.list ?? []} />
              </div>
            ))}
          </div>

          <div className="jcr-add-bulk-bar">
            <button className="btn-add-sm" onClick={addCustomBulkSection}>
              <Plus size={14} /> Add Custom Bulk Upload Section
            </button>
            <span className="jcr-hint">Free-text header, same sheet format as SPV Modules. Printed on its own PDF pages.</span>
          </div>

          {/* Submit to Work Order Button */}
          <div className="pdi-submit-section">
            <div className="pdi-submit-info">
              <p><strong>Submit PDI to Work Orders:</strong></p>
              <p className="jcr-hint">
                This will create a Work Order with the format: <strong>Rate Contract No + Work Order No(s) + PDI Date</strong>. All Work Order Numbers entered above are combined into a single entry (comma-separated).
                <br />
                All serial numbers from the bulk upload lists above will be added to the work order.
              </p>
            </div>
            {submitMessage && (
              <div className={`msg ${submitMessage.type}`}>
                {submitMessage.text}
              </div>
            )}
            <button 
              className="btn-export-main" 
              onClick={handleSubmitToWorkOrder}
              disabled={submitting}
              style={{ marginTop: '10px' }}
            >
              <Send size={18} /> {submitting ? 'Submitting...' : 'Submit to Work Order'}
            </button>
          </div>
        </section>

        <div className="jcr-export-bar">
          <button className="btn-export-main secondary" onClick={() => fileInputRef.current?.click()}>
            <Upload size={18} /> Load JSON
          </button>
          <button className="btn-export-main secondary" onClick={exportJSON}>
            <Save size={18} /> Export JSON
          </button>
          <button className="btn-export-main secondary" onClick={previewPDF}>
            <FileText size={18} /> Preview PDF
          </button>
          <button className="btn-export-main" onClick={exportPDF}>
            <Download size={18} /> Export PDF
          </button>
        </div>
      </div>

      {showPreview && (
        <div className="pdi-preview-overlay" onClick={closePreview}>
          <div className="pdi-preview-modal" onClick={(e) => e.stopPropagation()}>
            <div className="pdi-preview-toolbar">
              <span className="pdi-preview-title">PDF Preview</span>
              <div className="pdi-preview-toolbar-actions">
                <button className="header-btn" onClick={previewPDF} title="Re-render with current spacing">
                  <RefreshCw size={16} />
                  <span>Refresh</span>
                </button>
                <button className="header-btn export" onClick={exportPDF} title="Download PDF">
                  <Download size={16} />
                  <span>Download</span>
                </button>
                <button className="header-btn" onClick={closePreview} title="Close preview">
                  <span>Close</span>
                </button>
              </div>
            </div>
            {previewUrl && (
              <iframe className="pdi-preview-frame" src={previewUrl} title="PDF preview" />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default PDI;