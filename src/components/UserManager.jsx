import { useState, useCallback, useEffect } from 'react';
import {
  ArrowLeft, LogOut, UserPlus, Users, RefreshCw, Eye, EyeOff,
  Pencil, Check, X, KeyRound, Trash2, Mail, Phone, Search,
} from 'lucide-react';
import Logo from './Logo';
import {
  fetchUsers,
  createUser,
  updateUser,
  resetPassword,
  setUserActive,
  deleteUser,
} from '../utils/users';
import './UserManager.css';

function UserManager({ onBack, onLogout }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setUsers(await fetchUsers());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const flash = useCallback((type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  }, []);

  const filtered = users.filter((u) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      (u.name || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q) ||
      (u.phone || '').toLowerCase().includes(q)
    );
  });

  const activeCount = users.filter((u) => u.is_active).length;

  return (
    <div className="um-page">
      <header className="um-header">
        <div className="header-inner">
          <div className="header-left">
            <button className="header-btn" onClick={onBack} title="Back to Generator">
              <ArrowLeft size={18} />
              <span>Back</span>
            </button>
            <div className="logo">
              <Logo size="medium" />
              <div className="logo-text">
                <h1>User Manager</h1>
                <span className="subtitle">Manage login accounts</span>
              </div>
            </div>
          </div>
          <div className="header-right">
            <button className="header-btn logout" onClick={onLogout} title="Logout">
              <LogOut size={18} />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </header>

      <div className="um-body">
        <div className="um-stats">
          <StatCard label="Total Users" value={users.length} />
          <StatCard label="Active" value={activeCount} />
          <StatCard label="Inactive" value={users.length - activeCount} />
        </div>

        <CreateUserForm onCreated={(text) => { flash('success', text); load(); }} onError={(t) => flash('error', t)} />

        {message && <div className={`um-msg ${message.type}`}>{message.text}</div>}

        <div className="um-toolbar">
          <div className="um-search">
            <Search size={16} />
            <input
              type="text"
              value={search}
              placeholder="Search by name, email or phone…"
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button className="um-btn ghost" onClick={load}>
            <RefreshCw size={16} /> {loading ? 'Loading…' : 'Refresh'}
          </button>
        </div>

        {error && <div className="um-msg error">{error}</div>}

        <div className="um-table-wrapper">
          <table className="um-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Status</th>
                <th className="action-col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && !loading && (
                <tr><td colSpan={5} className="um-empty">No users found. Create one above.</td></tr>
              )}
              {filtered.map((u) => (
                <UserRow
                  key={u.id}
                  user={u}
                  onChanged={(text) => { flash('success', text); load(); }}
                  onError={(t) => flash('error', t)}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="um-stat">
      <span className="um-stat-value">{value}</span>
      <span className="um-stat-label">{label}</span>
    </div>
  );
}

function CreateUserForm({ onCreated, onError }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(true); // shown by default per request
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setName(''); setEmail(''); setPhone(''); setPassword(''); setIsActive(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password) {
      onError('Name, email and password are required.');
      return;
    }
    setSaving(true);
    try {
      await createUser({ name, email, phone, password, isActive });
      onCreated(`User "${name.trim()}" created.`);
      reset();
    } catch (err) {
      onError(err.message.includes('duplicate') || err.code === '23505'
        ? 'A user with that email already exists.'
        : `Create failed: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="um-create" onSubmit={submit}>
      <div className="um-create-head">
        <UserPlus size={18} />
        <h2>Create User</h2>
      </div>
      <div className="um-create-grid">
        <div className="um-field">
          <label>Name</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" />
        </div>
        <div className="um-field">
          <label>Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="user@example.com" autoComplete="off" />
        </div>
        <div className="um-field">
          <label>Phone Number</label>
          <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="e.g., +91 98765 43210" />
        </div>
        <div className="um-field">
          <label>Password</label>
          <div className="um-password">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Set a password"
              autoComplete="new-password"
            />
            <button type="button" className="um-eye" onClick={() => setShowPassword((s) => !s)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>
        <div className="um-field um-active-field">
          <label>Status</label>
          <label className="um-switch">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
            <span className={`um-switch-track ${isActive ? 'on' : ''}`}><span className="um-switch-thumb" /></span>
            <span className="um-switch-text">{isActive ? 'Active' : 'Inactive'}</span>
          </label>
        </div>
      </div>
      <div className="um-create-actions">
        <button type="submit" className="um-btn primary" disabled={saving}>
          <UserPlus size={16} /> {saving ? 'Creating…' : 'Create User'}
        </button>
      </div>
    </form>
  );
}

function UserRow({ user, onChanged, onError }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ name: user.name, email: user.email, phone: user.phone || '' });
  const [busy, setBusy] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [showNew, setShowNew] = useState(true);

  const saveEdit = async () => {
    if (!draft.name.trim() || !draft.email.trim()) {
      onError('Name and email cannot be empty.');
      return;
    }
    setBusy(true);
    try {
      await updateUser(user.id, draft);
      setEditing(false);
      onChanged('User updated.');
    } catch (err) {
      onError(`Update failed: ${err.message}`);
    } finally {
      setBusy(false);
    }
  };

  const toggleActive = async () => {
    setBusy(true);
    try {
      await setUserActive(user.id, !user.is_active);
      onChanged(`User set ${!user.is_active ? 'active' : 'inactive'}.`);
    } catch (err) {
      onError(`Status change failed: ${err.message}`);
    } finally {
      setBusy(false);
    }
  };

  const doReset = async () => {
    if (!newPassword) {
      onError('Enter a new password.');
      return;
    }
    setBusy(true);
    try {
      await resetPassword(user.id, newPassword);
      setResetOpen(false);
      setNewPassword('');
      onChanged(`Password reset for "${user.name}".`);
    } catch (err) {
      onError(`Reset failed: ${err.message}`);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!window.confirm(`Delete user "${user.name}"? This cannot be undone.`)) return;
    setBusy(true);
    try {
      await deleteUser(user.id);
      onChanged('User deleted.');
    } catch (err) {
      onError(`Delete failed: ${err.message}`);
    } finally {
      setBusy(false);
    }
  };

  if (editing) {
    return (
      <tr className="um-editing">
        <td><input className="um-edit-input" value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} /></td>
        <td><input className="um-edit-input" value={draft.email} onChange={(e) => setDraft((d) => ({ ...d, email: e.target.value }))} /></td>
        <td><input className="um-edit-input" value={draft.phone} onChange={(e) => setDraft((d) => ({ ...d, phone: e.target.value }))} /></td>
        <td>
          <button
            type="button"
            className="um-switch as-button"
            onClick={toggleActive}
            disabled={busy}
            title="Toggle status"
            aria-pressed={user.is_active}
          >
            <span className={`um-switch-track ${user.is_active ? 'on' : ''}`}><span className="um-switch-thumb" /></span>
            <span className="um-switch-text">{user.is_active ? 'Active' : 'Inactive'}</span>
          </button>
        </td>
        <td className="action-col">
          <div className="um-actions">
            <button className="um-icon save" onClick={saveEdit} disabled={busy} title="Save"><Check size={15} /></button>
            <button className="um-icon" onClick={() => { setEditing(false); setDraft({ name: user.name, email: user.email, phone: user.phone || '' }); }} disabled={busy} title="Cancel"><X size={15} /></button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <>
      <tr>
        <td className="um-name">{user.name}</td>
        <td><span className="um-cell-icon"><Mail size={13} /> {user.email}</span></td>
        <td>{user.phone ? <span className="um-cell-icon"><Phone size={13} /> {user.phone}</span> : '—'}</td>
        <td>
          <button
            type="button"
            className="um-switch as-button"
            onClick={toggleActive}
            disabled={busy}
            title="Toggle status"
            aria-pressed={user.is_active}
          >
            <span className={`um-switch-track ${user.is_active ? 'on' : ''}`}><span className="um-switch-thumb" /></span>
            <span className="um-switch-text">{user.is_active ? 'Active' : 'Inactive'}</span>
          </button>
        </td>
        <td className="action-col">
          <div className="um-actions">
            <button className="um-icon" onClick={() => setEditing(true)} disabled={busy} title="Edit"><Pencil size={15} /></button>
            <button className="um-icon" onClick={() => setResetOpen((o) => !o)} disabled={busy} title="Reset password"><KeyRound size={15} /></button>
            <button className="um-icon danger" onClick={remove} disabled={busy} title="Delete"><Trash2 size={15} /></button>
          </div>
        </td>
      </tr>
      {resetOpen && (
        <tr className="um-reset-row">
          <td colSpan={5}>
            <div className="um-reset">
              <KeyRound size={15} />
              <span>New password for <strong>{user.name}</strong>:</span>
              <div className="um-password inline">
                <input
                  type={showNew ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  autoComplete="new-password"
                />
                <button type="button" className="um-eye" onClick={() => setShowNew((s) => !s)}>
                  {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <button className="um-btn primary sm" onClick={doReset} disabled={busy}>
                <Check size={14} /> Save
              </button>
              <button className="um-btn ghost sm" onClick={() => { setResetOpen(false); setNewPassword(''); }} disabled={busy}>
                Cancel
              </button>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export default UserManager;
