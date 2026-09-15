import { Zap, Cable, Shield, Gauge, Radio, Building2, Wrench } from 'lucide-react';
import './InputPanel.css';

function InputPanel({ formData, derivedValues, onChange }) {
  return (
    <div className="input-panel">
      {/* Summary Card */}
      <div className="summary-card">
        <div className="summary-item">
          <span className="summary-label">Total Capacity</span>
          <span className="summary-value">{derivedValues.totalKWP} KWP</span>
        </div>
        <div className="summary-item">
          <span className="summary-label">Configuration</span>
          <span className="summary-value">{derivedValues.stringDescription}</span>
        </div>
        <div className="summary-item">
          <span className="summary-label">Phase</span>
          <span className="summary-value">{formData.phase} Phase</span>
        </div>
        <div className="summary-item">
          <span className="summary-label">Inverter</span>
          <span className="summary-value">{formData.inverterCapacity} KWP {formData.inverterBrand}</span>
        </div>
      </div>

      <div className="form-grid">
        {/* System Parameters */}
        <section className="form-section">
          <h3 className="section-title">
            <Zap size={16} />
            System Parameters
          </h3>
          <div className="field-grid">
            <div className="field">
              <label>Modules (Count)</label>
              <input
                type="number"
                value={formData.modules}
                onChange={e => onChange('modules', parseInt(e.target.value) || 0)}
                min="1"
              />
            </div>
            <div className="field">
              <label>Watt per Module</label>
              <input
                type="number"
                value={formData.wattPerModule}
                onChange={e => onChange('wattPerModule', parseInt(e.target.value) || 0)}
                min="1"
              />
            </div>
            <div className="field">
              <label>Module Brand</label>
              <input
                type="text"
                value={formData.moduleBrand}
                onChange={e => onChange('moduleBrand', e.target.value)}
                placeholder="e.g., JAKSON"
              />
            </div>
            <div className="field">
              <label>Orientation (H/V)</label>
              <select
                value={formData.orientation}
                onChange={e => onChange('orientation', e.target.value)}
              >
                <option value="V">Vertical</option>
                <option value="H">Horizontal</option>
              </select>
            </div>
            <div className="field">
              <label>Number of Strings</label>
              <input
                type="number"
                value={formData.strings}
                onChange={e => onChange('strings', parseInt(e.target.value) || 1)}
                min="1"
              />
            </div>
            <div className="field">
              <label>Phase</label>
              <select
                value={formData.phase}
                onChange={e => onChange('phase', e.target.value)}
              >
                <option value="Single">Single Phase</option>
                <option value="Three">Three Phase</option>
              </select>
            </div>
          </div>
        </section>

        {/* Inverter */}
        <section className="form-section">
          <h3 className="section-title">
            <Gauge size={16} />
            Inverter
          </h3>
          <div className="field-grid">
            <div className="field">
              <label>Capacity (KWP)</label>
              <input
                type="text"
                value={formData.inverterCapacity}
                onChange={e => onChange('inverterCapacity', e.target.value)}
                placeholder="e.g., 12.00"
              />
            </div>
            <div className="field">
              <label>Brand</label>
              <input
                type="text"
                value={formData.inverterBrand}
                onChange={e => onChange('inverterBrand', e.target.value)}
                placeholder="e.g., POWERONE"
              />
            </div>
            <div className="field">
              <label>Type</label>
              <select
                value={formData.inverterType}
                onChange={e => onChange('inverterType', e.target.value)}
              >
                <option value="S">String Inverter</option>
                <option value="M">Micro Inverter</option>
              </select>
            </div>
          </div>
        </section>

        {/* DC Side */}
        <section className="form-section">
          <h3 className="section-title">
            <Cable size={16} />
            DC Cable
          </h3>
          <div className="field-grid">
            <div className="field">
              <label>Cable Size</label>
              <input
                type="text"
                value={formData.dcCableSize}
                onChange={e => onChange('dcCableSize', e.target.value)}
                placeholder="e.g., 4 sqmm"
              />
            </div>
            <div className="field">
              <label>Brand</label>
              <input
                type="text"
                value={formData.dcCableBrand}
                onChange={e => onChange('dcCableBrand', e.target.value)}
                placeholder="e.g., Polycab"
              />
            </div>
          </div>
        </section>

        {/* Lightning Arrester */}
        <section className="form-section">
          <h3 className="section-title">
            <Shield size={16} />
            Lightning Arrester
          </h3>
          <div className="field-grid">
            <div className="field checkbox-field">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={formData.showLightningArrester}
                  onChange={e => onChange('showLightningArrester', e.target.checked)}
                />
                <span>Show Lightning Arrester</span>
              </label>
            </div>
            {formData.showLightningArrester && (
              <div className="field full-width">
                <label>Earthing Specification</label>
                <input
                  type="text"
                  value={formData.lightningArresterEarthing}
                  onChange={e => onChange('lightningArresterEarthing', e.target.value)}
                />
              </div>
            )}
          </div>
        </section>

        {/* ACDB */}
        <section className="form-section">
          <h3 className="section-title">
            <Wrench size={16} />
            ACDB
          </h3>
          <div className="field-grid">
            <div className="field">
              <label>Configuration</label>
              <input
                type="text"
                value={formData.acdbConfig}
                onChange={e => onChange('acdbConfig', e.target.value)}
                placeholder="e.g., 1 IN 1 Out"
              />
            </div>
            <div className="field">
              <label>Rating</label>
              <input
                type="text"
                value={formData.acdbRating}
                onChange={e => onChange('acdbRating', e.target.value)}
                placeholder="e.g., 63 Amp"
              />
            </div>
            <div className="field">
              <label>Poles</label>
              <input
                type="text"
                value={formData.acdbPoles}
                onChange={e => onChange('acdbPoles', e.target.value)}
                placeholder="e.g., 4 Pole"
              />
            </div>
            <div className="field">
              <label>Type</label>
              <input
                type="text"
                value={formData.acdbType}
                onChange={e => onChange('acdbType', e.target.value)}
                placeholder="e.g., MCCB with SPD"
              />
            </div>
          </div>
        </section>

        {/* AC Cable */}
        <section className="form-section">
          <h3 className="section-title">
            <Cable size={16} />
            AC Output Cable
          </h3>
          <div className="field-grid">
            <div className="field">
              <label>Cable Size</label>
              <input
                type="text"
                value={formData.acCableSize}
                onChange={e => onChange('acCableSize', e.target.value)}
                placeholder="e.g., 6sqmm × 4Core"
              />
            </div>
            <div className="field">
              <label>Brand</label>
              <input
                type="text"
                value={formData.acCableBrand}
                onChange={e => onChange('acCableBrand', e.target.value)}
                placeholder="e.g., Polycab"
              />
            </div>
          </div>
        </section>

        {/* Components Visibility */}
        <section className="form-section">
          <h3 className="section-title">
            <Radio size={16} />
            Components
          </h3>
          <div className="field-grid">
            <div className="field checkbox-field">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={formData.showSolarMeter}
                  onChange={e => onChange('showSolarMeter', e.target.checked)}
                />
                <span>Solar Meter</span>
              </label>
            </div>
            <div className="field checkbox-field">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={formData.showNetMeter}
                  onChange={e => onChange('showNetMeter', e.target.checked)}
                />
                <span>Net Meter</span>
              </label>
            </div>
            <div className="field checkbox-field">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={formData.showDataLogger}
                  onChange={e => onChange('showDataLogger', e.target.checked)}
                />
                <span>Data Logger</span>
              </label>
            </div>
            <div className="field checkbox-field">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={formData.showLTPanel}
                  onChange={e => onChange('showLTPanel', e.target.checked)}
                />
                <span>LT Panel</span>
              </label>
            </div>
            <div className="field checkbox-field">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={formData.showEarthing}
                  onChange={e => onChange('showEarthing', e.target.checked)}
                />
                <span>Earthing</span>
              </label>
            </div>
            {formData.showDataLogger && (
              <div className="field">
                <label>Data Logger Type</label>
                <input
                  type="text"
                  value={formData.dataLoggerType}
                  onChange={e => onChange('dataLoggerType', e.target.value)}
                  placeholder="e.g., WiFi"
                />
              </div>
            )}
          </div>
        </section>

        {/* LT Panel & Earthing */}
        <section className="form-section">
          <h3 className="section-title">
            <Building2 size={16} />
            LT Panel & Earthing
          </h3>
          <div className="field-grid">
            {formData.showLTPanel && (
              <div className="field full-width">
                <label>LT Panel Cable</label>
                <input
                  type="text"
                  value={formData.ltPanelCable}
                  onChange={e => onChange('ltPanelCable', e.target.value)}
                />
              </div>
            )}
            {formData.showEarthing && (
              <div className="field full-width">
                <label>Earthing Specification</label>
                <input
                  type="text"
                  value={formData.earthingSpec}
                  onChange={e => onChange('earthingSpec', e.target.value)}
                />
              </div>
            )}
          </div>
        </section>

        {/* Branding */}
        <section className="form-section">
          <h3 className="section-title">
            <Building2 size={16} />
            Branding
          </h3>
          <div className="field-grid">
            <div className="field">
              <label>Company Name</label>
              <input
                type="text"
                value={formData.companyName}
                onChange={e => onChange('companyName', e.target.value)}
                placeholder="Your company name"
              />
            </div>
            <div className="field">
              <label>Project Title</label>
              <input
                type="text"
                value={formData.projectTitle}
                onChange={e => onChange('projectTitle', e.target.value)}
                placeholder="e.g., SINGLE LINE DIAGRAM"
              />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default InputPanel;
