import React, { useState, useEffect } from 'react';
import ComboboxWithHistory from './ComboboxWithHistory';
import InstallationTable from './InstallationTable';
import { saveJCRDraft, loadJCRDraft, getAllJCRDrafts, deleteJCRDraft } from '../utils/jcrStorage';
import { generateJCRPDF } from '../utils/jcrPdfGenerator';
import './JCR.css';

const JCR = ({ onBack, onLogout }) => {
  // Common fields state
  const [formData, setFormData] = useState({
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
    
    // Variable fields (repeatable rows)
    installations: [],
  });

  const [currentDraft, setCurrentDraft] = useState(null);
  const [savedDrafts, setSavedDrafts] = useState([]);
  const [showDraftList, setShowDraftList] = useState(false);
  const [unsavedChanges, setUnsavedChanges] = useState(false);

  // Load saved drafts on mount
  useEffect(() => {
    const drafts = getAllJCRDrafts();
    setSavedDrafts(drafts);
  }, []);

  // Mark unsaved changes
  useEffect(() => {
    setUnsavedChanges(true);
  }, [formData]);

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

  const handleGeneratePDF = () => {
    // Validate required fields
    const requiredFields = [
      { field: 'district', label: 'District' },
      { field: 'workOrderNo', label: 'Work Order No.' },
      { field: 'supplierName', label: 'Supplier Name' },
      { field: 'systemsInThisJCR', label: 'No. of Systems' },
    ];

    const missing = requiredFields.filter(({ field }) => !formData[field]);
    if (missing.length > 0) {
      alert(`Please fill required fields: ${missing.map(m => m.label).join(', ')}`);
      return;
    }

    if (formData.installations.length === 0) {
      alert('Please add at least one installation entry.');
      return;
    }

    // Validate installation data
    const incompleteRows = formData.installations.filter(
      inst => !inst.beneficiaryName || !inst.villageGramPanchayat
    );
    
    if (incompleteRows.length > 0) {
      const proceed = window.confirm(
        `${incompleteRows.length} installation row(s) have incomplete data. Generate PDF anyway?`
      );
      if (!proceed) return;
    }

    // Generate PDF
    const result = generateJCRPDF(formData);
    
    if (result.success) {
      alert(`PDF generated successfully!\nFilename: ${result.filename}`);
      // Optionally save draft after successful PDF generation
      if (unsavedChanges) {
        const save = window.confirm('Would you like to save this form as a draft?');
        if (save) {
          handleSaveDraft();
        }
      }
    } else {
      alert(`Failed to generate PDF: ${result.error}`);
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
            className="btn btn-success"
            onClick={handleGeneratePDF}
            title="Generate PDF document"
          >
            <span className="btn-icon">📄</span> Generate PDF
          </button>
        </div>
      </div>

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
      </form>
    </div>
  );
};

export default JCR;
