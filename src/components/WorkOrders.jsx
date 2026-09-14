import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  ArrowLeft, LogOut, Plus, Trash2, RefreshCw, Upload, ClipboardList,
  Share2, Download, ChevronDown, ChevronRight, Package, CheckCircle2, Clock,
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
import './WorkOrders.css';

function WorkOrders({ onBack, onLogout }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  const currentUser = getCurrentUser();

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

  const handleCreate = useCallback(async () => {
    if (!newName.trim()) {
      setMessage({ type: 'error', text: 'Enter a work order name first.' });
      return;
    }
    setCreating(true);
    setMessage(null);
    try {
      const created = await createWorkOrder({
        name: newName,
        description: newDesc,
        createdBy: currentUser?.name || currentUser?.email || '',
      });
      setNewName('');
      setNewDesc('');
      setMessage({ type: 'success', text: `Work order "${created.name}" created.` });
      await load();
      if (created) setExpandedId(created.id);
    } catch (err) {
      setMessage({ type: 'error', text: `Create failed: ${err.message}` });
    } finally {
      setCreating(false);
    }
  }, [newName, newDesc, currentUser, load]);

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
    const url = `${window.location.origin}${window.location.pathname}?form=workorder`;
    try {
      await navigator.clipboard.writeText(url);
      setMessage({ type: 'success', text: `Shareable form link copied: ${url}` });
    } catch {
      window.prompt('Copy this shareable form link:', url);
    }
  }, []);

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

      <div className="wo-body">
        <div className="wo-create">
          <h2><Plus size={18} /> New Work Order</h2>
          <div className="wo-create-row">
            <input
              type="text"
              placeholder="Work order name (e.g., XYZ)"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
            <input
              type="text"
              placeholder="Description (optional)"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
            />
            <button className="btn-primary" onClick={handleCreate} disabled={creating}>
              <Plus size={16} /> {creating ? 'Creating…' : 'Create'}
            </button>
          </div>
          {message && <div className={`msg ${message.type}`}>{message.text}</div>}
        </div>

        <div className="wo-list-head">
          <h2><ClipboardList size={18} /> Work Orders</h2>
          <button className="btn-refresh" onClick={load}>
            <RefreshCw size={16} /> {loading ? 'Loading…' : 'Refresh'}
          </button>
        </div>

        {error && <div className="msg error">{error}</div>}

        {orders.length === 0 && !loading && (
          <div className="wo-empty">No work orders yet. Create one above.</div>
        )}

        <div className="wo-list">
          {orders.map((order) => (
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
// per-category serial upload + list of items with used/available status.
function WorkOrderCard({ order, expanded, onToggle, onDelete }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [uploadMsg, setUploadMsg] = useState(null);

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

  useEffect(() => {
    if (expanded && items.length === 0 && !loading) loadItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded]);

  const { summary, total, used, pending } = useMemo(() => summarizeItems(items), [items]);

  const handleUpload = useCallback(
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
          text: `Added ${inserted} new ${CATEGORY_LABELS[category]} serial(s) (${serials.length} read).`,
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
          <div className="wo-uploads">
            {WO_CATEGORIES.map((cat) => (
              <CategoryUpload
                key={cat.key}
                category={cat}
                stats={summary[cat.key]}
                onUpload={(file) => handleUpload(cat.key, file)}
              />
            ))}
          </div>

          {uploadMsg && <div className={`msg ${uploadMsg.type}`}>{uploadMsg.text}</div>}
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
                  <tr><td colSpan={5} className="empty">No serials yet. Upload a CSV above.</td></tr>
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

// Per-category CSV upload tile with a small progress summary.
function CategoryUpload({ category, stats, onUpload }) {
  const inputRef = useRef(null);
  const { total = 0, used = 0 } = stats || {};
  const onChange = (e) => {
    const file = e.target.files?.[0];
    if (file) onUpload(file);
    e.target.value = '';
  };
  return (
    <div className="wo-upload-tile">
      <div className="wo-upload-title">{category.label}</div>
      <div className="wo-upload-count">
        <strong>{used}</strong> / {total} used
      </div>
      <button className="btn-upload" onClick={() => inputRef.current?.click()}>
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
