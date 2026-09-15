import { useState, useCallback, useRef } from 'react';
import { ArrowLeft, LogOut, Plus, Trash2, Download, FileText, RefreshCw, Image, Upload, ClipboardPaste } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import Logo from './Logo';
import './FlashReport.css';

const ROWS_PER_PAGE = 30;
const LETTERHEAD_ROWS_PER_PAGE = 30;

function FlashReport({ onBack, onLogout }) {
  // Toggle between Flash Report and Letter Head Report
  const [reportMode, setReportMode] = useState('flash'); // 'flash' or 'letterhead'

  // Flash Report configuration state
  const [config, setConfig] = useState({
    iscMin: 13.90,
    iscMax: 13.99,
    vocMin: 49.90,
    vocMax: 49.99,
    pMax: 590,
    impMin: 13.10,
    impMax: 13.19,
    vmpMin: 41.90,
    vmpMax: 41.99,
    eff: '21.50%',
  });

  // Letter Head configuration state
  const [letterConfig, setLetterConfig] = useState({
    watt: '',
    address: '',
    inverterNo: '',
    totalInverter: '',
    manufacture: '',
  });

  // Serial numbers input (shared between both modes)
  const [serialNumbers, setSerialNumbers] = useState([
    { id: 1, serial: '' }
  ]);

  // Generated report data
  const [reportData, setReportData] = useState(null);
  const [letterReportData, setLetterReportData] = useState(null);
  const reportRef = useRef(null);
  const fileInputRef = useRef(null);

  // Parse serial numbers from text content (CSV, TSV, or newline-separated)
  const parseSerials = useCallback((text) => {
    const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
    const serials = [];

    for (const line of lines) {
      const cells = line.split(/[,\t]/);
      for (const cell of cells) {
        const value = cell.trim();
        if (!value) continue;
        if (/^(s\.?no\.?|serial|module|module serial no\.?)$/i.test(value)) continue;
        if (/^\d+$/.test(value) && value.length < 5) continue;
        if (value.length >= 5) {
          serials.push(value);
        }
      }
    }
    return serials;
  }, []);

  const handleBulkAdd = useCallback((serials) => {
    if (serials.length === 0) return;
    setSerialNumbers(prev => {
      const maxId = prev.length > 0 ? Math.max(...prev.map(r => r.id)) : 0;
      const base = prev.length === 1 && prev[0].serial.trim() === '' ? [] : prev;
      const baseMaxId = base.length > 0 ? Math.max(...base.map(r => r.id)) : maxId;
      const newRows = serials.map((serial, idx) => ({
        id: baseMaxId + idx + 1,
        serial,
      }));
      return [...base, ...newRows];
    });
  }, []);

  const handleFileUpload = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      const serials = parseSerials(text);
      handleBulkAdd(serials);
    };
    reader.readAsText(file);
    e.target.value = '';
  }, [parseSerials, handleBulkAdd]);

  const handlePaste = useCallback((e) => {
    const pastedText = e.clipboardData?.getData('text');
    if (!pastedText) return;

    const lines = pastedText.split(/\r?\n/).filter(l => l.trim() !== '');
    if (lines.length > 1) {
      e.preventDefault();
      const serials = parseSerials(pastedText);
      handleBulkAdd(serials);
    }
  }, [parseSerials, handleBulkAdd]);

  const handleConfigChange = useCallback((field, value) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleLetterConfigChange = useCallback((field, value) => {
    setLetterConfig(prev => ({ ...prev, [field]: value }));
  }, []);

  const addRow = useCallback(() => {
    setSerialNumbers(prev => [
      ...prev,
      { id: prev.length > 0 ? Math.max(...prev.map(r => r.id)) + 1 : 1, serial: '' }
    ]);
  }, []);

  const handleSerialKeyDown = useCallback((e, id) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      setSerialNumbers(prev => {
        const newId = prev.length > 0 ? Math.max(...prev.map(r => r.id)) + 1 : 1;
        return [...prev, { id: newId, serial: '' }];
      });
      setTimeout(() => {
        const inputs = document.querySelectorAll('.serial-input');
        if (inputs.length > 0) {
          inputs[inputs.length - 1].focus();
        }
      }, 50);
    }
  }, []);

  const removeRow = useCallback((id) => {
    setSerialNumbers(prev => prev.filter(row => row.id !== id));
  }, []);

  const updateSerial = useCallback((id, value) => {
    setSerialNumbers(prev => prev.map(row =>
      row.id === id ? { ...row, serial: value } : row
    ));
  }, []);

  const randomInRange = (min, max) => {
    const val = min + Math.random() * (max - min);
    return parseFloat(val.toFixed(2));
  };

  const generateReport = useCallback(() => {
    if (reportMode === 'flash') {
      const data = serialNumbers
        .filter(row => row.serial.trim() !== '')
        .map((row, index) => ({
          sno: index + 1,
          serial: row.serial.trim(),
          isc: randomInRange(config.iscMin, config.iscMax),
          voc: randomInRange(config.vocMin, config.vocMax),
          pMax: config.pMax,
          imp: randomInRange(config.impMin, config.impMax),
          vmp: randomInRange(config.vmpMin, config.vmpMax),
          eff: config.eff,
        }));
      setReportData(data);
    } else {
      const data = serialNumbers
        .filter(row => row.serial.trim() !== '')
        .map((row, index) => ({
          sno: index + 1,
          serial: row.serial.trim(),
        }));
      setLetterReportData(data);
    }
  }, [reportMode, serialNumbers, config]);

  const exportFlashToPDF = useCallback(async () => {
    if (!reportData || reportData.length === 0) return;

    const doc = new jsPDF('portrait', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
    const pageHeight = doc.internal.pageSize.getHeight(); // 297mm
    const margin = 10;
    const tableWidth = pageWidth - margin * 2;
    const rowHeight = 7;
    const headerHeight = 8;
    const colWidths = [12, 52, 22, 22, 22, 22, 22, 16];
    const headers = ['S.No.', 'MODULE SERIAL NO.', 'ISC', 'VOC', 'P MAX', 'IMP', 'VMP', 'EFF'];

    // Load logo image
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
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      logoImg = canvas.toDataURL('image/png');
    } catch (e) {
      console.warn('Could not load logo for PDF:', e);
    }

    const totalPages = Math.ceil(reportData.length / ROWS_PER_PAGE);

    for (let page = 0; page < totalPages; page++) {
      if (page > 0) doc.addPage();

      const startIdx = page * ROWS_PER_PAGE;
      const endIdx = Math.min(startIdx + ROWS_PER_PAGE, reportData.length);
      const pageData = reportData.slice(startIdx, endIdx);

      let y = margin;

      // === HEADER: Logo (left) + Corporate Address (right) ===
      if (logoImg) {
        doc.addImage(logoImg, 'PNG', margin, y, 40, 13);
      }

      // Corporate Office (right side)
      const corpX = pageWidth - margin - 55;
      doc.setFontSize(7);
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'bolditalic');
      doc.text('Corporate Office:', corpX, y + 3);
      doc.setFont('helvetica', 'bold');
      doc.text('Sunfeed Ecosolutions India (P) Ltd.', corpX, y + 7);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.text('527, 5th Floor, DLF Star Tower, NH-8', corpX, y + 11);
      doc.text('Sector-30, Gurugram - 122001 (Haryana)', corpX, y + 15);
      doc.text('GSTIN: 06AAWCS8301B1ZC', corpX, y + 19);

      y += 23;

      // Title
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text('Flash Test Report', pageWidth / 2, y, { align: 'center' });
      y += 7;

      let x = margin;

      // Table header
      doc.setFillColor(51, 51, 51);
      doc.rect(x, y, tableWidth, headerHeight, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');

      headers.forEach((header, i) => {
        const colX = x + colWidths.slice(0, i).reduce((a, b) => a + b, 0);
        doc.text(header, colX + colWidths[i] / 2, y + headerHeight / 2 + 2, { align: 'center' });
      });

      y += headerHeight;
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');

      pageData.forEach((row, rowIdx) => {
        if (rowIdx % 2 === 0) {
          doc.setFillColor(245, 245, 245);
          doc.rect(x, y, tableWidth, rowHeight, 'F');
        }

        const values = [
          row.sno.toString(),
          row.serial,
          row.isc.toFixed(2) + 'A',
          row.voc.toFixed(2) + 'V',
          row.pMax.toString() + 'WP',
          row.imp.toFixed(2) + 'A',
          row.vmp.toFixed(2) + 'V',
          row.eff,
        ];

        values.forEach((val, i) => {
          const colX = x + colWidths.slice(0, i).reduce((a, b) => a + b, 0);
          doc.text(val, colX + colWidths[i] / 2, y + rowHeight / 2 + 2, { align: 'center' });
        });

        y += rowHeight;
      });

      // Border around table
      const tableTopY = y - pageData.length * rowHeight - headerHeight;
      const tableHeight = headerHeight + pageData.length * rowHeight;
      doc.setDrawColor(200, 200, 200);
      doc.rect(x, tableTopY, tableWidth, tableHeight);

      // Draw column lines
      let lineX = x;
      for (let i = 0; i < colWidths.length - 1; i++) {
        lineX += colWidths[i];
        doc.line(lineX, tableTopY, lineX, tableTopY + tableHeight);
      }

      // Draw row lines
      let lineY = tableTopY + headerHeight;
      for (let i = 0; i < pageData.length; i++) {
        doc.line(x, lineY, x + tableWidth, lineY);
        lineY += rowHeight;
      }

      // === FOOTER ===
      const footerY = pageHeight - 18;
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.5);
      doc.line(margin, footerY, pageWidth - margin, footerY);

      const footerTextY = footerY + 4;
      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'normal');

      const part1 = 'web: ';
      const part2 = 'www.sunfeedsolar.com';
      const part3 = ' | Contact us at:+91-124-4072847 or email us at: ';
      const part4 = 'info.sunfeed@gmail.com';
      const part5 = ' | CIN: U40300HR2016PTC058410';
      const totalWidth = doc.getTextWidth(part1) + doc.getTextWidth(part2) + doc.getTextWidth(part3) + doc.getTextWidth(part4) + doc.getTextWidth(part5);
      let cursorX = (pageWidth - totalWidth) / 2;

      doc.setTextColor(0, 0, 0);
      doc.text(part1, cursorX, footerTextY);
      cursorX += doc.getTextWidth(part1);

      doc.setTextColor(26, 115, 232);
      doc.textWithLink(part2, cursorX, footerTextY, { url: 'http://www.sunfeedsolar.com' });
      cursorX += doc.getTextWidth(part2);

      doc.setTextColor(0, 0, 0);
      doc.text(part3, cursorX, footerTextY);
      cursorX += doc.getTextWidth(part3);

      doc.setTextColor(26, 115, 232);
      doc.textWithLink(part4, cursorX, footerTextY, { url: 'mailto:info.sunfeed@gmail.com' });
      cursorX += doc.getTextWidth(part4);

      doc.setTextColor(0, 0, 0);
      doc.text(part5, cursorX, footerTextY);

      // Page number
      doc.setFontSize(7);
      doc.setTextColor(0, 0, 0);
      doc.text(`Page ${page + 1} of ${totalPages}`, pageWidth / 2, footerY + 9, { align: 'center' });
    }

    doc.save('flash_report.pdf');
  }, [reportData]);

  const exportLetterHeadToPDF = useCallback(async () => {
    if (!letterReportData || letterReportData.length === 0) return;

    const doc = new jsPDF('portrait', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
    const pageHeight = doc.internal.pageSize.getHeight(); // 297mm
    const margin = 15;
    const contentWidth = pageWidth - margin * 2;

    // Load logo image
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
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      logoImg = canvas.toDataURL('image/png');
    } catch (e) {
      console.warn('Could not load logo for PDF:', e);
    }

    const totalPages = Math.ceil(letterReportData.length / LETTERHEAD_ROWS_PER_PAGE);

    for (let page = 0; page < totalPages; page++) {
      if (page > 0) doc.addPage();

      let y = margin;

      // Logo area (left side)
      if (logoImg) {
        doc.addImage(logoImg, 'PNG', margin, y, 45, 15);
      }
      doc.setFontSize(7);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(100, 100, 100);
      // doc.text('Energies Your Lives with Happiness....', margin, y + 19);

      // Corporate Office (right side - smaller text, left aligned within right block)
      const corpX = pageWidth - margin - 55; // position block on right side
      doc.setFontSize(7.5);
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'bolditalic');
      doc.text('Corporate Office:', corpX, y + 4);
      doc.setFont('helvetica', 'bold');
      doc.text('Sunfeed Ecosolutions India (P) Ltd.', corpX, y + 8);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.text('527, 5th Floor, DLF Star Tower, NH-8', corpX, y + 12);
      doc.text('Sector-30, Gurugram - 122001 (Haryana)', corpX, y + 16);
      doc.text('GSTIN: 06AAWCS8301B1ZC', corpX, y + 20);

      y += 26;

      // Title line
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      const titleLine = `SOLAR MODULE AND SPLAR INVERTER SERIAL NO. OF  ${letterConfig.watt || '___'}  ON GRID SOLAR POWER PLANT`;
      doc.text(titleLine, margin, y);
      y += 5;
      doc.text(`INSTALLED AT :-  ${letterConfig.address || '___'}`, margin, y);
      y += 8;

      // Info table
      const infoRowHeight = 7;
      const labelWidth = contentWidth * 0.40;
      const valueWidth = contentWidth * 0.60;

      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');

      // Make of Inverter
      doc.rect(margin, y, labelWidth, infoRowHeight);
      doc.rect(margin + labelWidth, y, valueWidth, infoRowHeight);
      doc.text('MAKE OF INVERTER:', margin + 2, y + 5);
      doc.setFont('helvetica', 'normal');
      doc.text(letterConfig.manufacture || '', margin + labelWidth + 2, y + 5);
      y += infoRowHeight;

      // Rating of Inverter
      doc.setFont('helvetica', 'bold');
      doc.rect(margin, y, labelWidth, infoRowHeight);
      doc.rect(margin + labelWidth, y, valueWidth, infoRowHeight);
      doc.text('RATING OF INVERTER:', margin + 2, y + 5);
      doc.setFont('helvetica', 'normal');
      doc.text(`${letterConfig.watt || ''} | ${letterConfig.totalInverter || ''} NOS`, margin + labelWidth + 2, y + 5);
      y += infoRowHeight;

      // Inverter Serial No
      doc.setFont('helvetica', 'bold');
      doc.rect(margin, y, labelWidth, infoRowHeight);
      doc.rect(margin + labelWidth, y, valueWidth, infoRowHeight);
      doc.text('INVERTER SERIAL NO:', margin + 2, y + 5);
      doc.setFont('helvetica', 'normal');
      doc.text(letterConfig.inverterNo || '', margin + labelWidth + 2, y + 5);
      y += infoRowHeight + 6;

      // Module serial table - compact width
      const startIdx = page * LETTERHEAD_ROWS_PER_PAGE;
      const endIdx = Math.min(startIdx + LETTERHEAD_ROWS_PER_PAGE, letterReportData.length);
      const pageData = letterReportData.slice(startIdx, endIdx);

      const snoWidth = 15;
      const serialWidth = 55;
      const tableRowHeight = 6;

      // Table header
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.rect(margin, y, snoWidth, tableRowHeight);
      doc.rect(margin + snoWidth, y, serialWidth, tableRowHeight);
      doc.text('S.No.', margin + snoWidth / 2, y + 4, { align: 'center' });
      doc.text('MODULE SERIAL NO.', margin + snoWidth + 4, y + 4);
      y += tableRowHeight;

      // Table rows
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      pageData.forEach((row) => {
        doc.rect(margin, y, snoWidth, tableRowHeight);
        doc.rect(margin + snoWidth, y, serialWidth, tableRowHeight);
        doc.text(row.sno.toString(), margin + snoWidth / 2, y + 4, { align: 'center' });
        doc.text(row.serial, margin + snoWidth + 4, y + 4);
        y += tableRowHeight;
      });

      // Footer line with contact info
      const footerY = pageHeight - 18;
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.5);
      doc.line(margin, footerY, pageWidth - margin, footerY);

      // Footer text with hyperlinks in blue - center aligned
      const footerTextY = footerY + 4;
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');

      // Calculate total width to center the footer text
      const part1 = 'web: ';
      const part2 = 'www.sunfeedsolar.com';
      const part3 = ' | Contact us at:+91-124-4072847 or email us at: ';
      const part4 = 'info.sunfeed@gmail.com';
      const part5 = ' | CIN: U40300HR2016PTC058410';
      const totalWidth = doc.getTextWidth(part1) + doc.getTextWidth(part2) + doc.getTextWidth(part3) + doc.getTextWidth(part4) + doc.getTextWidth(part5);
      let cursorX = (pageWidth - totalWidth) / 2;

      // "web: "
      doc.setTextColor(0, 0, 0);
      doc.text(part1, cursorX, footerTextY);
      cursorX += doc.getTextWidth(part1);

      // "www.sunfeedsolar.com" in blue as link
      doc.setTextColor(26, 115, 232);
      doc.textWithLink(part2, cursorX, footerTextY, { url: 'http://www.sunfeedsolar.com' });
      cursorX += doc.getTextWidth(part2);

      // " | Contact us at:+91-124-4072847 or email us at: "
      doc.setTextColor(0, 0, 0);
      doc.text(part3, cursorX, footerTextY);
      cursorX += doc.getTextWidth(part3);

      // "info.sunfeed@gmail.com" in blue as link
      doc.setTextColor(26, 115, 232);
      doc.textWithLink(part4, cursorX, footerTextY, { url: 'mailto:info.sunfeed@gmail.com' });
      cursorX += doc.getTextWidth(part4);

      // " | CIN: U40300HR2016PTC058410"
      doc.setTextColor(0, 0, 0);
      doc.text(part5, cursorX, footerTextY);

      // Page number below footer
      doc.setFontSize(8);
      doc.setTextColor(0, 0, 0);
      doc.text(`Page ${page + 1} of ${totalPages}`, pageWidth / 2, footerY + 9, { align: 'center' });
    }

    doc.save('letterhead_report.pdf');
  }, [letterReportData, letterConfig]);

  const exportToImage = useCallback(async () => {
    if (!reportRef.current) return;
    try {
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
      });
      const link = document.createElement('a');
      link.download = reportMode === 'flash' ? 'flash_report.png' : 'letterhead_report.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('Export to image failed:', err);
    }
  }, [reportMode]);

  const exportToCSV = useCallback(() => {
    const validSerials = serialNumbers.filter(row => row.serial.trim() !== '');
    if (validSerials.length === 0) return;

    const csvHeader = 'S.No.,Module Serial No.';
    const csvRows = validSerials.map((row, index) => `${index + 1},"${row.serial.trim()}"`);
    const csvContent = [csvHeader, ...csvRows].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'serial_numbers.csv';
    link.click();
    URL.revokeObjectURL(url);
  }, [serialNumbers]);

  const currentReportData = reportMode === 'flash' ? reportData : letterReportData;

  return (
    <div className="flash-report-page">
      <header className="flash-report-header">
        <div className="header-inner">
          <div className="header-left">
            <button className="header-btn" onClick={onBack} title="Back to Generator">
              <ArrowLeft size={18} />
              <span>Back</span>
            </button>
            <div className="logo">
              <Logo size="medium" />
              <div className="logo-text">
                <h1>{reportMode === 'flash' ? 'Flash Test Report' : 'Letter Head Report'}</h1>
                <span className="subtitle">Module Testing Report Generator</span>
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

      <div className="flash-report-body">
        {/* Report Mode Toggle */}
        <div className="report-mode-toggle">
          <button
            className={`toggle-btn ${reportMode === 'flash' ? 'active' : ''}`}
            onClick={() => setReportMode('flash')}
          >
            <FileText size={16} />
            Flash Report
          </button>
          <button
            className={`toggle-btn ${reportMode === 'letterhead' ? 'active' : ''}`}
            onClick={() => setReportMode('letterhead')}
          >
            <FileText size={16} />
            Letter Head Report
          </button>
        </div>

        {/* Configuration Panel */}
        <div className="flash-config-panel">
          <h3><FileText size={16} /> {reportMode === 'flash' ? 'Report Configuration' : 'Letter Head Configuration'}</h3>

          {reportMode === 'flash' ? (
            <div className="config-grid">
              <div className="config-group">
                <label>ISC Range</label>
                <div className="range-inputs">
                  <input
                    type="number"
                    step="0.01"
                    value={config.iscMin}
                    onChange={(e) => handleConfigChange('iscMin', parseFloat(e.target.value))}
                    placeholder="Min"
                  />
                  <span>to</span>
                  <input
                    type="number"
                    step="0.01"
                    value={config.iscMax}
                    onChange={(e) => handleConfigChange('iscMax', parseFloat(e.target.value))}
                    placeholder="Max"
                  />
                </div>
              </div>

              <div className="config-group">
                <label>VOC Range</label>
                <div className="range-inputs">
                  <input
                    type="number"
                    step="0.01"
                    value={config.vocMin}
                    onChange={(e) => handleConfigChange('vocMin', parseFloat(e.target.value))}
                    placeholder="Min"
                  />
                  <span>to</span>
                  <input
                    type="number"
                    step="0.01"
                    value={config.vocMax}
                    onChange={(e) => handleConfigChange('vocMax', parseFloat(e.target.value))}
                    placeholder="Max"
                  />
                </div>
              </div>

              <div className="config-group">
                <label>P MAX (fixed value)</label>
                <input
                  type="number"
                  value={config.pMax}
                  onChange={(e) => handleConfigChange('pMax', parseFloat(e.target.value))}
                  placeholder="P MAX value"
                />
              </div>

              <div className="config-group">
                <label>IMP Range</label>
                <div className="range-inputs">
                  <input
                    type="number"
                    step="0.01"
                    value={config.impMin}
                    onChange={(e) => handleConfigChange('impMin', parseFloat(e.target.value))}
                    placeholder="Min"
                  />
                  <span>to</span>
                  <input
                    type="number"
                    step="0.01"
                    value={config.impMax}
                    onChange={(e) => handleConfigChange('impMax', parseFloat(e.target.value))}
                    placeholder="Max"
                  />
                </div>
              </div>

              <div className="config-group">
                <label>VMP Range</label>
                <div className="range-inputs">
                  <input
                    type="number"
                    step="0.01"
                    value={config.vmpMin}
                    onChange={(e) => handleConfigChange('vmpMin', parseFloat(e.target.value))}
                    placeholder="Min"
                  />
                  <span>to</span>
                  <input
                    type="number"
                    step="0.01"
                    value={config.vmpMax}
                    onChange={(e) => handleConfigChange('vmpMax', parseFloat(e.target.value))}
                    placeholder="Max"
                  />
                </div>
              </div>

              <div className="config-group">
                <label>EFF (fixed value)</label>
                <input
                  type="text"
                  value={config.eff}
                  onChange={(e) => handleConfigChange('eff', e.target.value)}
                  placeholder="e.g. 21.50%"
                />
              </div>
            </div>
          ) : (
            <div className="config-grid letterhead-grid">
              <div className="config-group">
                <label>Watt</label>
                <input
                  type="text"
                  value={letterConfig.watt}
                  onChange={(e) => handleLetterConfigChange('watt', e.target.value)}
                  placeholder="e.g., 10 KW"
                />
              </div>
              <div className="config-group">
                <label>Address</label>
                <input
                  type="text"
                  value={letterConfig.address}
                  onChange={(e) => handleLetterConfigChange('address', e.target.value)}
                  placeholder="e.g., KGBV HOSTEL, TISSA, (H.P)"
                />
              </div>
              <div className="config-group">
                <label>Inverter No.</label>
                <input
                  type="text"
                  value={letterConfig.inverterNo}
                  onChange={(e) => handleLetterConfigChange('inverterNo', e.target.value)}
                  placeholder="e.g., BE09IA03397"
                />
              </div>
              <div className="config-group">
                <label>Total Inverter</label>
                <input
                  type="text"
                  value={letterConfig.totalInverter}
                  onChange={(e) => handleLetterConfigChange('totalInverter', e.target.value)}
                  placeholder="e.g., 1"
                />
              </div>
              <div className="config-group">
                <label>Manufacture</label>
                <input
                  type="text"
                  value={letterConfig.manufacture}
                  onChange={(e) => handleLetterConfigChange('manufacture', e.target.value)}
                  placeholder="e.g., MINDRA GREEN ENERGY"
                />
              </div>
            </div>
          )}
        </div>

        <div className="flash-content">
          {/* Input Table */}
          <div className="flash-input-section">
            <div className="section-header">
              <h3>Module Serial Numbers</h3>
              <div className="section-actions">
                <button className="btn-add" onClick={addRow}>
                  <Plus size={16} /> Add Row
                </button>
                <button className="btn-upload" onClick={() => fileInputRef.current?.click()}>
                  <Upload size={16} /> Bulk Upload
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.txt,.tsv"
                  style={{ display: 'none' }}
                  onChange={handleFileUpload}
                />
                <button className="btn-generate" onClick={generateReport}>
                  <RefreshCw size={16} /> Generate {reportMode === 'flash' ? 'Flash Report' : 'Letter Head'}
                </button>
              </div>
            </div>

            <div className="serial-table-wrapper">
              <table className="serial-table">
                <thead>
                  <tr>
                    <th>S.No.</th>
                    <th>MODULE SERIAL NO.</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {serialNumbers.map((row, index) => (
                    <tr key={row.id}>
                      <td className="sno-cell">{index + 1}</td>
                      <td>
                        <input
                          type="text"
                          className="serial-input"
                          value={row.serial}
                          onChange={(e) => updateSerial(row.id, e.target.value)}
                          onKeyDown={(e) => handleSerialKeyDown(e, row.id)}
                          onPaste={handlePaste}
                          placeholder="Enter module serial number (Enter to add row)"
                        />
                      </td>
                      <td>
                        <button
                          className="btn-remove"
                          onClick={() => removeRow(row.id)}
                          disabled={serialNumbers.length === 1}
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Report Preview */}
          <div className="flash-preview-section">
            <div className="section-header">
              <h3>Report Preview</h3>
              {currentReportData && currentReportData.length > 0 && (
                <div className="section-actions">
                  <button className="btn-export" onClick={reportMode === 'flash' ? exportFlashToPDF : exportLetterHeadToPDF}>
                    <Download size={16} /> Export PDF
                  </button>
                  <button className="btn-export-img" onClick={exportToImage}>
                    <Image size={16} /> Export Image
                  </button>
                  <button className="btn-export" onClick={exportToCSV}>
                    <FileText size={16} /> Export CSV
                  </button>
                </div>
              )}
            </div>

            {reportMode === 'flash' && reportData && reportData.length > 0 ? (
              <div className="report-preview-wrapper" ref={reportRef}>
                <table className="report-table">
                  <thead>
                    <tr>
                      <th>S.No.</th>
                      <th>MODULE SERIAL NO.</th>
                      <th>ISC</th>
                      <th>VOC</th>
                      <th>P MAX</th>
                      <th>IMP</th>
                      <th>VMP</th>
                      <th>EFF</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.map((row) => (
                      <tr key={row.sno}>
                        <td>{row.sno}</td>
                        <td className="serial-cell">{row.serial}</td>
                        <td>{row.isc.toFixed(2)}A</td>
                        <td>{row.voc.toFixed(2)}V</td>
                        <td>{row.pMax}WP</td>
                        <td>{row.imp.toFixed(2)}A</td>
                        <td>{row.vmp.toFixed(2)}V</td>
                        <td>{row.eff}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="report-footer">
                  <span>Total Modules: {reportData.length}</span>
                  <span>Pages in PDF: {Math.ceil(reportData.length / ROWS_PER_PAGE)}</span>
                </div>
              </div>
            ) : reportMode === 'letterhead' && letterReportData && letterReportData.length > 0 ? (
              <div className="report-preview-wrapper letterhead-preview" ref={reportRef}>
                {/* Letterhead Header */}
                <div className="letterhead-header-section">
                  <div className="letterhead-logo-area">
                    <Logo size="large" />
                    {/* <span className="letterhead-tagline">Energies Your Lives with Happiness....</span> */}
                  </div>
                  <div className="letterhead-address-area">
                    <p className="corporate-title">Corporate Office:</p>
                    <p className="corporate-name">Sunfeed Ecosolutions India (P) Ltd.</p>
                    <p>527, 5th Floor, DLF Star Tower, NH-8</p>
                    <p>Sector-30, Gurugram - 122001 (Haryana)</p>
                    <p>GSTIN: 06AAWCS8301B1ZC</p>
                  </div>
                </div>

                {/* Title */}
                <div className="letterhead-title">
                  <p><strong>SOLAR MODULE AND SPLAR INVERTER SERIAL NO. OF <u>{letterConfig.watt || '___'}</u> ON GRID SOLAR POWER PLANT</strong></p>
                  <p><strong>INSTALLED AT :-  {letterConfig.address || '___'}</strong></p>
                </div>

                {/* Info Table */}
                <table className="letterhead-info-table">
                  <tbody>
                    <tr>
                      <td className="info-label"><strong>MAKE OF INVERTER:</strong></td>
                      <td className="info-value">{letterConfig.manufacture || ''}</td>
                    </tr>
                    <tr>
                      <td className="info-label"><strong>RATING OF INVERTER:</strong></td>
                      <td className="info-value">{letterConfig.watt || ''} | {letterConfig.totalInverter || ''} NOS</td>
                    </tr>
                    <tr>
                      <td className="info-label"><strong>INVERTER SERIAL NO:</strong></td>
                      <td className="info-value">{letterConfig.inverterNo || ''}</td>
                    </tr>
                  </tbody>
                </table>

                {/* Serial Numbers Table */}
                <table className="letterhead-serial-table">
                  <thead>
                    <tr>
                      <th>S.No.</th>
                      <th>MODULE SERIAL NO.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {letterReportData.map((row) => (
                      <tr key={row.sno}>
                        <td>{row.sno}</td>
                        <td>{row.serial}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="letterhead-contact-footer">
                  <hr className="footer-line" />
                  <p>web: <a href="http://www.sunfeedsolar.com">www.sunfeedsolar.com</a> | Contact us at:+91-124-4072847 or email us at: <a href="mailto:info.sunfeed@gmail.com">info.sunfeed@gmail.com</a> | CIN: U40300HR2016PTC058410</p>
                </div>

                <div className="report-footer">
                  <span>Total Modules: {letterReportData.length}</span>
                  <span>Pages in PDF: {Math.ceil(letterReportData.length / LETTERHEAD_ROWS_PER_PAGE)}</span>
                </div>
              </div>
            ) : (
              <div className="preview-placeholder">
                <FileText size={48} />
                <p>Enter serial numbers and click "Generate {reportMode === 'flash' ? 'Flash Report' : 'Letter Head'}" to see the preview</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default FlashReport;
