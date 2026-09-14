import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  ArrowLeft, LogOut, Trash2, RefreshCw, Upload, ClipboardList,
  Share2, Download, ChevronDown, ChevronRight, Package, CheckCircle2, Clock, FileUp,
} from 'lucide-react';
import Logo from './Logo';
import { getCurrentUser } from '../utils/auth';
import {
  WO_CATEGORIES,
  CATEGORY_LABELS,
  fetchWorkOrders,
  createWorkOrder,
  deleteWorkOrder,
  fetchWorkOrderItems,
  insertWorkOrderItems,
  deleteWorkOrderItem,
  markItemAvailable,
  summarizeItems,
  parseSerialFile,
} from '../utils/workorders';
import { uploadWorkOrderPdf, listWorkOrderPdfs, deleteWorkOrderPdf } from '../utils/storageUploads';
import './WorkOrders.css';

function WorkOrders({ onBack, onLogout }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setOrders(await fetchWorkOrders());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = useCallback(async (id) => {
    if (!window.confirm('Delete this work order and all its serials? This cannot be undone.')) return;
    try {
      await deleteWorkOrder(id);
      setOrders((prev) => prev.filter((o) => o.id !== id));
    } catch (err) {
      setError(`Delete failed: ${err.message}`);
    }
  }, []);

  const handleShareForm = useCallback(async () => {
    const url = `${window.location.origin}${window.location.pathname}?form=install`;
    try {
      await navigator.clipboard.writeText(url);
      setMessage({ type: 'success', text: `Shareable PDI form link copied: ${url}` });
    } catch {
      window.prompt('Copy this shareable PDI form link:', url);
    }
  }, []);

  const filteredOrders = useMemo(() => {
    if (!searchQuery.trim()) return orders;
    const query = searchQuery.toLowerCase();
    return orders.filter((order) => 
      order.name.toLowerCase().includes(query) ||
      (order.description && order.description.toLowerCase().includes(query))
    );
  }, [orders, searchQuery]);

  return (
    <div className="wo-page">
      <header className="wo-header">
        <div className="header-inner">
          <div className="header-left">
            <button className="header-btn" onClick={onBack} title="Back to Generator">
              <ArrowLeft size={18} />
              <span>Back</span>
            </button>
            <div className="logo">
              <Logo size="medium" />
              <div className="logo-text">
                <h1>Work Orders</h1>
                <span className="subtitle">Equipment Serial Tracking</span>
              </div>
            </div>
          </div>
          <div className="header-right">
            <button className="header-btn" onClick={handleShareForm} title="Share PDI form link">
              <Share2 size={18} />
              <span>Share PDI Form</span>
            </button>
            <button className="header-btn logout" onClick={onLogout} title="Logout">
              <LogOut size={18} />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </header>

      <div className="wo-body">
        <div className="wo-info-banner">
          <p>Work orders are automatically created when PDI (Pre-Dispatch Inspection) forms are submitted. Use the "Share PDI Form" button to send the form link to field users.</p>
        </div>

        <div className="wo-list-head">
          <h2><ClipboardList size={18} /> Work Orders</h2>
          <div className="wo-list-controls">
            <input
              type="text"
              className="wo-search-input"
              placeholder="Search work orders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button className="btn-refresh" onClick={load}>
              <RefreshCw size={16} /> {loading ? 'Loading…' : 'Refresh'}
            </button>
          </div>
        </div>

        {message && <div className={`msg ${message.type}`}>{message.text}</div>}
        {error && <div className="msg error">{error}</div>}

        {filteredOrders.length === 0 && !loading && (
          <div className="wo-empty">
            {searchQuery.trim() 
              ? `No work orders found matching "${searchQuery}"`
              : 'No work orders yet. Work orders are created automatically from PDI forms.'}
          </div>
        )}

        <div className="wo-list">
          {filteredOrders.map((order) => (
            <WorkOrderCard
              key={order.id}
              order={order}
              expanded={expandedId === order.id}
              onToggle={() => setExpandedId((id) => (id === order.id ? null : order.id))}
              onDelete={() => handleDelete(order.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default WorkOrders;

// A single expandable work order: shows summary stats and, when open, the
// per-category breakdown and list of items with used/available status.
function WorkOrderCard({ order, expanded, onToggle, onDelete }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pdfFiles, setPdfFiles] = useState([]);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [loadingPdfs, setLoadingPdfs] = useState(false);
  const [uploadMsg, setUploadMsg] = useState(null);
  const pdfInputRef = useRef(null);

  const loadItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setItems(await fetchWorkOrderItems(order.id));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [order.id]);

  const loadPdfs = useCallback(async () => {
    setLoadingPdfs(true);
    try {
      const pdfs = await listWorkOrderPdfs(order.id);
      setPdfFiles(pdfs);
    } catch (err) {
      console.warn('Could not load PDFs:', err);
      setPdfFiles([]);
    } finally {
      setLoadingPdfs(false);
    }
  }, [order.id]);

  // Load items immediately when component mounts to fix 0/0/0 display bug
  useEffect(() => {
    loadItems();
  }, [loadItems]);

  // Load PDFs when expanded
  useEffect(() => {
    if (expanded) {
      loadPdfs();
    }
  }, [expanded, loadPdfs]);

  const { summary, total, used, pending } = useMemo(() => summarizeItems(items), [items]);

  const handlePdfUpload = useCallback(async (file) => {
    if (!file) return;
    setUploadingPdf(true);
    setError(null);
    try {
      await uploadWorkOrderPdf(order.id, file);
      await loadPdfs(); // Reload PDF list
      setError(null);
    } catch (err) {
      setError(`PDF upload failed: ${err.message}`);
    } finally {
      setUploadingPdf(false);
    }
  }, [order.id, loadPdfs]);

  const handlePdfDelete = useCallback(async (path) => {
    if (!window.confirm('Delete this PDF file? This cannot be undone.')) return;
    try {
      await deleteWorkOrderPdf(path);
      await loadPdfs(); // Reload PDF list
    } catch (err) {
      setError(`PDF deletion failed: ${err.message}`);
    }
  }, [loadPdfs]);

  const handleBulkUpload = useCallback(
    async (category, file) => {
      if (!file) return;
      setUploadMsg(null);
      try {
        const serials = await parseSerialFile(file);
        if (serials.length === 0) {
          setUploadMsg({ type: 'error', text: 'No serials found in that file.' });
          return;
        }
        const { inserted } = await insertWorkOrderItems(order.id, category, serials);
        setUploadMsg({
          type: 'success',
          text: `Added ${inserted} new ${CATEGORY_LABELS[category]} serial(s) (${serials.length} read from file).`,
        });
        await loadItems();
      } catch (err) {
        setUploadMsg({ type: 'error', text: `Upload failed: ${err.message}` });
      }
    },
    [order.id, loadItems]
  );

  const handleRevert = useCallback(async (id) => {
    try {
      await markItemAvailable(id);
      setItems((prev) => prev.map((it) => (it.id === id ? { ...it, status: 'available', used_by: null, used_at: null } : it)));
    } catch (err) {
      setError(`Update failed: ${err.message}`);
    }
  }, []);

  const handleDeleteItem = useCallback(async (id) => {
    try {
      await deleteWorkOrderItem(id);
      setItems((prev) => prev.filter((it) => it.id !== id));
    } catch (err) {
      setError(`Delete failed: ${err.message}`);
    }
  }, []);

  const exportCsv = useCallback(() => {
    if (items.length === 0) return;
    const esc = (v) => {
      const s = v == null ? '' : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const header = ['Category', 'Serial', 'Status', 'Used By', 'Used At'];
    const lines = [header.map(esc).join(',')];
    for (const it of items) {
      lines.push([CATEGORY_LABELS[it.category] || it.category, it.serial, it.status, it.used_by, it.used_at].map(esc).join(','));
    }
    const blob = new Blob(['\uFEFF' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `workorder_${order.name.replace(/[^\w-]+/g, '_')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [items, order.name]);

  return (
    <div className={`wo-card ${expanded ? 'open' : ''}`}>
      <div className="wo-card-head" onClick={onToggle}>
        <div className="wo-card-title">
          {expanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
          <Package size={18} />
          <div>
            <strong>{order.name}</strong>
            {order.description && <span className="wo-card-desc">{order.description}</span>}
          </div>
        </div>
        <div className="wo-card-stats">
          <span className="wo-chip total">{total} total</span>
          <span className="wo-chip used"><CheckCircle2 size={13} /> {used} used</span>
          <span className="wo-chip pending"><Clock size={13} /> {pending} available</span>
          <button
            className="btn-icon pdf-upload-btn"
            onClick={(e) => { e.stopPropagation(); pdfInputRef.current?.click(); }}
            title="Upload PDF for this work order"
            disabled={uploadingPdf}
          >
            <FileUp size={15} />
          </button>
          <input
            ref={pdfInputRef}
            type="file"
            accept=".pdf,application/pdf"
            style={{ display: 'none' }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handlePdfUpload(file);
              e.target.value = '';
            }}
          />
          <button
            className="btn-icon danger"
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            title="Delete work order"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="wo-card-body">
          <div className="wo-summary-tiles">
            <div className="wo-summary-tile">
              <div className="wo-summary-label">Solar Panels</div>
              <div className="wo-summary-count">
                <span className="used">{summary.module?.used || 0}</span> / {summary.module?.total || 0}
              </div>
            </div>
            <div className="wo-summary-tile">
              <div className="wo-summary-label">Batteries</div>
              <div className="wo-summary-count">
                <span className="used">{summary.battery?.used || 0}</span> / {summary.battery?.total || 0}
              </div>
            </div>
            <div className="wo-summary-tile">
              <div className="wo-summary-label">Luminaires</div>
              <div className="wo-summary-count">
                <span className="used">{summary.luminaire?.used || 0}</span> / {summary.luminaire?.total || 0}
              </div>
            </div>
          </div>

          {/* Bulk Upload Section - for pre-loading inventory */}
          <div className="wo-bulk-upload-section">
            <h3 className="wo-section-heading">📦 Bulk Upload Inventory (Optional)</h3>
            <p className="wo-section-hint">
              Pre-load serial numbers via CSV if you have inventory before PDI submissions. 
              Serial numbers are also added automatically when PDI forms are submitted.
            </p>
            <div className="wo-bulk-upload-grid">
              {WO_CATEGORIES.map((cat) => (
                <BulkUploadTile
                  key={cat.key}
                  category={cat}
                  stats={summary[cat.key]}
                  onUpload={(file) => handleBulkUpload(cat.key, file)}
                />
              ))}
            </div>
            {uploadMsg && <div className={`msg ${uploadMsg.type}`}>{uploadMsg.text}</div>}
          </div>

          {/* PDF Files Section */}
          {pdfFiles.length > 0 && (
            <div className="wo-pdf-section">
              <h3 className="wo-pdf-heading">📄 Attached PDFs ({pdfFiles.length})</h3>
              <div className="wo-pdf-list">
                {pdfFiles.map((pdf) => (
                  <div key={pdf.path} className="wo-pdf-item">
                    <a href={pdf.url} target="_blank" rel="noopener noreferrer" className="wo-pdf-link">
                      {pdf.name}
                    </a>
                    <button
                      className="btn-icon danger"
                      onClick={() => handlePdfDelete(pdf.path)}
                      title="Delete PDF"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {error && <div className="msg error">{error}</div>}

          <div className="wo-items-toolbar">
            <button className="btn-refresh" onClick={loadItems}>
              <RefreshCw size={14} /> {loading ? 'Loading…' : 'Refresh'}
            </button>
            <button className="btn-export" onClick={exportCsv} disabled={items.length === 0}>
              <Download size={14} /> Export CSV
            </button>
          </div>

          <div className="wo-items-wrapper">
            <table className="wo-items-table">
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Serial</th>
                  <th>Status</th>
                  <th>Used By</th>
                  <th className="action-col">Action</th>
                </tr>
              </thead>
              <tbody>
                {loading && <tr><td colSpan={5} className="empty">Loading…</td></tr>}
                {!loading && items.length === 0 && (
                  <tr><td colSpan={5} className="empty">No serials yet. Upload CSV above or wait for PDI form submissions.</td></tr>
                )}
                {items.map((it) => (
                  <tr key={it.id} className={it.status === 'used' ? 'row-used' : ''}>
                    <td>{CATEGORY_LABELS[it.category] || it.category}</td>
                    <td className="mono">{it.serial}</td>
                    <td>
                      <span className={`status-badge ${it.status}`}>
                        {it.status === 'used' ? 'Used' : 'Available'}
                      </span>
                    </td>
                    <td>{it.used_by || '—'}</td>
                    <td className="action-col">
                      {it.status === 'used' && (
                        <button className="btn-icon" onClick={() => handleRevert(it.id)} title="Mark available">
                          <RefreshCw size={14} />
                        </button>
                      )}
                      <button className="btn-icon danger" onClick={() => handleDeleteItem(it.id)} title="Delete serial">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}




// Bulk upload tile for pre-loading inventory via CSV
function BulkUploadTile({ category, stats, onUpload }) {
  const inputRef = useRef(null);
  const { total = 0, used = 0 } = stats || {};
  const onChange = (e) => {
    const file = e.target.files?.[0];
    if (file) onUpload(file);
    e.target.value = '';
  };
  return (
    <div className="wo-bulk-tile">
      <div className="wo-bulk-tile-header">
        <span className="wo-bulk-tile-icon">{category.label === 'Solar Panel' ? '☀️' : category.label === 'Battery' ? '🔋' : '💡'}</span>
        <span className="wo-bulk-tile-title">{category.label}</span>
      </div>
      <div className="wo-bulk-tile-count">
        <strong>{used}</strong> / {total} used
      </div>
      <button className="btn-bulk-upload" onClick={() => inputRef.current?.click()}>
        <Upload size={14} /> Upload CSV
      </button>
      <input
        ref={inputRef}
        type="file"
        accept=".csv,.tsv,.txt,.xlsx,.xls,text/csv"
        style={{ display: 'none' }}
        onChange={onChange}
      />
    </div>
  );
}
