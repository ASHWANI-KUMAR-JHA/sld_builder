import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { ArrowLeft, LogOut, Save, Trash2, FileText, Download, RefreshCw, Plus } from 'lucide-react';
import jsPDF from 'jspdf';
import Logo from './Logo';
import { getCurrentUser } from '../utils/auth';
import {
  fetchTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  extractVariables,
  applyVariables,
  humanizeVariable,
} from '../utils/letterTemplates';
import './LetterGenerator.css';

const BLANK = { id: null, name: '', subject: '', body: '' };

function LetterGenerator({ onBack, onLogout }) {
  const [templates, setTemplates] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [draft, setDraft] = useState(BLANK);
  const [values, setValues] = useState({});
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const previewRef = useRef(null);

  // Optional letter meta shown above the subject. Each block can be toggled
  // off per letter without clearing what you typed.
  const [meta, setMeta] = useState({
    showDate: true,
    date: new Date().toISOString().slice(0, 10), // yyyy-mm-dd
    showTo: true,
    to: '',
    showAddress: true,
    address: '',
  });

  const handleMetaChange = useCallback((field, value) => {
    setMeta((prev) => ({ ...prev, [field]: value }));
  }, []);

  // Format a yyyy-mm-dd string as "01 January 2026". Falls back to today.
  const formatDate = useCallback((iso) => {
    const d = iso ? new Date(iso) : new Date();
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
  }, []);

  const loadTemplates = useCallback(async () => {
    try {
      setLoading(true);
      const rows = await fetchTemplates();
      setTemplates(rows);
    } catch (err) {
      setStatus(`Failed to load templates: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  // Variables detected across the letter (subject + body + optional To/Address).
  const variables = useMemo(
    () => extractVariables(
      draft.subject,
      draft.body,
      meta.showTo ? meta.to : '',
      meta.showAddress ? meta.address : ''
    ),
    [draft.subject, draft.body, meta.showTo, meta.to, meta.showAddress, meta.address]
  );

  // Rendered letter with values substituted in.
  const renderedSubject = useMemo(
    () => applyVariables(draft.subject, values),
    [draft.subject, values]
  );
  const renderedBody = useMemo(
    () => applyVariables(draft.body, values),
    [draft.body, values]
  );

  const handleSelectTemplate = useCallback((id) => {
    setSelectedId(id);
    setValues({});
    setStatus('');
    if (!id) {
      setDraft(BLANK);
      return;
    }
    const tpl = templates.find((t) => t.id === id);
    if (tpl) {
      setDraft({ id: tpl.id, name: tpl.name, subject: tpl.subject || '', body: tpl.body || '' });
    }
  }, [templates]);

  const handleNew = useCallback(() => {
    setSelectedId('');
    setDraft(BLANK);
    setValues({});
    setStatus('');
  }, []);

  const handleSave = useCallback(async () => {
    if (!draft.name.trim()) {
      setStatus('Please enter a template name before saving.');
      return;
    }
    try {
      setLoading(true);
      const createdBy = getCurrentUser()?.name || '';
      if (draft.id) {
        const updated = await updateTemplate(draft.id, {
          name: draft.name,
          subject: draft.subject,
          body: draft.body,
        });
        setStatus('Template updated.');
        setDraft({ id: updated.id, name: updated.name, subject: updated.subject || '', body: updated.body || '' });
      } else {
        const created = await createTemplate({
          name: draft.name,
          subject: draft.subject,
          body: draft.body,
          createdBy,
        });
        setStatus('Template saved.');
        setSelectedId(created.id);
        setDraft({ id: created.id, name: created.name, subject: created.subject || '', body: created.body || '' });
      }
      await loadTemplates();
    } catch (err) {
      setStatus(`Save failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [draft, loadTemplates]);

  const handleDelete = useCallback(async () => {
    if (!draft.id) return;
    if (!window.confirm(`Delete template "${draft.name}"?`)) return;
    try {
      setLoading(true);
      await deleteTemplate(draft.id);
      setStatus('Template deleted.');
      handleNew();
      await loadTemplates();
    } catch (err) {
      setStatus(`Delete failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [draft, handleNew, loadTemplates]);

  const handleValueChange = useCallback((name, value) => {
    setValues((prev) => ({ ...prev, [name]: value }));
  }, []);

  const exportToPDF = useCallback(async () => {
    const doc = new jsPDF('portrait', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    const contentWidth = pageWidth - margin * 2;

    // Load logo (same asset used across the app's PDFs).
    let logoImg = null;
    try {
      const img = new window.Image();
      img.crossOrigin = 'anonymous';
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = '/SUNFEED LOGO.png';
      });
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      canvas.getContext('2d').drawImage(img, 0, 0);
      logoImg = canvas.toDataURL('image/png');
    } catch (e) {
      console.warn('Could not load logo for PDF:', e);
    }

    const drawHeaderFooter = () => {
      let hy = margin;
      if (logoImg) doc.addImage(logoImg, 'PNG', margin, hy, 45, 15);

      const corpX = pageWidth - margin - 55;
      doc.setFontSize(7.5);
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'bolditalic');
      doc.text('Corporate Office:', corpX, hy + 4);
      doc.setFont('helvetica', 'bold');
      doc.text('Sunfeed Ecosolutions India (P) Ltd.', corpX, hy + 8);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.text('527, 5th Floor, DLF Star Tower, NH-8', corpX, hy + 12);
      doc.text('Sector-30, Gurugram - 122001 (Haryana)', corpX, hy + 16);
      doc.text('GSTIN: 06AAWCS8301B1ZC', corpX, hy + 20);

      // Footer
      const footerY = pageHeight - 18;
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.5);
      doc.line(margin, footerY, pageWidth - margin, footerY);

      const footerTextY = footerY + 4;
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      const p1 = 'web: ';
      const p2 = 'www.sunfeedsolar.com';
      const p3 = ' | Contact us at:+91-124-4072847 or email us at: ';
      const p4 = 'info.sunfeed@gmail.com';
      const p5 = ' | CIN: U40300HR2016PTC058410';
      const totalWidth = doc.getTextWidth(p1) + doc.getTextWidth(p2) + doc.getTextWidth(p3) + doc.getTextWidth(p4) + doc.getTextWidth(p5);
      let cx = (pageWidth - totalWidth) / 2;
      doc.setTextColor(0, 0, 0);
      doc.text(p1, cx, footerTextY); cx += doc.getTextWidth(p1);
      doc.setTextColor(26, 115, 232);
      doc.textWithLink(p2, cx, footerTextY, { url: 'http://www.sunfeedsolar.com' }); cx += doc.getTextWidth(p2);
      doc.setTextColor(0, 0, 0);
      doc.text(p3, cx, footerTextY); cx += doc.getTextWidth(p3);
      doc.setTextColor(26, 115, 232);
      doc.textWithLink(p4, cx, footerTextY, { url: 'mailto:info.sunfeed@gmail.com' }); cx += doc.getTextWidth(p4);
      doc.setTextColor(0, 0, 0);
      doc.text(p5, cx, footerTextY);
    };

    const topStart = margin + 30;
    const bottomLimit = pageHeight - 24;
    let y = topStart;
    drawHeaderFooter();

    // Date (right aligned) — optional
    if (meta.showDate) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      doc.text(`Date: ${formatDate(meta.date)}`, pageWidth - margin, y, { align: 'right' });
      y += 10;
    }

    // To block — optional (supports {{variables}})
    if (meta.showTo && applyVariables(meta.to, values).trim()) {
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      doc.text('To,', margin, y);
      y += 6;
      const toLines = applyVariables(meta.to, values).split(/\n/);
      for (const raw of toLines) {
        const lines = doc.splitTextToSize(raw, contentWidth);
        for (const line of lines) {
          doc.text(line, margin, y);
          y += 6;
        }
      }
      y += 2;
    }

    // Address block — optional (supports {{variables}})
    if (meta.showAddress && applyVariables(meta.address, values).trim()) {
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      const addrLines = applyVariables(meta.address, values).split(/\n/);
      for (const raw of addrLines) {
        const lines = doc.splitTextToSize(raw, contentWidth);
        for (const line of lines) {
          doc.text(line, margin, y);
          y += 6;
        }
      }
      y += 4;
    }

    // Subject (bold)
    if (renderedSubject.trim()) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      const subjectLines = doc.splitTextToSize(`Subject: ${renderedSubject}`, contentWidth);
      subjectLines.forEach((line) => {
        doc.text(line, margin, y);
        y += 6;
      });
      y += 4;
    }

    // Body (wrap + paginate)
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    const lineHeight = 6;
    const paragraphs = renderedBody.split(/\n/);
    for (const para of paragraphs) {
      const lines = para.trim() === '' ? [''] : doc.splitTextToSize(para, contentWidth);
      for (const line of lines) {
        if (y > bottomLimit) {
          doc.addPage();
          drawHeaderFooter();
          y = topStart;
        }
        doc.text(line, margin, y);
        y += lineHeight;
      }
    }

    const fileName = (draft.name || 'letter').replace(/[^\w-]+/g, '_').toLowerCase();
    doc.save(`${fileName}.pdf`);
  }, [renderedSubject, renderedBody, draft.name, meta, values, formatDate]);

  const allFilled = variables.every((v) => (values[v] || '').trim() !== '');

  return (
    <div className="letter-gen-page">
      <header className="letter-gen-header">
        <div className="header-inner">
          <div className="header-left">
            <button className="header-btn" onClick={onBack} title="Back">
              <ArrowLeft size={18} />
              <span>Back</span>
            </button>
            <div className="logo">
              <Logo size="medium" />
              <div className="logo-text">
                <h1>Letter Generator</h1>
                <span className="subtitle">Template-based Letter Builder</span>
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

      <div className="letter-gen-body">
        {status && <div className="letter-gen-status">{status}</div>}

        <div className="letter-gen-grid">
          {/* Left: template editor + selection */}
          <div className="letter-gen-col">
            <div className="lg-panel">
              <div className="lg-panel-head">
                <h3><FileText size={16} /> Template</h3>
                <div className="lg-actions">
                  <button className="lg-btn" onClick={handleNew}><Plus size={15} /> New</button>
                  <button className="lg-btn primary" onClick={handleSave} disabled={loading}>
                    <Save size={15} /> {draft.id ? 'Update' : 'Save'}
                  </button>
                  {draft.id && (
                    <button className="lg-btn danger" onClick={handleDelete} disabled={loading}>
                      <Trash2 size={15} /> Delete
                    </button>
                  )}
                </div>
              </div>

              <label className="lg-label">Load Saved Template</label>
              <div className="lg-load-row">
                <select
                  className="lg-select"
                  value={selectedId}
                  onChange={(e) => handleSelectTemplate(e.target.value)}
                >
                  <option value="">— Select a template —</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
                <button className="lg-btn" onClick={loadTemplates} title="Refresh">
                  <RefreshCw size={15} />
                </button>
              </div>

              <label className="lg-label">Template Name</label>
              <input
                className="lg-input"
                type="text"
                value={draft.name}
                onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                placeholder="e.g., Warranty Confirmation Letter"
              />

              <label className="lg-label">Subject</label>
              <input
                className="lg-input"
                type="text"
                value={draft.subject}
                onChange={(e) => setDraft((d) => ({ ...d, subject: e.target.value }))}
                placeholder="e.g., Warranty for {{customer_name}}"
              />

              <label className="lg-label">
                Body <span className="lg-hint">Use {'{{variable}}'} for placeholders</span>
              </label>
              <textarea
                className="lg-textarea"
                value={draft.body}
                onChange={(e) => setDraft((d) => ({ ...d, body: e.target.value }))}
                placeholder={'Dear {{customer_name}},\n\nThis is to confirm that your {{product}} installed at {{address}} is covered...'}
                rows={14}
              />
            </div>

            {/* Optional letter meta above the subject: To / Address / Date */}
            <div className="lg-panel">
              <div className="lg-panel-head">
                <h3><FileText size={16} /> Letter Details</h3>
                <span className="lg-hint">Toggle each block on or off</span>
              </div>

              <div className="lg-meta-row">
                <label className="lg-toggle">
                  <input
                    type="checkbox"
                    checked={meta.showDate}
                    onChange={(e) => handleMetaChange('showDate', e.target.checked)}
                  />
                  Date
                </label>
                <input
                  className="lg-input"
                  type="date"
                  value={meta.date}
                  disabled={!meta.showDate}
                  onChange={(e) => handleMetaChange('date', e.target.value)}
                />
              </div>

              <div className="lg-meta-block">
                <label className="lg-toggle">
                  <input
                    type="checkbox"
                    checked={meta.showTo}
                    onChange={(e) => handleMetaChange('showTo', e.target.checked)}
                  />
                  To (recipient)
                </label>
                <textarea
                  className="lg-textarea"
                  rows={2}
                  value={meta.to}
                  disabled={!meta.showTo}
                  onChange={(e) => handleMetaChange('to', e.target.value)}
                  placeholder={'The Manager,\n{{company_name}}'}
                />
              </div>

              <div className="lg-meta-block">
                <label className="lg-toggle">
                  <input
                    type="checkbox"
                    checked={meta.showAddress}
                    onChange={(e) => handleMetaChange('showAddress', e.target.checked)}
                  />
                  Address
                </label>
                <textarea
                  className="lg-textarea"
                  rows={2}
                  value={meta.address}
                  disabled={!meta.showAddress}
                  onChange={(e) => handleMetaChange('address', e.target.value)}
                  placeholder={'{{address}}\nGurugram, Haryana'}
                />
              </div>
            </div>

            {/* Dynamic fields generated from {{variables}} */}
            <div className="lg-panel">
              <div className="lg-panel-head">
                <h3><FileText size={16} /> Fill Variables</h3>
                <span className="lg-count">{variables.length} field{variables.length === 1 ? '' : 's'}</span>
              </div>
              {variables.length === 0 ? (
                <p className="lg-empty">No {'{{variables}}'} found in the template yet. Add placeholders in the body or subject.</p>
              ) : (
                <div className="lg-fields">
                  {variables.map((name) => (
                    <div className="lg-field" key={name}>
                      <label>{humanizeVariable(name)}</label>
                      <input
                        type="text"
                        value={values[name] || ''}
                        onChange={(e) => handleValueChange(name, e.target.value)}
                        placeholder={`Enter ${humanizeVariable(name)}`}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right: live preview */}
          <div className="letter-gen-col">
            <div className="lg-panel lg-preview-panel">
              <div className="lg-panel-head">
                <h3><FileText size={16} /> Preview</h3>
                <button className="lg-btn primary" onClick={exportToPDF} disabled={!draft.body.trim()}>
                  <Download size={15} /> Export PDF
                </button>
              </div>
              {!allFilled && variables.length > 0 && (
                <div className="lg-warn">Some variables are still empty — they will render blank.</div>
              )}
              <div className="lg-letter" ref={previewRef}>
                <div className="lg-letter-head">
                  <img src="/SUNFEED LOGO.png" alt="Sunfeed" className="lg-letter-logo" />
                  <div className="lg-letter-corp">
                    <strong>Corporate Office:</strong><br />
                    Sunfeed Ecosolutions India (P) Ltd.<br />
                    527, 5th Floor, DLF Star Tower, NH-8<br />
                    Sector-30, Gurugram - 122001 (Haryana)<br />
                    GSTIN: 06AAWCS8301B1ZC
                  </div>
                </div>
                {meta.showDate && (
                  <div className="lg-letter-date">Date: {formatDate(meta.date)}</div>
                )}
                {meta.showTo && applyVariables(meta.to, values).trim() && (
                  <div className="lg-letter-to">
                    To,{'\n'}{applyVariables(meta.to, values)}
                  </div>
                )}
                {meta.showAddress && applyVariables(meta.address, values).trim() && (
                  <div className="lg-letter-address">{applyVariables(meta.address, values)}</div>
                )}
                {renderedSubject.trim() && (
                  <div className="lg-letter-subject"><strong>Subject: {renderedSubject}</strong></div>
                )}
                <div className="lg-letter-body">{renderedBody}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LetterGenerator;
