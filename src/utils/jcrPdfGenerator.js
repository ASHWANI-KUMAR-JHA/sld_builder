/**
 * JCR PDF Generator
 * Generates professional PDF documents for the Joint Commissioning Report:
 *   - Cover Letter
 *   - Format-II   : Material Receipt
 *   - Format-III  : Joint Commissioning Report Summary
 *   - Format-III(a): Site-wise Installation List (landscape)
 */

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

/* -------------------------------------------------------------------------- */
/* Theme / design tokens                                                       */
/* -------------------------------------------------------------------------- */

const THEME = {
  brand: [21, 101, 192],      // Sunfeed blue
  brandDark: [13, 71, 161],
  accent: [255, 143, 0],      // orange accent
  ink: [33, 37, 41],          // near-black body text
  muted: [110, 110, 110],     // secondary text
  line: [210, 214, 220],      // hairlines
  zebra: [244, 247, 251],     // table zebra stripe
  headFill: [21, 101, 192],   // table header fill
  white: [255, 255, 255],
};

const MARGIN = 16;            // page side margin (mm)
const FONT = 'helvetica';

const COMPANY = {
  name: 'Sunfeed Ecosolutions India Pvt. Ltd.',
  tagline: 'Solar Energy Solutions',
  contact: 'www.sunfeed.in  |  info@sunfeed.in',
};

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

const formatDate = (dateString) => {
  if (!dateString) return '—';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '—';
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}/${date.getFullYear()}`;
};

const setFill = (doc, rgb) => doc.setFillColor(rgb[0], rgb[1], rgb[2]);
const setText = (doc, rgb) => doc.setTextColor(rgb[0], rgb[1], rgb[2]);
const setDraw = (doc, rgb) => doc.setDrawColor(rgb[0], rgb[1], rgb[2]);

/** Load and cache the Sunfeed logo as a data URL */
let cachedLogoDataUrl = null;
const loadSunfeedLogo = async () => {
  if (cachedLogoDataUrl) return cachedLogoDataUrl;
  try {
    const response = await fetch('/SUNFEED LOGO.png');
    const blob = await response.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        cachedLogoDataUrl = reader.result;
        resolve(cachedLogoDataUrl);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.warn('Failed to load Sunfeed logo:', error);
    return null;
  }
};

/**
 * Draw a branded letterhead at the top of the current page.
 * Returns the Y position where content can begin.
 */
const drawLetterhead = (doc, pageWidth, logoDataUrl) => {
  // Top brand bar
  setFill(doc, THEME.brand);
  doc.rect(0, 0, pageWidth, 3, 'F');

  // Logo
  let textX = MARGIN;
  if (logoDataUrl) {
    try {
      doc.addImage(logoDataUrl, 'PNG', MARGIN, 9, 34, 16);
      textX = MARGIN + 40;
    } catch (error) {
      console.warn('Failed to add logo to PDF:', error);
    }
  }

  // Company name + tagline
  doc.setFont(FONT, 'bold');
  doc.setFontSize(15);
  setText(doc, THEME.brandDark);
  doc.text(COMPANY.name, textX, 16);

  doc.setFont(FONT, 'normal');
  doc.setFontSize(9);
  setText(doc, THEME.muted);
  doc.text(COMPANY.tagline, textX, 21.5);

  doc.setFontSize(8);
  doc.text(COMPANY.contact, pageWidth - MARGIN, 16, { align: 'right' });

  // Divider under header
  setDraw(doc, THEME.line);
  doc.setLineWidth(0.4);
  doc.line(MARGIN, 28, pageWidth - MARGIN, 28);

  setText(doc, THEME.ink);
  return 28;
};

/**
 * Draw a centered document title with a format tag pill on the right.
 * Returns the Y position after the title block.
 */
const drawTitle = (doc, pageWidth, title, formatTag, startY) => {
  // Format tag pill (top-right) — drawn first, on its own line below the header.
  if (formatTag) {
    doc.setFont(FONT, 'bold');
    doc.setFontSize(9);
    const pillW = doc.getTextWidth(formatTag) + 10;
    const pillH = 7.5;
    const pillX = pageWidth - MARGIN - pillW;
    const pillY = startY + 5;
    setFill(doc, THEME.accent);
    doc.roundedRect(pillX, pillY, pillW, pillH, 1.8, 1.8, 'F');
    setText(doc, THEME.white);
    doc.text(formatTag, pillX + pillW / 2, pillY + pillH / 2 + 1.4, { align: 'center' });
  }

  // Title — placed below the pill so they never overlap.
  const y = startY + 20;
  doc.setFont(FONT, 'bold');
  doc.setFontSize(13);
  setText(doc, THEME.ink);
  const titleLines = doc.splitTextToSize(title.toUpperCase(), pageWidth - MARGIN * 2);
  doc.text(titleLines, pageWidth / 2, y, { align: 'center' });

  const afterTitle = y + titleLines.length * 6 + 2;

  // Accent underline centered under title
  const underlineW = 40;
  setDraw(doc, THEME.accent);
  doc.setLineWidth(0.8);
  doc.line(pageWidth / 2 - underlineW / 2, afterTitle, pageWidth / 2 + underlineW / 2, afterTitle);

  setText(doc, THEME.ink);
  return afterTitle + 8;
};

/** Draw footer with page number and confidentiality note on every page */
const drawFooters = (doc) => {
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const pw = doc.internal.pageSize.getWidth();
    const ph = doc.internal.pageSize.getHeight();

    setDraw(doc, THEME.line);
    doc.setLineWidth(0.3);
    doc.line(MARGIN, ph - 12, pw - MARGIN, ph - 12);

    doc.setFont(FONT, 'normal');
    doc.setFontSize(7.5);
    setText(doc, THEME.muted);
    doc.text(COMPANY.name, MARGIN, ph - 7);
    doc.text('This is a system-generated document.', pw / 2, ph - 7, { align: 'center' });
    doc.text(`Page ${i} of ${pageCount}`, pw - MARGIN, ph - 7, { align: 'right' });
  }
  setText(doc, THEME.ink);
};

/**
 * Draw a labelled info row with a dotted leader between label and value.
 * Returns the next Y position (handles multi-line values).
 */
const drawInfoRow = (doc, label, value, x, y, width, labelWidth = 60) => {
  const val = value === undefined || value === null || value === '' ? '—' : String(value);

  doc.setFont(FONT, 'normal');
  doc.setFontSize(10);
  setText(doc, THEME.muted);
  doc.text(label, x, y);

  doc.setFont(FONT, 'bold');
  setText(doc, THEME.ink);
  const valueX = x + labelWidth;
  const valueLines = doc.splitTextToSize(val, width - labelWidth);
  doc.text(valueLines, valueX, y);

  return y + Math.max(valueLines.length, 1) * 6 + 1.5;
};

/** Section sub-heading with a small accent bar */
const drawSectionLabel = (doc, text, x, y) => {
  setFill(doc, THEME.brand);
  doc.rect(x, y - 3.5, 2, 4.5, 'F');
  doc.setFont(FONT, 'bold');
  doc.setFontSize(10.5);
  setText(doc, THEME.brandDark);
  doc.text(text, x + 4, y);
  setText(doc, THEME.ink);
  return y + 6;
};

/** Draw a bordered certification box with justified text */
const drawCertBox = (doc, text, x, y, width) => {
  doc.setFont(FONT, 'normal');
  doc.setFontSize(9.5);
  const lines = doc.splitTextToSize(text, width - 10);
  const boxH = lines.length * 5.5 + 10;

  setFill(doc, THEME.zebra);
  setDraw(doc, THEME.line);
  doc.setLineWidth(0.4);
  doc.roundedRect(x, y, width, boxH, 2, 2, 'FD');

  setText(doc, THEME.ink);
  doc.text(lines, x + 5, y + 7, { lineHeightFactor: 1.4 });
  return y + boxH + 6;
};

/**
 * Draw a row of signature blocks near the bottom of a page.
 * signatures: [{ title, sub? }]
 */
const drawSignatures = (doc, signatures, pageWidth, pageHeight) => {
  const y = pageHeight - 34;
  const usable = pageWidth - MARGIN * 2;
  const slot = usable / signatures.length;

  doc.setFontSize(9);
  signatures.forEach((sig, idx) => {
    const cx = MARGIN + slot * idx + slot / 2;
    const lineW = Math.min(slot - 10, 55);

    setDraw(doc, THEME.ink);
    doc.setLineWidth(0.3);
    doc.line(cx - lineW / 2, y, cx + lineW / 2, y);

    doc.setFont(FONT, 'bold');
    setText(doc, THEME.ink);
    doc.text(sig.title, cx, y + 5, { align: 'center' });

    if (sig.sub) {
      doc.setFont(FONT, 'normal');
      setText(doc, THEME.muted);
      const subLines = doc.splitTextToSize(sig.sub, slot - 4);
      doc.text(subLines, cx, y + 10, { align: 'center' });
    }
  });
  setText(doc, THEME.ink);
};

/* -------------------------------------------------------------------------- */
/* Cover Letter                                                                */
/* -------------------------------------------------------------------------- */

const generateLetter = (doc, formData, pageWidth, pageHeight, logoDataUrl) => {
  const hasContent =
    formData.letterTo || formData.letterAddress || formData.letterSubject || formData.letterBody;
  if (!hasContent) return false;

  const startY = drawLetterhead(doc, pageWidth, logoDataUrl);
  const contentWidth = pageWidth - MARGIN * 2;
  let y = startY + 12;

  // Date (right aligned)
  doc.setFont(FONT, 'normal');
  doc.setFontSize(10);
  setText(doc, THEME.ink);
  doc.text(`Date: ${formatDate(new Date().toISOString())}`, pageWidth - MARGIN, y, { align: 'right' });
  y += 10;

  // To block
  doc.text('To,', MARGIN, y);
  y += 5.5;
  if (formData.letterTo) {
    doc.setFont(FONT, 'bold');
    const toLines = doc.splitTextToSize(formData.letterTo, contentWidth);
    doc.text(toLines, MARGIN, y);
    y += toLines.length * 5.5;
    doc.setFont(FONT, 'normal');
  }
  if (formData.letterAddress) {
    setText(doc, THEME.muted);
    const addrLines = doc.splitTextToSize(formData.letterAddress, contentWidth);
    doc.text(addrLines, MARGIN, y);
    y += addrLines.length * 5.5;
    setText(doc, THEME.ink);
  }
  y += 8;

  // Subject
  if (formData.letterSubject) {
    doc.setFont(FONT, 'bold');
    const subjLabel = 'Subject: ';
    doc.text(subjLabel, MARGIN, y);
    const labelW = doc.getTextWidth(subjLabel);
    const subjLines = doc.splitTextToSize(formData.letterSubject, contentWidth - labelW);
    doc.text(subjLines, MARGIN + labelW, y);
    y += subjLines.length * 5.5 + 6;
    // underline the subject line
    setDraw(doc, THEME.line);
    doc.setLineWidth(0.3);
    doc.line(MARGIN, y - 4, pageWidth - MARGIN, y - 4);
    doc.setFont(FONT, 'normal');
  }

  // Salutation
  doc.text('Respected Sir/Madam,', MARGIN, y);
  y += 9;

  // Body (justified)
  if (formData.letterBody) {
    doc.setFontSize(10);
    const bodyLines = doc.splitTextToSize(formData.letterBody, contentWidth);
    doc.text(bodyLines, MARGIN, y, { align: 'justify', maxWidth: contentWidth, lineHeightFactor: 1.6 });
    y += bodyLines.length * 6.2 + 10;
  }

  doc.text('Thanking you,', MARGIN, y);

  // Signature (bottom-right)
  const sigY = pageHeight - 45;
  doc.setFont(FONT, 'normal');
  doc.text('Yours faithfully,', pageWidth - MARGIN, sigY, { align: 'right' });
  doc.setFont(FONT, 'bold');
  doc.text(`For ${COMPANY.name}`, pageWidth - MARGIN, sigY + 16, { align: 'right' });
  doc.setFont(FONT, 'normal');
  setText(doc, THEME.muted);
  doc.text('Authorised Signatory', pageWidth - MARGIN, sigY + 21, { align: 'right' });
  setText(doc, THEME.ink);

  return true;
};

/* -------------------------------------------------------------------------- */
/* Format-II : Material Receipt                                                */
/* -------------------------------------------------------------------------- */

const generateFormatII = (doc, formData, pageWidth, pageHeight, logoDataUrl, addNewPage = false) => {
  if (addNewPage) doc.addPage('a4', 'portrait');

  const headerY = drawLetterhead(doc, pageWidth, logoDataUrl);
  let y = drawTitle(doc, pageWidth, 'Material Receipt of Solar Street Lighting System', 'Format-II', headerY);

  const width = pageWidth - MARGIN * 2;
  y += 2;

  y = drawInfoRow(doc, 'Name of the District', formData.district, MARGIN, y, width, 62);
  y = drawInfoRow(doc, 'Rate Contract No. & Date', formData.rateContractNo, MARGIN, y, width, 62);
  y = drawInfoRow(doc, 'Work Order No. & Date', formData.workOrderNo, MARGIN, y, width, 62);
  y = drawInfoRow(doc, 'No. of Systems', formData.systemsInThisJCR || '0', MARGIN, y, width, 62);
  y = drawInfoRow(doc, 'Pre-dispatch Inspection Date', formatDate(formData.preDispatchInspectionDate), MARGIN, y, width, 62);
  y = drawInfoRow(doc, 'Date of Receipt of Material', formatDate(formData.materialReceiptDate), MARGIN, y, width, 62);

  y += 6;
  const certText = `It is certified that duly inspected material of ${formData.systemsInThisJCR || '___'} no(s). of Solar Street Lighting Systems supplied by M/s ${formData.supplierName || '_________________'} have been received in good condition as per the specifications of the Rate Contract & DNIT.`;
  drawCertBox(doc, certText, MARGIN, y, width);

  drawSignatures(
    doc,
    [
      { title: 'Signature of the Supplier', sub: 'with Seal' },
      { title: 'Signature of PO / APO', sub: 'with Seal' },
    ],
    pageWidth,
    pageHeight
  );

  return y;
};

/* -------------------------------------------------------------------------- */
/* Format-III : JCR Summary                                                    */
/* -------------------------------------------------------------------------- */

const generateFormatIII = (doc, formData, pageWidth, pageHeight, logoDataUrl) => {
  doc.addPage('a4', 'portrait');

  const headerY = drawLetterhead(doc, pageWidth, logoDataUrl);
  let y = drawTitle(doc, pageWidth, 'Joint Commissioning Report (JCR)', 'Format-III', headerY);

  const width = pageWidth - MARGIN * 2;
  const lw = 72;

  y = drawSectionLabel(doc, 'Project Details', MARGIN, y + 1);
  y += 1;
  y = drawInfoRow(doc, 'Name of System', formData.systemName, MARGIN, y, width, lw);
  y = drawInfoRow(doc, 'Name of District', formData.district, MARGIN, y, width, lw);
  y = drawInfoRow(doc, 'Rate Contract No. & Date', formData.rateContractNo, MARGIN, y, width, lw);
  y = drawInfoRow(doc, 'Work Order No. & Date', formData.workOrderNo, MARGIN, y, width, lw);
  y = drawInfoRow(doc, 'Name & Address of Supplier', formData.supplierName, MARGIN, y, width, lw);

  y += 3;
  y = drawSectionLabel(doc, 'Commissioning Details', MARGIN, y);
  y += 1;
  y = drawInfoRow(doc, 'Total Work Order Qty (nos.)', formData.totalWorkOrderQty, MARGIN, y, width, lw);
  y = drawInfoRow(doc, 'Date of Supply of Material', formatDate(formData.materialSupplyDate), MARGIN, y, width, lw);
  y = drawInfoRow(doc, 'Systems Covered in this JCR', formData.systemsInThisJCR || '0', MARGIN, y, width, lw);
  y = drawInfoRow(doc, 'Installation & Commissioning', formatDate(formData.installationCompleteDate), MARGIN, y, width, lw);
  y = drawInfoRow(doc, 'Handing Over to Beneficiary', formatDate(formData.handoverDate), MARGIN, y, width, lw);
  y = drawInfoRow(doc, 'Site-wise List of Installations', 'ENCLOSED (Format-III(a))', MARGIN, y, width, lw);

  y += 5;
  const certText = `Certified that ${formData.systemsInThisJCR || '___'} no(s). of Solar Street Lighting Systems, in reference to Work Order No. ${formData.workOrderNo || '___________'} dated ${formatDate(formData.installationCompleteDate)}, have been installed and commissioned at the sites mentioned in the enclosed list, and these systems have been taken over by the beneficiary(s) in good working condition.`;
  y = drawCertBox(doc, certText, MARGIN, y, width);

  // Signatures (3 across) + countersign note
  drawSignatures(
    doc,
    [
      { title: 'Signature of Supplier', sub: 'Name:' },
      { title: 'Signature of User', sub: 'Name:' },
      { title: 'Signature of PO / APO', sub: 'Name:' },
    ],
    pageWidth,
    pageHeight
  );

  doc.setFont(FONT, 'normal');
  doc.setFontSize(8.5);
  setText(doc, THEME.muted);
  doc.text(
    'Countersigned by: Addl. Deputy Commissioner-cum-Chief Project Officer, PANCHKULA',
    pageWidth / 2,
    pageHeight - 15,
    { align: 'center' }
  );
  setText(doc, THEME.ink);

  return y;
};

/* -------------------------------------------------------------------------- */
/* Format-IV : Additional Certification & Compliance                           */
/* -------------------------------------------------------------------------- */

const generateFormatIV = (doc, formData, pageWidth, pageHeight, logoDataUrl) => {
  const hasContent =
    formData.certificationDate ||
    formData.inspectionOfficer ||
    formData.technicalSpecsCompliance ||
    formData.safetyStandardsCompliance ||
    formData.warrantyPeriod ||
    formData.maintenanceSchedule;
  if (!hasContent) return false;

  doc.addPage('a4', 'portrait');

  const headerY = drawLetterhead(doc, pageWidth, logoDataUrl);
  let y = drawTitle(doc, pageWidth, 'Additional Certification & Compliance', 'Format-IV', headerY);

  const width = pageWidth - MARGIN * 2;
  const lw = 78;

  y = drawSectionLabel(doc, 'Inspection Details', MARGIN, y + 1);
  y += 1;
  y = drawInfoRow(doc, 'Certification Date', formatDate(formData.certificationDate), MARGIN, y, width, lw);
  y = drawInfoRow(doc, 'Inspection Officer', formData.inspectionOfficer, MARGIN, y, width, lw);

  y += 3;
  y = drawSectionLabel(doc, 'Compliance', MARGIN, y);
  y += 1;
  y = drawInfoRow(doc, 'Technical Specifications', formData.technicalSpecsCompliance ? `${formData.technicalSpecsCompliance} - Compliant` : '—', MARGIN, y, width, lw);
  y = drawInfoRow(doc, 'Safety Standards', formData.safetyStandardsCompliance ? `${formData.safetyStandardsCompliance} - Compliant` : '—', MARGIN, y, width, lw);

  y += 3;
  y = drawSectionLabel(doc, 'Warranty & Maintenance', MARGIN, y);
  y += 1;
  y = drawInfoRow(doc, 'Warranty Period', formData.warrantyPeriod, MARGIN, y, width, lw);
  y = drawInfoRow(doc, 'Maintenance Schedule', formData.maintenanceSchedule, MARGIN, y, width, lw);

  y += 5;
  const certText = `Certified that the above Solar Street Lighting Systems comply with the applicable technical specifications and safety standards. The systems are covered under a warranty period of ${formData.warrantyPeriod || '___'} and shall be maintained ${formData.maintenanceSchedule || 'as per manufacturer guidelines'}.`;
  y = drawCertBox(doc, certText, MARGIN, y, width);

  drawSignatures(
    doc,
    [
      { title: 'Inspection Officer', sub: formData.inspectionOfficer || 'Name:' },
      { title: `For ${COMPANY.name}`, sub: 'Authorised Signatory' },
    ],
    pageWidth,
    pageHeight
  );

  return y;
};

/* -------------------------------------------------------------------------- */
/* Format-III(a) : Site-wise Installation List (landscape)                     */
/* -------------------------------------------------------------------------- */

const generateFormatIIIa = (doc, formData, logoDataUrl) => {
  doc.addPage('a4', 'landscape');
  const pageWidth = doc.internal.pageSize.getWidth();

  const headerY = drawLetterhead(doc, pageWidth, logoDataUrl);
  let y = drawTitle(doc, pageWidth, 'Site-wise List of Installations', 'Format-III(a)', headerY);

  const width = pageWidth - MARGIN * 2;
  const colW = width / 2;

  // Two-column meta block
  const leftX = MARGIN;
  const rightX = MARGIN + colW;
  let ly = y;
  let ry = y;

  ly = drawInfoRow(doc, 'District', formData.district, leftX, ly, colW - 6, 40);
  ly = drawInfoRow(doc, 'Work Order', formData.workOrderNo, leftX, ly, colW - 6, 40);
  ly = drawInfoRow(doc, 'Supplier', formData.supplierName, leftX, ly, colW - 6, 40);

  ry = drawInfoRow(doc, 'Year', formData.year, rightX, ry, colW - 6, 40);
  ry = drawInfoRow(doc, 'Module', `${formData.moduleMake || '—'} (${formData.moduleCapacity || '—'} Wp)`, rightX, ry, colW - 6, 40);
  ry = drawInfoRow(doc, 'Luminaire', `${formData.luminaireMake || '—'} (${formData.luminaireCapacity || '—'} W)`, rightX, ry, colW - 6, 40);
  ry = drawInfoRow(doc, 'Battery', `${formData.batteryMake || '—'} (${formData.batteryCapacity || '—'} Wh)`, rightX, ry, colW - 6, 40);

  y = Math.max(ly, ry) + 4;

  const tableData = (formData.installations || []).map((inst) => [
    inst.serialNo,
    inst.beneficiaryName || '',
    inst.latitude || '',
    inst.longitude || '',
    inst.villageGramPanchayat || '',
    inst.block || '',
    inst.assemblyConstituency || '',
    formatDate(inst.commissioningDate),
    inst.moduleSerialNo || '',
    inst.batterySerialNo || '',
    inst.luminaireSerialNo || '',
    inst.rms || 'YES',
  ]);

  autoTable(doc, {
    startY: y,
    head: [[
      'S.No.', 'Name / Location', 'Latitude', 'Longitude', 'Village / GP', 'Block',
      'Assembly', 'Comm. Date', 'Module S/N', 'Battery S/N', 'Luminaire S/N', 'RMS',
    ]],
    body: tableData,
    theme: 'grid',
    styles: {
      font: FONT,
      fontSize: 7.5,
      cellPadding: 2.2,
      overflow: 'linebreak',
      textColor: THEME.ink,
      lineColor: THEME.line,
      lineWidth: 0.2,
      valign: 'middle',
    },
    headStyles: {
      fillColor: THEME.headFill,
      textColor: THEME.white,
      fontStyle: 'bold',
      halign: 'center',
      fontSize: 7.5,
    },
    alternateRowStyles: { fillColor: THEME.zebra },
    columnStyles: {
      0: { cellWidth: 12, halign: 'center' },
      1: { cellWidth: 32 },
      2: { cellWidth: 20, halign: 'center' },
      3: { cellWidth: 20, halign: 'center' },
      4: { cellWidth: 26 },
      5: { cellWidth: 22 },
      6: { cellWidth: 24 },
      7: { cellWidth: 20, halign: 'center' },
      8: { cellWidth: 26 },
      9: { cellWidth: 26 },
      10: { cellWidth: 28 },
      11: { cellWidth: 12, halign: 'center' },
    },
    margin: { left: MARGIN, right: MARGIN, bottom: 22 },
  });

  const pageHeight = doc.internal.pageSize.getHeight();
  let finalY = (doc.lastAutoTable?.finalY || y) + 14;
  if (finalY > pageHeight - 30) finalY = pageHeight - 30;

  drawSignatures(
    doc,
    [
      { title: `For ${COMPANY.name}`, sub: 'Director / Auth. Signatory' },
      { title: 'Signature of User', sub: 'Name:' },
      { title: 'Signature of PO / APO', sub: 'Name:' },
    ],
    pageWidth,
    pageHeight
  );

  return finalY;
};

/* -------------------------------------------------------------------------- */
/* Orchestration                                                               */
/* -------------------------------------------------------------------------- */

const buildDocument = (doc, formData, logoDataUrl) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const letterAdded = generateLetter(doc, formData, pageWidth, pageHeight, logoDataUrl);
  generateFormatII(doc, formData, pageWidth, pageHeight, logoDataUrl, letterAdded);
  generateFormatIII(doc, formData, pageWidth, pageHeight, logoDataUrl);
  generateFormatIV(doc, formData, pageWidth, pageHeight, logoDataUrl);
  generateFormatIIIa(doc, formData, logoDataUrl);

  drawFooters(doc);
};

/** Generate and download the complete JCR PDF */
export const generateJCRPDF = async (formData) => {
  try {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const logoDataUrl = await loadSunfeedLogo();

    buildDocument(doc, formData, logoDataUrl);

    const timestamp = new Date().toISOString().split('T')[0];
    const workOrderShort = (formData.workOrderNo || 'JCR')
      .replace(/[^a-zA-Z0-9]/g, '_')
      .substring(0, 20);
    const filename = `JCR_${workOrderShort}_${timestamp}.pdf`;

    doc.save(filename);
    return { success: true, filename };
  } catch (error) {
    console.error('Error generating PDF:', error);
    return { success: false, error: error.message };
  }
};

/** Generate a preview blob URL for the complete JCR PDF */
export const generateJCRPreview = async (formData) => {
  try {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const logoDataUrl = await loadSunfeedLogo();

    buildDocument(doc, formData, logoDataUrl);

    const blob = doc.output('blob');
    const url = URL.createObjectURL(blob);
    return { success: true, url };
  } catch (error) {
    console.error('Error generating preview:', error);
    return { success: false, error: error.message };
  }
};
