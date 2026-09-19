import React, { useState, useEffect, useCallback } from 'react';
import { Search, RefreshCw, Filter } from 'lucide-react';
import ComboboxWithHistory from './ComboboxWithHistory';
import InstallationTable from './InstallationTable';
import { saveJCRDraft, loadJCRDraft, getAllJCRDrafts, deleteJCRDraft } from '../utils/jcrStorage';
import { generateJCRPDF, generateJCRPreview } from '../utils/jcrPdfGenerator';
import { fetchInstallations } from '../utils/installations';
import { getPendingJCRImport, clearPendingJCRImport } from '../utils/jcrDataTransfer';
import './JCR.css';

const JCR = ({ onBack, onLogout }) => {
  // Common fields state
  const [formData, setFormData] = useState({
    // Letter Section (before Section 1)
    letterTo: 'The Director New and Renewable Energy Dept & HAREDA',
    letterAddress: 'Akshay Urja Bhawan, Sector-17, Panchkula Haryana',
    letterSubject: '',
    letterBody: '',
    
    // Header / Common Fields (Format-III)
    systemName: 'Solar Street Lighting System',
    district: '',
    rateContractNo: '',
    workOrderNo: '',
    supplierName: '',
    totalWorkOrderQty: '',
    materialSupplyDate: '',
    systemsInThisJCR: '',
    installationCompleteDate: '',
    handoverDate: '',
    
    // Equipment Specification (Format-III(a) header)
    moduleMake: '',
    moduleCapacity: '',
    luminaireMake: '',
    luminaireCapacity: '',
    batteryMake: '',
    batteryCapacity: '',
    year: new Date().getFullYear().toString(),
    
    // Material Receipt (Format-II)
    preDispatchInspectionDate: '',
    materialReceiptDate: '',
    
    // Signatures / Certification
    supplierSignatoryName: '',
    userSignatoryName: '',
    poApoName: '',
    countersignAuthority: 'Addl. Deputy Commissioner-cum-Chief Project Officer, PANCHKULA',
    
    // Section 6 - Additional Certification Fields
    certificationDate: '',
    inspectionOfficer: '',
    technicalSpecsCompliance: 'YES',
    safetyStandardsCompliance: 'YES',
    warrantyPeriod: '5 Years',
    maintenanceSchedule: 'As per manufacturer guidelines',
    
    // Variable fields (repeatable rows)
    installations: [],
  });

  // Letter template options
  const [letterTemplates, setLetterTemplates] = useState([
    { id: 1, name: 'Default Payment Request', subject: 'Request to release 30% payment against work order no:', body: 'With reference to the subject above we are writing this letter to inform you that we received the order for Supply, Installation and Commissioning of LED based Solar Street Lights. We had completed the installation of above said lights in various villages. So, we requesting you to please release our 30% payment against installation receipt. We are enclosed the original Bill and Installation receipt for necessary action.' },
    { id: 2, name: 'Installation Complete', subject: 'Installation Completion Report', body: 'This is to certify that the installation and commissioning of solar street lighting systems has been completed as per the work order specifications and requirements.' },
  ]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  const [currentDraft, setCurrentDraft] = useState(null);
  const [savedDrafts, setSavedDrafts] = useState([]);
  const [showDraftList, setShowDraftList] = useState(false);
  const [unsavedChanges, setUnsavedChanges] = useState(false);

  // Filter state for loading installations
  const [availableInstallations, setAvailableInstallations] = useState([]);
  const [loadingInstallations, setLoadingInstallations] = useState(false);
  const [filterWorkOrder, setFilterWorkOrder] = useState('');
  const [filterLocation, setFilterLocation] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filterMessage, setFilterMessage] = useState(null);

  // PDF preview state
  const [previewUrl, setPreviewUrl] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [generating, setGenerating] = useState(false);

  // Load saved drafts on mount
  useEffect(() => {
    const drafts = getAllJCRDrafts();
    setSavedDrafts(drafts);

    // Check for pending import from Installation Register
    const pendingImport = getPendingJCRImport();
    if (pendingImport && pendingImport.length > 0) {
      const imported = pendingImport.map((inst, idx) => ({
        serialNo: idx + 1,
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
      }));
      
      setFormData(prev => ({
        ...prev,
        installations: imported,
        systemsInThisJCR: imported.length.toString(),
      }));
      
      setFilterMessage({
        type: 'success',
        text: `✓ Auto-imported ${imported.length} installation(s) from Installation Register!`
      });
    }
  }, []);

  // Mark unsaved changes
  useEffect(() => {
    setUnsavedChanges(true);
  }, [formData]);

  // Revoke preview blob URL on unmount to avoid memory leaks
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // Update installations array when systemsInThisJCR changes
  useEffect(() => {
    const count = parseInt(formData.systemsInThisJCR) || 0;
    if (count > 0 && formData.installations.length !== count) {
      const newInstallations = Array.from({ length: count }, (_, i) => {
        // Keep existing data if available
        if (formData.installations[i]) {
          return formData.installations[i];
        }
        // Create new empty row with auto-filled dates
        return {
          serialNo: i + 1,
          beneficiaryName: '',
          latitude: '',
          longitude: '',
          photoDate: formData.installationCompleteDate || '',
          villageGramPanchayat: '',
          block: '',
          assemblyConstituency: '',
          commissioningDate: formData.installationCompleteDate || '',
          moduleSerialNo: '',
          batterySerialNo: '',
          luminaireSerialNo: '',
          rms: 'YES',
        };
      });
      setFormData(prev => ({ ...prev, installations: newInstallations }));
    }
  }, [formData.systemsInThisJCR, formData.installationCompleteDate]);

  const handleCommonFieldChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAddLetterTemplate = () => {
    const name = prompt('Enter template name:');
    if (!name) return;
    const newTemplate = {
      id: letterTemplates.length > 0 ? Math.max(...letterTemplates.map(t => t.id)) + 1 : 1,
      name,
      subject: formData.letterSubject,
      body: formData.letterBody,
    };
    setLetterTemplates(prev => [...prev, newTemplate]);
  };

  const handleRemoveLetterTemplate = (id) => {
    if (!window.confirm('Delete this template?')) return;
    setLetterTemplates(prev => prev.filter(t => t.id !== id));
  };

  const handleLoadLetterTemplate = (template) => {
    setFormData(prev => ({
      ...prev,
      letterSubject: template.subject,
      letterBody: template.body,
    }));
    setSelectedTemplate(template.id);
  };

  const handleInstallationChange = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      installations: prev.installations.map((inst, i) =>
        i === index ? { ...inst, [field]: value } : inst
      ),
    }));
  };

  const addInstallationRow = () => {
    const newRow = {
      serialNo: formData.installations.length + 1,
      beneficiaryName: '',
      latitude: '',
      longitude: '',
      photoDate: formData.installationCompleteDate || '',
      villageGramPanchayat: '',
      block: '',
      assemblyConstituency: '',
      commissioningDate: formData.installationCompleteDate || '',
      moduleSerialNo: '',
      batterySerialNo: '',
      luminaireSerialNo: '',
      rms: 'YES',
    };
    setFormData(prev => ({
      ...prev,
      installations: [...prev.installations, newRow],
      systemsInThisJCR: (prev.installations.length + 1).toString(),
    }));
  };

  const removeInstallationRow = (index) => {
    if (window.confirm('Remove this installation row?')) {
      setFormData(prev => ({
        ...prev,
        installations: prev.installations
          .filter((_, i) => i !== index)
          .map((inst, i) => ({ ...inst, serialNo: i + 1 })),
        systemsInThisJCR: (prev.installations.length - 1).toString(),
      }));
    }
  };

  // Load installations from database with filters
  const handleLoadInstallations = useCallback(async () => {
    setLoadingInstallations(true);
    setFilterMessage(null);
    try {
      // Fetch all installations
      const allInstallations = await fetchInstallations();
      
      // Apply filters
      let filtered = allInstallations;
      
      if (filterWorkOrder.trim()) {
        const woQuery = filterWorkOrder.toLowerCase().trim();
        filtered = filtered.filter(inst => 
          inst.work_order && inst.work_order.toLowerCase().includes(woQuery)
        );
      }
      
      if (filterLocation.trim()) {
        const locQuery = filterLocation.toLowerCase().trim();
        filtered = filtered.filter(inst => 
          (inst.exact_location && inst.exact_location.toLowerCase().includes(locQuery)) ||
          (inst.village && inst.village.toLowerCase().includes(locQuery)) ||
          (inst.block && inst.block.toLowerCase().includes(locQuery)) ||
          (inst.assembly_constituency && inst.assembly_constituency.toLowerCase().includes(locQuery))
        );
      }
      
      setAvailableInstallations(filtered);
      setFilterMessage({ 
        type: 'success', 
        text: `Found ${filtered.length} installation(s) matching your filters.` 
      });
      
    } catch (err) {
      console.error('Failed to load installations:', err);
      setFilterMessage({ type: 'error', text: `Failed to load: ${err.message}` });
    } finally {
      setLoadingInstallations(false);
    }
  }, [filterWorkOrder, filterLocation]);

  // Import selected installations into JCR form
  const handleImportInstallations = useCallback((selectedIds) => {
    const selected = availableInstallations.filter(inst => 
      selectedIds.includes(inst.id)
    );
    
    if (selected.length === 0) {
      setFilterMessage({ type: 'error', text: 'No installations selected to import.' });
      return;
    }

    // Map installation records to JCR installation format
    const imported = selected.map((inst, idx) => ({
      serialNo: formData.installations.length + idx + 1,
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
    }));

    setFormData(prev => ({
      ...prev,
      installations: [...prev.installations, ...imported],
      systemsInThisJCR: (prev.installations.length + imported.length).toString(),
    }));

    setFilterMessage({ 
      type: 'success', 
      text: `✓ Imported ${imported.length} installation(s) into JCR form.` 
    });
    setShowFilters(false);
  }, [availableInstallations, formData.installations.length]);

  const handleSaveDraft = () => {
    const draftId = currentDraft || `draft_${Date.now()}`;
    const success = saveJCRDraft(draftId, formData);
    if (success) {
      setCurrentDraft(draftId);
      setUnsavedChanges(false);
      const drafts = getAllJCRDrafts();
      setSavedDrafts(drafts);
      alert('Draft saved successfully!');
    } else {
      alert('Failed to save draft. Please try again.');
    }
  };

  const handleLoadDraft = (draftId) => {
    const draft = loadJCRDraft(draftId);
    if (draft) {
      setFormData(draft.data);
      setCurrentDraft(draftId);
      setUnsavedChanges(false);
      setShowDraftList(false);
    }
  };

  const handleDeleteDraft = (draftId) => {
    if (window.confirm('Delete this draft permanently?')) {
      deleteJCRDraft(draftId);
      const drafts = getAllJCRDrafts();
      setSavedDrafts(drafts);
      if (currentDraft === draftId) {
        setCurrentDraft(null);
      }
    }
  };

  // Fill the form with random test data (50 installations) to preview the PDF.
  const handleFillTestData = () => {
    const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
    const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
    const pad = (n, len) => String(n).padStart(len, '0');
    const randDate = () => {
      const d = new Date(2025, randInt(0, 11), randInt(1, 28));
      return d.toISOString().split('T')[0];
    };

    const districts = ['AMBALA', 'PANCHKULA', 'YAMUNANAGAR', 'KURUKSHETRA', 'KARNAL'];
    const blocks = ['NARAINGARH', 'BARARA', 'SAHA', 'SHAHZADPUR', 'MULLANA'];
    const villages = ['KANJALA', 'BARWALA', 'RAIPUR', 'MANAKPUR', 'DHIN', 'GARNALA', 'KESRI'];
    const assemblies = ['NARAINGARH', 'AMBALA CITY', 'MULLANA (SC)', 'SADHAURA (SC)'];
    const names = ['Ram Kumar', 'Suresh Devi', 'Anil Sharma', 'Village Panchayat', 'Govt. School', 'Community Center', 'Rajesh Singh', 'Sunita Rani'];

    const count = 50;
    const installations = Array.from({ length: count }, (_, i) => ({
      serialNo: i + 1,
      beneficiaryName: `${pick(names)} (${pick(villages)})`,
      latitude: (30 + Math.random()).toFixed(6),
      longitude: (76 + Math.random()).toFixed(6),
      photoDate: randDate(),
      villageGramPanchayat: pick(villages),
      block: pick(blocks),
      assemblyConstituency: pick(assemblies),
      commissioningDate: randDate(),
      moduleSerialNo: `MOD-${pad(randInt(1, 99999), 5)}`,
      batterySerialNo: `BAT-${pad(randInt(1, 99999), 5)}`,
      luminaireSerialNo: `LUM-${pad(randInt(1, 99999), 5)}`,
      rms: pick(['YES', 'YES', 'NO']),
    }));

    setFormData(prev => ({
      ...prev,
      letterTo: 'The Director New and Renewable Energy Dept & HAREDA',
      letterAddress: 'Akshay Urja Bhawan, Sector-17, Panchkula Haryana',
      letterSubject: `Request to release 30% payment against work order no: DNRE/2025-2026/${randInt(10000, 99999)} District ${pick(districts)}`,
      letterBody: 'With reference to the subject above, we are writing to inform you that we received the order for Supply, Installation and Commissioning of LED based Solar Street Lights. We have completed the installation of the said lights in various villages. We request you to please release our 30% payment against installation receipt. The original Bill and Installation receipt are enclosed for necessary action.',
      systemName: 'Solar Street Lighting System',
      district: `${pick(districts)} (BLOCK: ${pick(blocks)}, VILLAGE: ${pick(villages)})`,
      rateContractNo: `119/HR/RC/E-5/2025-26/${randInt(10000, 99999)} dated 29.01.2026`,
      workOrderNo: `DNRE/2025-2026/${randInt(10000, 99999)} DATED: 18/02/2026`,
      supplierName: 'M/S SUNFEED ECOSOLUTIONS INDIA PVT LTD, 527, FIFTH FLOOR, SECTOR-17, PANCHKULA, HARYANA - 134109',
      totalWorkOrderQty: String(randInt(50, 200)),
      materialSupplyDate: randDate(),
      systemsInThisJCR: String(count),
      installationCompleteDate: randDate(),
      handoverDate: randDate(),
      moduleMake: pick(['SENZA (SUN AND SAND EXIM)', 'JAKSON', 'WAAREE']),
      moduleCapacity: pick(['75', '100', '125']),
      luminaireMake: pick(['RITIKA', 'BAJAJ', 'CROMPTON']),
      luminaireCapacity: pick(['12', '15', '20']),
      batteryMake: pick(['SUNFEED', 'EXIDE', 'AMARON']),
      batteryCapacity: pick(['384', '480', '512']),
      year: '2026',
      preDispatchInspectionDate: randDate(),
      materialReceiptDate: randDate(),
      installations,
    }));

    setFilterMessage({ type: 'success', text: `✓ Filled test data with ${count} random installations.` });
  };

  const handleNewForm = () => {
    if (unsavedChanges) {
      if (!window.confirm('You have unsaved changes. Start a new form anyway?')) {
        return;
      }
    }
    setFormData({
      systemName: 'Solar Street Lighting System',
      district: '',
      rateContractNo: '',
      workOrderNo: '',
      supplierName: '',
      totalWorkOrderQty: '',
      materialSupplyDate: '',
      systemsInThisJCR: '',
      installationCompleteDate: '',
      handoverDate: '',
      moduleMake: '',
      moduleCapacity: '',
      luminaireMake: '',
      luminaireCapacity: '',
      batteryMake: '',
      batteryCapacity: '',
      year: new Date().getFullYear().toString(),
      preDispatchInspectionDate: '',
      materialReceiptDate: '',
      supplierSignatoryName: '',
      userSignatoryName: '',
      poApoName: '',
      countersignAuthority: 'Addl. Deputy Commissioner-cum-Chief Project Officer, PANCHKULA',
      installations: [],
    });
    setCurrentDraft(null);
    setUnsavedChanges(false);
  };

  // Validate the form before generating/previewing. Returns true if OK.
  const validateForm = () => {
    const requiredFields = [
      { field: 'district', label: 'District' },
      { field: 'workOrderNo', label: 'Work Order No.' },
      { field: 'supplierName', label: 'Supplier Name' },
      { field: 'systemsInThisJCR', label: 'No. of Systems' },
    ];

    const missing = requiredFields.filter(({ field }) => !formData[field]);
    if (missing.length > 0) {
      alert(`Please fill required fields: ${missing.map(m => m.label).join(', ')}`);
      return false;
    }

    if (formData.installations.length === 0) {
      alert('Please add at least one installation entry.');
      return false;
    }

    const incompleteRows = formData.installations.filter(
      inst => !inst.beneficiaryName || !inst.villageGramPanchayat
    );

    if (incompleteRows.length > 0) {
      const proceed = window.confirm(
        `${incompleteRows.length} installation row(s) have incomplete data. Continue anyway?`
      );
      if (!proceed) return false;
    }

    return true;
  };

  // Open a side preview of the generated PDF
  const handlePreviewPDF = async () => {
    if (!validateForm()) return;

    setGenerating(true);
    try {
      // Clean up any previous preview URL
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }

      const result = await generateJCRPreview(formData);
      if (result.success) {
        setPreviewUrl(result.url);
        setShowPreview(true);
      } else {
        alert(`Failed to generate preview: ${result.error}`);
      }
    } catch (err) {
      alert(`Failed to generate preview: ${err.message}`);
    } finally {
      setGenerating(false);
    }
  };

  const handleClosePreview = () => {
    setShowPreview(false);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  };

  const handleGeneratePDF = async () => {
    if (!validateForm()) return;

    setGenerating(true);
    try {
      const result = await generateJCRPDF(formData);

      if (result.success) {
        alert(`PDF generated successfully!\nFilename: ${result.filename}`);
        if (unsavedChanges) {
          const save = window.confirm('Would you like to save this form as a draft?');
          if (save) {
            handleSaveDraft();
          }
        }
      } else {
        alert(`Failed to generate PDF: ${result.error}`);
      }
    } catch (err) {
      alert(`Failed to generate PDF: ${err.message}`);
    } finally {
      setGenerating(false);
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
          <h1 className="jcr-title">Joint Commissioning Report (JCR)</h1>
          <p className="jcr-subtitle">Solar Street Lighting System Installation Documentation</p>
        </div>
        
        <div className="jcr-actions">
          <button
            className="btn btn-secondary"
            onClick={handleNewForm}
            title="Start a new form"
          >
            <span className="btn-icon">+</span> New Form
          </button>

          <button
            className="btn btn-secondary"
            onClick={handleFillTestData}
            title="Fill all fields with 50 random test records to preview the PDF"
          >
            <span className="btn-icon">🎲</span> Fill Test Data
          </button>
          
          <button
            className="btn btn-secondary"
            onClick={() => setShowDraftList(!showDraftList)}
            title="Load saved draft"
          >
            <span className="btn-icon">📁</span> Load Draft ({savedDrafts.length})
          </button>
          
          <button
            className="btn btn-primary"
            onClick={handleSaveDraft}
            title="Save current form as draft"
          >
            <span className="btn-icon">💾</span> Save Draft
            {unsavedChanges && <span className="unsaved-indicator">*</span>}
          </button>
          
          <button
            className="btn btn-secondary"
            onClick={handlePreviewPDF}
            disabled={generating}
            title="Preview PDF before download"
          >
            <span className="btn-icon">👁️</span> {generating ? 'Working...' : 'Preview PDF'}
          </button>

          <button
            className="btn btn-success"
            onClick={handleGeneratePDF}
            disabled={generating}
            title="Generate PDF document"
          >
            <span className="btn-icon">📄</span> {generating ? 'Working...' : 'Generate PDF'}
          </button>
        </div>
      </div>

      {showPreview && previewUrl && (
        <div className="jcr-preview-overlay" onClick={handleClosePreview}>
          <div className="jcr-preview-panel" onClick={(e) => e.stopPropagation()}>
            <div className="jcr-preview-header">
              <h3>PDF Preview</h3>
              <div className="jcr-preview-actions">
                <button className="btn btn-success btn-small" onClick={handleGeneratePDF}>
                  ⬇ Download
                </button>
                <button className="btn btn-secondary btn-small" onClick={handleClosePreview}>
                  ✕ Close
                </button>
              </div>
            </div>
            <iframe
              title="JCR PDF Preview"
              src={previewUrl}
              className="jcr-preview-frame"
            />
          </div>
        </div>
      )}

      {showDraftList && savedDrafts.length > 0 && (
        <div className="draft-list">
          <h3>Saved Drafts</h3>
          {savedDrafts.map(draft => (
            <div key={draft.id} className="draft-item">
              <div className="draft-info">
                <span className="draft-name">{draft.preview}</span>
                <span className="draft-date">
                  {new Date(draft.savedAt).toLocaleString()}
                </span>
              </div>
              <div className="draft-actions">
                <button
                  className="btn-small btn-primary"
                  onClick={() => handleLoadDraft(draft.id)}
                >
                  Load
                </button>
                <button
                  className="btn-small btn-danger"
                  onClick={() => handleDeleteDraft(draft.id)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <form className="jcr-form" onSubmit={(e) => e.preventDefault()}>
        {/* Letter Section - Above Section 1 */}
        <section className="form-section letter-section">
          <h2 className="section-title">
            <span className="section-icon">✉️</span>
            Letter / Cover Document
            <span className="format-tag">Optional</span>
          </h2>

          <div className="letter-templates">
            <label style={{ fontWeight: 600, marginBottom: '8px', display: 'block' }}>Quick Templates:</label>
            <div className="template-buttons">
              {letterTemplates.map(template => (
                <div key={template.id} className="template-item">
                  <button
                    type="button"
                    className={`btn btn-secondary btn-small ${selectedTemplate === template.id ? 'active' : ''}`}
                    onClick={() => handleLoadLetterTemplate(template)}
                  >
                    {template.name}
                  </button>
                  <button
                    type="button"
                    className="btn-icon-small danger"
                    onClick={() => handleRemoveLetterTemplate(template.id)}
                    title="Delete template"
                  >
                    ✕
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="btn btn-secondary btn-small"
                onClick={handleAddLetterTemplate}
              >
                + Save Current as Template
              </button>
            </div>
          </div>
          
          <div className="form-grid">
            <div className="form-field full-width">
              <label>To</label>
              <input
                type="text"
                value={formData.letterTo}
                onChange={(e) => handleCommonFieldChange('letterTo', e.target.value)}
                placeholder="Recipient name/designation"
              />
            </div>

            <div className="form-field full-width">
              <label>Address</label>
              <textarea
                rows={2}
                value={formData.letterAddress}
                onChange={(e) => handleCommonFieldChange('letterAddress', e.target.value)}
                placeholder="Full address"
              />
            </div>

            <div className="form-field full-width">
              <label>Subject</label>
              <input
                type="text"
                value={formData.letterSubject}
                onChange={(e) => handleCommonFieldChange('letterSubject', e.target.value)}
                placeholder="e.g., Request to release 30% payment against work order no: DNRE/2025-2026/10521 DATED: 18/02/2026 District Ambala"
              />
            </div>

            <div className="form-field full-width">
              <label>Letter Body</label>
              <textarea
                rows={6}
                value={formData.letterBody}
                onChange={(e) => handleCommonFieldChange('letterBody', e.target.value)}
                placeholder="Main content of the letter..."
              />
            </div>
          </div>
        </section>

        {/* Section 1: Header / Common Fields */}
        <section className="form-section">
          <h2 className="section-title">
            <span className="section-number">1</span>
            Project Information
            <span className="format-tag">Format-III</span>
          </h2>
          
          <div className="form-grid">
            <div className="form-field full-width">
              <ComboboxWithHistory
                fieldId="jcr.systemName"
                value={formData.systemName}
                onChange={(value) => handleCommonFieldChange('systemName', value)}
                label="Name of System"
                required
              />
            </div>

            <div className="form-field">
              <ComboboxWithHistory
                fieldId="jcr.district"
                value={formData.district}
                onChange={(value) => handleCommonFieldChange('district', value)}
                label="District / Block / Village"
                placeholder="e.g., AMBALA (BLOCK: NARAINGARH, VILLAGE: KANJALA)"
                required
              />
            </div>

            <div className="form-field">
              <ComboboxWithHistory
                fieldId="jcr.rateContractNo"
                value={formData.rateContractNo}
                onChange={(value) => handleCommonFieldChange('rateContractNo', value)}
                label="Rate Contract No. & Date"
                placeholder="e.g., 119/HR/RC/E-5/2025-26/15124 dated 29.01.2026"
              />
            </div>

            <div className="form-field">
              <ComboboxWithHistory
                fieldId="jcr.workOrderNo"
                value={formData.workOrderNo}
                onChange={(value) => handleCommonFieldChange('workOrderNo', value)}
                label="Work Order No. & Date"
                placeholder="e.g., DNRE/2025-2026/10521 DATED: 18/02/2026"
                required
              />
            </div>

            <div className="form-field full-width">
              <ComboboxWithHistory
                fieldId="jcr.supplierName"
                value={formData.supplierName}
                onChange={(value) => handleCommonFieldChange('supplierName', value)}
                label="Name & Address of Supplier"
                placeholder="e.g., M/S SUNFEED ECOSOLUTIONS INDIA PVT LTD, 527, FIFTH FLOOR..."
                required
              />
            </div>

            <div className="form-field">
              <ComboboxWithHistory
                fieldId="jcr.totalWorkOrderQty"
                value={formData.totalWorkOrderQty}
                onChange={(value) => handleCommonFieldChange('totalWorkOrderQty', value)}
                label="Total Work Order Quantity (nos.)"
                type="number"
              />
            </div>

            <div className="form-field">
              <ComboboxWithHistory
                fieldId="jcr.systemsInThisJCR"
                value={formData.systemsInThisJCR}
                onChange={(value) => handleCommonFieldChange('systemsInThisJCR', value)}
                label="No. of Systems in this JCR (nos.)"
                type="number"
                required
              />
            </div>

            <div className="form-field">
              <ComboboxWithHistory
                fieldId="jcr.materialSupplyDate"
                value={formData.materialSupplyDate}
                onChange={(value) => handleCommonFieldChange('materialSupplyDate', value)}
                label="Date of Supply of Material"
                type="date"
              />
            </div>

            <div className="form-field">
              <ComboboxWithHistory
                fieldId="jcr.installationCompleteDate"
                value={formData.installationCompleteDate}
                onChange={(value) => handleCommonFieldChange('installationCompleteDate', value)}
                label="Date of Complete Installation & Commissioning"
                type="date"
              />
            </div>

            <div className="form-field">
              <ComboboxWithHistory
                fieldId="jcr.handoverDate"
                value={formData.handoverDate}
                onChange={(value) => handleCommonFieldChange('handoverDate', value)}
                label="Date of Handing Over to Beneficiary"
                type="date"
              />
            </div>
          </div>
        </section>

        {/* Section 2: Equipment Specification */}
        <section className="form-section">
          <h2 className="section-title">
            <span className="section-number">2</span>
            Equipment Specifications
            <span className="format-tag">Format-III(a)</span>
          </h2>
          
          <div className="form-grid">
            <div className="form-field">
              <ComboboxWithHistory
                fieldId="jcr.moduleMake"
                value={formData.moduleMake}
                onChange={(value) => handleCommonFieldChange('moduleMake', value)}
                label="Make of Module"
                placeholder="e.g., SENZA (SUN AND SAND EXIM)"
              />
            </div>

            <div className="form-field">
              <ComboboxWithHistory
                fieldId="jcr.moduleCapacity"
                value={formData.moduleCapacity}
                onChange={(value) => handleCommonFieldChange('moduleCapacity', value)}
                label="Capacity of PV Module (Wp)"
                placeholder="e.g., 75"
              />
            </div>

            <div className="form-field">
              <ComboboxWithHistory
                fieldId="jcr.luminaireMake"
                value={formData.luminaireMake}
                onChange={(value) => handleCommonFieldChange('luminaireMake', value)}
                label="Make of Luminaire"
                placeholder="e.g., RITIKA"
              />
            </div>

            <div className="form-field">
              <ComboboxWithHistory
                fieldId="jcr.luminaireCapacity"
                value={formData.luminaireCapacity}
                onChange={(value) => handleCommonFieldChange('luminaireCapacity', value)}
                label="Capacity of Luminaire (W)"
                placeholder="e.g., 12"
              />
            </div>

            <div className="form-field">
              <ComboboxWithHistory
                fieldId="jcr.batteryMake"
                value={formData.batteryMake}
                onChange={(value) => handleCommonFieldChange('batteryMake', value)}
                label="Make of Battery"
                placeholder="e.g., SUNFEED"
              />
            </div>

            <div className="form-field">
              <ComboboxWithHistory
                fieldId="jcr.batteryCapacity"
                value={formData.batteryCapacity}
                onChange={(value) => handleCommonFieldChange('batteryCapacity', value)}
                label="Capacity of Battery (Wh)"
                placeholder="e.g., 384"
              />
            </div>

            <div className="form-field">
              <ComboboxWithHistory
                fieldId="jcr.year"
                value={formData.year}
                onChange={(value) => handleCommonFieldChange('year', value)}
                label="Year"
                placeholder="e.g., 2026"
              />
            </div>
          </div>
        </section>

        {/* Section 3: Material Receipt */}
        <section className="form-section">
          <h2 className="section-title">
            <span className="section-number">3</span>
            Material Receipt Information
            <span className="format-tag">Format-II</span>
          </h2>
          
          <div className="form-grid">
            <div className="form-field">
              <ComboboxWithHistory
                fieldId="jcr.preDispatchInspectionDate"
                value={formData.preDispatchInspectionDate}
                onChange={(value) => handleCommonFieldChange('preDispatchInspectionDate', value)}
                label="Date of Pre-dispatch Inspection"
                type="date"
              />
            </div>

            <div className="form-field">
              <ComboboxWithHistory
                fieldId="jcr.materialReceiptDate"
                value={formData.materialReceiptDate}
                onChange={(value) => handleCommonFieldChange('materialReceiptDate', value)}
                label="Date of Receipt of Material"
                type="date"
              />
            </div>
          </div>
        </section>

        {/* Section 4: Signatures */}
        <section className="form-section">
          <h2 className="section-title">
            <span className="section-number">4</span>
            Certification & Signatures
          </h2>
          
          <div className="form-grid">
            <div className="form-field">
              <ComboboxWithHistory
                fieldId="jcr.supplierSignatoryName"
                value={formData.supplierSignatoryName}
                onChange={(value) => handleCommonFieldChange('supplierSignatoryName', value)}
                label="Authorized Signatory (Supplier)"
                placeholder="Name and designation"
              />
            </div>

            <div className="form-field">
              <ComboboxWithHistory
                fieldId="jcr.userSignatoryName"
                value={formData.userSignatoryName}
                onChange={(value) => handleCommonFieldChange('userSignatoryName', value)}
                label="Signature of User (Village Level)"
                placeholder="Sarpanch / Gram Panchayat representative"
              />
            </div>

            <div className="form-field">
              <ComboboxWithHistory
                fieldId="jcr.poApoName"
                value={formData.poApoName}
                onChange={(value) => handleCommonFieldChange('poApoName', value)}
                label="Signature of PO/APO"
                placeholder="Project Officer / Assistant Project Officer"
              />
            </div>

            <div className="form-field">
              <ComboboxWithHistory
                fieldId="jcr.countersignAuthority"
                value={formData.countersignAuthority}
                onChange={(value) => handleCommonFieldChange('countersignAuthority', value)}
                label="Countersigned By"
                placeholder="Chief Project Officer"
              />
            </div>
          </div>
        </section>

        {/* Installation Data Filters - Load from Installation Register */}
        <section className="form-section">
          <div className="filter-header">
            <h2 className="section-title">
              <span className="section-icon">🔍</span>
              Load Installation Data
            </h2>
            <button
              className="btn btn-secondary"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter size={16} />
              {showFilters ? 'Hide Filters' : 'Show Filters'}
            </button>
          </div>

          {showFilters && (
            <div className="filter-panel">
              <p className="filter-info">
                Load installation data from the Installation Register by filtering on Work Order Number and/or Location.
              </p>
              
              <div className="form-grid">
                <div className="form-field">
                  <label>Filter by Work Order Number</label>
                  <input
                    type="text"
                    value={filterWorkOrder}
                    onChange={(e) => setFilterWorkOrder(e.target.value)}
                    placeholder="e.g., WO/2026/00123 or part of it"
                    className="filter-input"
                  />
                </div>

                <div className="form-field">
                  <label>Filter by Location</label>
                  <input
                    type="text"
                    value={filterLocation}
                    onChange={(e) => setFilterLocation(e.target.value)}
                    placeholder="Village, Block, Assembly, or Exact Location"
                    className="filter-input"
                  />
                </div>
              </div>

              <div className="filter-actions">
                <button
                  className="btn btn-primary"
                  onClick={handleLoadInstallations}
                  disabled={loadingInstallations}
                >
                  <Search size={16} />
                  {loadingInstallations ? 'Searching...' : 'Search Installations'}
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    setFilterWorkOrder('');
                    setFilterLocation('');
                    setAvailableInstallations([]);
                    setFilterMessage(null);
                  }}
                >
                  Clear Filters
                </button>
              </div>

              {filterMessage && (
                <div className={`filter-message ${filterMessage.type}`}>
                  {filterMessage.text}
                </div>
              )}

              {availableInstallations.length > 0 && (
                <div className="installation-results">
                  <h3 className="results-title">
                    Available Installations ({availableInstallations.length})
                  </h3>
                  <div className="results-table-wrapper">
                    <table className="results-table">
                      <thead>
                        <tr>
                          <th>
                            <input
                              type="checkbox"
                              onChange={(e) => {
                                const checkboxes = document.querySelectorAll('.install-checkbox');
                                checkboxes.forEach(cb => cb.checked = e.target.checked);
                              }}
                              title="Select all"
                            />
                          </th>
                          <th>S.No</th>
                          <th>Work Order</th>
                          <th>Location</th>
                          <th>Village</th>
                          <th>Block</th>
                          <th>Assembly</th>
                          <th>Module #</th>
                          <th>Battery #</th>
                          <th>Luminaire #</th>
                        </tr>
                      </thead>
                      <tbody>
                        {availableInstallations.map((inst) => (
                          <tr key={inst.id}>
                            <td>
                              <input
                                type="checkbox"
                                className="install-checkbox"
                                data-id={inst.id}
                              />
                            </td>
                            <td>{inst.sno || '-'}</td>
                            <td>{inst.work_order || '-'}</td>
                            <td>{inst.exact_location || '-'}</td>
                            <td>{inst.village || '-'}</td>
                            <td>{inst.block || '-'}</td>
                            <td>{inst.assembly_constituency || '-'}</td>
                            <td>{inst.module_serial || '-'}</td>
                            <td>{inst.battery_serial || '-'}</td>
                            <td>{inst.luminaire_serial || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <button
                    className="btn btn-success"
                    onClick={() => {
                      const selected = Array.from(
                        document.querySelectorAll('.install-checkbox:checked')
                      ).map(cb => parseInt(cb.dataset.id));
                      handleImportInstallations(selected);
                    }}
                    style={{ marginTop: '12px' }}
                  >
                    Import Selected to JCR
                  </button>
                </div>
              )}
            </div>
          )}
        </section>

        {/* Section 5: Installation Sites Table */}
        <section className="form-section">
          <h2 className="section-title">
            <span className="section-number">5</span>
            Site-wise Installation List
            <span className="format-tag">Format-III(a) Table</span>
          </h2>
          
          <InstallationTable
            installations={formData.installations}
            onChange={handleInstallationChange}
            onAddRow={addInstallationRow}
            onRemoveRow={removeInstallationRow}
            commonData={{
              installationCompleteDate: formData.installationCompleteDate,
            }}
          />
        </section>

        {/* Section 6: Additional Certification & Compliance */}
        <section className="form-section">
          <h2 className="section-title">
            <span className="section-number">6</span>
            Additional Certification & Compliance
            <span className="format-tag">Format-IV</span>
          </h2>
          
          <div className="form-grid">
            <div className="form-field">
              <ComboboxWithHistory
                fieldId="jcr.certificationDate"
                value={formData.certificationDate}
                onChange={(value) => handleCommonFieldChange('certificationDate', value)}
                label="Certification Date"
                type="date"
              />
            </div>

            <div className="form-field">
              <ComboboxWithHistory
                fieldId="jcr.inspectionOfficer"
                value={formData.inspectionOfficer}
                onChange={(value) => handleCommonFieldChange('inspectionOfficer', value)}
                label="Inspection Officer Name"
                placeholder="Name and designation"
              />
            </div>

            <div className="form-field">
              <label>Technical Specifications Compliance</label>
              <select
                value={formData.technicalSpecsCompliance}
                onChange={(e) => handleCommonFieldChange('technicalSpecsCompliance', e.target.value)}
                style={{ padding: '0.625rem 0.875rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '0.875rem' }}
              >
                <option value="YES">YES - Compliant</option>
                <option value="NO">NO - Non-compliant</option>
                <option value="PARTIAL">PARTIAL - Partially compliant</option>
              </select>
            </div>

            <div className="form-field">
              <label>Safety Standards Compliance</label>
              <select
                value={formData.safetyStandardsCompliance}
                onChange={(e) => handleCommonFieldChange('safetyStandardsCompliance', e.target.value)}
                style={{ padding: '0.625rem 0.875rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '0.875rem' }}
              >
                <option value="YES">YES - Compliant</option>
                <option value="NO">NO - Non-compliant</option>
                <option value="PARTIAL">PARTIAL - Partially compliant</option>
              </select>
            </div>

            <div className="form-field">
              <ComboboxWithHistory
                fieldId="jcr.warrantyPeriod"
                value={formData.warrantyPeriod}
                onChange={(value) => handleCommonFieldChange('warrantyPeriod', value)}
                label="Warranty Period"
                placeholder="e.g., 5 Years"
              />
            </div>

            <div className="form-field full-width">
              <ComboboxWithHistory
                fieldId="jcr.maintenanceSchedule"
                value={formData.maintenanceSchedule}
                onChange={(value) => handleCommonFieldChange('maintenanceSchedule', value)}
                label="Maintenance Schedule"
                placeholder="Maintenance requirements and schedule"
              />
            </div>
          </div>
        </section>
      </form>
    </div>
  );
};

export default JCR;
