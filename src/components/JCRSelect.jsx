import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';
import InstallationTable from './InstallationTable';
import { fetchWorkOrders } from '../utils/workorders';
import { fetchInstallations } from '../utils/installations';
import './JCR.css';

// Map a raw installation DB record into the JCR installation row shape used by
// InstallationTable.
function toJcrRow(inst, index) {
  return {
    serialNo: index + 1,
    beneficiaryName: inst.exact_location || '',
    latitude: inst.latitude || '',
    longitude: inst.longitude || '',
    photoDate: inst.photo_date || inst.commissioning_date || '',
    villageGramPanchayat: inst.village || '',
    block: inst.block || '',
    assemblyConstituency: inst.assembly_constituency || '',
    commissioningDate: inst.commissioning_date || '',
    moduleSerialNo: inst.module_serial || '',
    batterySerialNo: inst.battery_serial || '',
    luminaireSerialNo: inst.luminaire_serial || '',
    rms: inst.rms || 'YES',
  };
}

const JCRSelect = ({ onBack, onLogout }) => {
  // Work orders loaded from Supabase (for the first dropdown).
  const [workOrders, setWorkOrders] = useState([]);
  const [loadingWorkOrders, setLoadingWorkOrders] = useState(false);

  // All installation records (loaded once, filtered client-side).
  const [allInstallations, setAllInstallations] = useState([]);
  const [loadingInstallations, setLoadingInstallations] = useState(false);
  const [message, setMessage] = useState(null);

  // Current selections.
  const [selectedWorkOrder, setSelectedWorkOrder] = useState('');
  const [selectedVillage, setSelectedVillage] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');

  // The JCR rows rendered in the table below.
  const [rows, setRows] = useState([]);

  // Load work orders and installations on mount.
  const loadAll = useCallback(async () => {
    setLoadingWorkOrders(true);
    setLoadingInstallations(true);
    setMessage(null);
    try {
      const [wos, insts] = await Promise.all([
        fetchWorkOrders(),
        fetchInstallations(),
      ]);
      setWorkOrders(wos);
      setAllInstallations(insts);
    } catch (err) {
      console.error('Failed to load data:', err);
      setMessage({ type: 'error', text: `Failed to load: ${err.message}` });
    } finally {
      setLoadingWorkOrders(false);
      setLoadingInstallations(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // Build the set of work order "names" available in the dropdown. We combine
  // the work_orders table names with any work_order values found on the
  // installation records themselves so nothing gets missed.
  const workOrderOptions = useMemo(() => {
    const set = new Set();
    for (const wo of workOrders) {
      if (wo.name) set.add(wo.name.trim());
      for (const num of wo.order_numbers || []) {
        if (num) set.add(String(num).trim());
      }
    }
    for (const inst of allInstallations) {
      if (inst.work_order) set.add(String(inst.work_order).trim());
    }
    return Array.from(set).filter(Boolean).sort((a, b) => a.localeCompare(b));
  }, [workOrders, allInstallations]);

  // Installations that belong to the selected work order.
  const workOrderInstallations = useMemo(() => {
    if (!selectedWorkOrder) return [];
    const wo = selectedWorkOrder.toLowerCase().trim();
    return allInstallations.filter(
      (inst) => (inst.work_order || '').toLowerCase().trim() === wo
    );
  }, [allInstallations, selectedWorkOrder]);

  // Distinct villages and districts (assembly constituency / block) for the
  // selected work order.
  const villageOptions = useMemo(() => {
    const set = new Set();
    for (const inst of workOrderInstallations) {
      if (inst.village) set.add(String(inst.village).trim());
    }
    return Array.from(set).filter(Boolean).sort((a, b) => a.localeCompare(b));
  }, [workOrderInstallations]);

  const districtOptions = useMemo(() => {
    const set = new Set();
    for (const inst of workOrderInstallations) {
      // Districts aren't a dedicated column; block/assembly are the closest
      // geographic groupings on the installation record.
      if (inst.block) set.add(String(inst.block).trim());
      if (inst.assembly_constituency) set.add(String(inst.assembly_constituency).trim());
    }
    return Array.from(set).filter(Boolean).sort((a, b) => a.localeCompare(b));
  }, [workOrderInstallations]);

  // Recompute the table rows whenever the selections change.
  useEffect(() => {
    if (!selectedWorkOrder) {
      setRows([]);
      return;
    }
    let filtered = workOrderInstallations;

    if (selectedVillage) {
      const v = selectedVillage.toLowerCase().trim();
      filtered = filtered.filter(
        (inst) => (inst.village || '').toLowerCase().trim() === v
      );
    }

    if (selectedDistrict) {
      const d = selectedDistrict.toLowerCase().trim();
      filtered = filtered.filter(
        (inst) =>
          (inst.block || '').toLowerCase().trim() === d ||
          (inst.assembly_constituency || '').toLowerCase().trim() === d
      );
    }

    setRows(filtered.map(toJcrRow));
  }, [selectedWorkOrder, selectedVillage, selectedDistrict, workOrderInstallations]);

  // Reset dependent selections when the work order changes.
  const handleWorkOrderChange = (value) => {
    setSelectedWorkOrder(value);
    setSelectedVillage('');
    setSelectedDistrict('');
  };

  // InstallationTable expects editable rows; allow inline edits on the results.
  const handleRowChange = (index, field, value) => {
    setRows((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [field]: value } : row))
    );
  };

  const handleAddRow = () => {
    setRows((prev) => [
      ...prev,
      toJcrRow({}, prev.length),
    ]);
  };

  const handleRemoveRow = (index) => {
    if (window.confirm('Remove this installation row?')) {
      setRows((prev) =>
        prev
          .filter((_, i) => i !== index)
          .map((row, i) => ({ ...row, serialNo: i + 1 }))
      );
    }
  };

  return (
    <div className="jcr-container">
      <div className="jcr-nav">
        <button className="nav-btn" onClick={onBack} title="Back to Dashboard">
          ← Back
        </button>
        <div className="nav-spacer"></div>
        {onLogout && (
          <button className="nav-btn logout" onClick={onLogout} title="Logout">
            Logout
          </button>
        )}
      </div>

      <div className="jcr-header">
        <div className="jcr-logo-section">
          <img
            src="/SUNFEED LOGO.png"
            alt="Sunfeed Logo"
            className="jcr-logo"
            onError={(e) => { e.target.style.display = 'none'; }}
          />
        </div>
        <div className="jcr-title-section">
          <h1 className="jcr-title">JCR - Select by Work Order</h1>
          <p className="jcr-subtitle">
            Pick a work order, then filter by village and district to load matching installations
          </p>
        </div>
        <div className="jcr-actions">
          <button
            className="btn btn-secondary"
            onClick={loadAll}
            disabled={loadingWorkOrders || loadingInstallations}
            title="Reload work orders and installations"
          >
            <RefreshCw size={16} />
            {loadingWorkOrders || loadingInstallations ? ' Loading...' : ' Refresh'}
          </button>
        </div>
      </div>

      <form className="jcr-form" onSubmit={(e) => e.preventDefault()}>
        {/* Selection Section */}
        <section className="form-section">
          <h2 className="section-title">
            <span className="section-icon">🔍</span>
            Select Work Order & Location
          </h2>

          {message && (
            <div className={`filter-message ${message.type}`}>
              {message.text}
            </div>
          )}

          <div className="form-grid">
            {/* Work Order dropdown */}
            <div className="form-field">
              <label>Work Order</label>
              <select
                value={selectedWorkOrder}
                onChange={(e) => handleWorkOrderChange(e.target.value)}
                className="filter-input"
              >
                <option value="">-- Select a work order --</option>
                {workOrderOptions.map((wo) => (
                  <option key={wo} value={wo}>{wo}</option>
                ))}
              </select>
            </div>

            {/* Village dropdown */}
            <div className="form-field">
              <label>Village / Gram Panchayat</label>
              <select
                value={selectedVillage}
                onChange={(e) => setSelectedVillage(e.target.value)}
                className="filter-input"
                disabled={!selectedWorkOrder}
              >
                <option value="">-- All villages --</option>
                {villageOptions.map((v) => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </div>

            {/* District / Block dropdown */}
            <div className="form-field">
              <label>District / Block / Assembly</label>
              <select
                value={selectedDistrict}
                onChange={(e) => setSelectedDistrict(e.target.value)}
                className="filter-input"
                disabled={!selectedWorkOrder}
              >
                <option value="">-- All districts --</option>
                {districtOptions.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          </div>

          {selectedWorkOrder && (
            <p className="filter-info">
              {rows.length} installation(s) match the current selection
              {selectedVillage ? ` · Village: ${selectedVillage}` : ''}
              {selectedDistrict ? ` · District: ${selectedDistrict}` : ''}.
            </p>
          )}
        </section>

        {/* Matched installations table */}
        <section className="form-section">
          <h2 className="section-title">
            <span className="section-number">1</span>
            Matched Installations
            <span className="format-tag">Format-III(a) Table</span>
          </h2>

          <InstallationTable
            installations={rows}
            onChange={handleRowChange}
            onAddRow={handleAddRow}
            onRemoveRow={handleRemoveRow}
            commonData={{ installationCompleteDate: '' }}
          />
        </section>
      </form>
    </div>
  );
};

export default JCRSelect;
