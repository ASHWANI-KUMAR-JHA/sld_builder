import React from 'react';
import './InstallationTable.css';

/**
 * InstallationTable - Repeatable table for site-wise installation data
 * Matches Format-III(a) table structure from government JCR format
 */
const InstallationTable = ({ installations, onChange, onAddRow, onRemoveRow, commonData }) => {
  const handleFieldChange = (index, field, value) => {
    onChange(index, field, value);
  };

  const handleBulkFillFromCommon = (field, commonField) => {
    if (window.confirm(`Fill all rows with "${commonData[commonField]}"?`)) {
      installations.forEach((_, index) => {
        onChange(index, field, commonData[commonField]);
      });
    }
  };

  if (installations.length === 0) {
    return (
      <div className="installation-table-empty">
        <p className="empty-message">
          No installation rows yet. Set "No. of Systems in this JCR" in the Project Information section to generate rows.
        </p>
      </div>
    );
  }

  return (
    <div className="installation-table-wrapper">
      <div className="table-controls">
        <div className="table-info">
          <span className="table-count">{installations.length} Installation Site(s)</span>
        </div>
        <div className="bulk-actions">
          <button
            type="button"
            className="btn-small btn-secondary"
            onClick={() => handleBulkFillFromCommon('commissioningDate', 'installationCompleteDate')}
            disabled={!commonData.installationCompleteDate}
            title="Fill all commissioning dates from installation complete date"
          >
            📅 Fill Commissioning Dates
          </button>
          <button
            type="button"
            className="btn-small btn-secondary"
            onClick={() => handleBulkFillFromCommon('photoDate', 'installationCompleteDate')}
            disabled={!commonData.installationCompleteDate}
            title="Fill all photo dates from installation complete date"
          >
            📸 Fill Photo Dates
          </button>
          <button
            type="button"
            className="btn-small btn-primary"
            onClick={onAddRow}
          >
            + Add Row
          </button>
        </div>
      </div>

      <div className="table-scroll-container">
        <table className="installation-table">
          <thead>
            <tr>
              <th className="col-sno">S.No.</th>
              <th className="col-beneficiary">
                Beneficiary Name / Location
                <span className="col-subtitle">Exact location with landmark</span>
              </th>
              <th className="col-coordinate">
                Latitude
                <span className="col-subtitle">GPS coordinate</span>
              </th>
              <th className="col-coordinate">
                Longitude
                <span className="col-subtitle">GPS coordinate</span>
              </th>
              <th className="col-date">
                Photo Date
              </th>
              <th className="col-village">
                Village & Gram Panchayat
              </th>
              <th className="col-block">
                Block
              </th>
              <th className="col-assembly">
                Assembly Constituency
              </th>
              <th className="col-date">
                Commissioning Date
              </th>
              <th className="col-serial">
                Module Serial No.
              </th>
              <th className="col-serial">
                Battery Serial No.
              </th>
              <th className="col-serial">
                Luminaire Serial No.
              </th>
              <th className="col-rms">
                RMS
              </th>
              <th className="col-action">
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {installations.map((installation, index) => (
              <tr key={index} className="installation-row">
                <td className="col-sno">
                  <span className="serial-badge">{installation.serialNo}</span>
                </td>
                
                <td className="col-beneficiary">
                  <input
                    type="text"
                    className="table-input"
                    value={installation.beneficiaryName || ''}
                    onChange={(e) => handleFieldChange(index, 'beneficiaryName', e.target.value)}
                    placeholder="Enter name or landmark"
                  />
                </td>
                
                <td className="col-coordinate">
                  <input
                    type="text"
                    className="table-input"
                    value={installation.latitude || ''}
                    onChange={(e) => handleFieldChange(index, 'latitude', e.target.value)}
                    placeholder="e.g., 30.30838"
                  />
                </td>
                
                <td className="col-coordinate">
                  <input
                    type="text"
                    className="table-input"
                    value={installation.longitude || ''}
                    onChange={(e) => handleFieldChange(index, 'longitude', e.target.value)}
                    placeholder="e.g., 77.006544"
                  />
                </td>
                
                <td className="col-date">
                  <input
                    type="date"
                    className="table-input date-input"
                    value={installation.photoDate || ''}
                    onChange={(e) => handleFieldChange(index, 'photoDate', e.target.value)}
                  />
                </td>
                
                <td className="col-village">
                  <input
                    type="text"
                    className="table-input"
                    value={installation.villageGramPanchayat || ''}
                    onChange={(e) => handleFieldChange(index, 'villageGramPanchayat', e.target.value)}
                    placeholder="e.g., KANJALA"
                  />
                </td>
                
                <td className="col-block">
                  <input
                    type="text"
                    className="table-input"
                    value={installation.block || ''}
                    onChange={(e) => handleFieldChange(index, 'block', e.target.value)}
                    placeholder="e.g., AMBALA"
                  />
                </td>
                
                <td className="col-assembly">
                  <input
                    type="text"
                    className="table-input"
                    value={installation.assemblyConstituency || ''}
                    onChange={(e) => handleFieldChange(index, 'assemblyConstituency', e.target.value)}
                    placeholder="e.g., PANCHKULA"
                  />
                </td>
                
                <td className="col-date">
                  <input
                    type="date"
                    className="table-input date-input"
                    value={installation.commissioningDate || ''}
                    onChange={(e) => handleFieldChange(index, 'commissioningDate', e.target.value)}
                  />
                </td>
                
                <td className="col-serial">
                  <input
                    type="text"
                    className="table-input"
                    value={installation.moduleSerialNo || ''}
                    onChange={(e) => handleFieldChange(index, 'moduleSerialNo', e.target.value)}
                    placeholder="Module S/N"
                  />
                </td>
                
                <td className="col-serial">
                  <input
                    type="text"
                    className="table-input"
                    value={installation.batterySerialNo || ''}
                    onChange={(e) => handleFieldChange(index, 'batterySerialNo', e.target.value)}
                    placeholder="Battery S/N"
                  />
                </td>
                
                <td className="col-serial">
                  <input
                    type="text"
                    className="table-input"
                    value={installation.luminaireSerialNo || ''}
                    onChange={(e) => handleFieldChange(index, 'luminaireSerialNo', e.target.value)}
                    placeholder="Luminaire S/N"
                  />
                </td>
                
                <td className="col-rms">
                  <select
                    className="table-select"
                    value={installation.rms || 'YES'}
                    onChange={(e) => handleFieldChange(index, 'rms', e.target.value)}
                  >
                    <option value="YES">YES</option>
                    <option value="NO">NO</option>
                  </select>
                </td>
                
                <td className="col-action">
                  <button
                    type="button"
                    className="btn-icon-delete"
                    onClick={() => onRemoveRow(index)}
                    title="Remove this row"
                  >
                    🗑️
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="table-footer">
        <button
          type="button"
          className="btn-small btn-secondary"
          onClick={onAddRow}
        >
          + Add Another Installation
        </button>
        <span className="table-summary">
          Total: {installations.length} installation site(s)
        </span>
      </div>
    </div>
  );
};

export default InstallationTable;
