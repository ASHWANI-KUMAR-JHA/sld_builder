/**
 * JCR PDF Generator
 * Generates PDF documents matching government JCR formats (Format-II, Format-III, Format-III(a))
 */

import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

/**
 * Format date to DD/MM/YYYY
 */
const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

/**
 * Add header to page
 */
const addHeader = (doc, title, formatNumber, pageWidth) => {
  // Add format number in top right
  doc.setFontSize(9);
  doc.setFont(undefined, 'italic');
  doc.text(formatNumber, pageWidth - 15, 15, { align: 'right' });
  
  // Add title
  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  doc.text(title, pageWidth / 2, 25, { align: 'center' });
  
  return 35; // Return Y position after header
};

/**
 * Generate Format-II: Material Receipt
 */
const generateFormatII = (doc, formData, pageWidth, pageHeight) => {
  let yPos = addHeader(doc, 'MATERIAL RECEIPT OF SOLAR STREET LIGHTING SYSTEM', 'Format-II', pageWidth);
  
  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  
  const leftMargin = 15;
  const lineHeight = 8;
  
  // District
  doc.text('Name of the district:', leftMargin, yPos);
  doc.setFont(undefined, 'bold');
  doc.text(formData.district || '', leftMargin + 50, yPos);
  doc.setFont(undefined, 'normal');
  yPos += lineHeight;
  
  // Rate Contract No
  doc.text('Rate Contract No. & date:', leftMargin, yPos);
  doc.setFont(undefined, 'bold');
  doc.text(formData.rateContractNo || '', leftMargin + 55, yPos);
  doc.setFont(undefined, 'normal');
  yPos += lineHeight;
  
  // Work Order No
  doc.text('Work Order No. & date:', leftMargin, yPos);
  doc.setFont(undefined, 'bold');
  doc.text(formData.workOrderNo || '', leftMargin + 55, yPos);
  doc.setFont(undefined, 'normal');
  yPos += lineHeight;
  
  // No. of Systems
  doc.text('No. of Systems:', leftMargin, yPos);
  doc.setFont(undefined, 'bold');
  doc.text(formData.systemsInThisJCR || '0', leftMargin + 40, yPos);
  doc.setFont(undefined, 'normal');
  yPos += lineHeight;
  
  // Pre-dispatch inspection date
  doc.text('Date of pre-dispatch inspection of material:', leftMargin, yPos);
  doc.setFont(undefined, 'bold');
  doc.text(formatDate(formData.preDispatchInspectionDate), leftMargin + 95, yPos);
  doc.setFont(undefined, 'normal');
  yPos += lineHeight;
  
  // Receipt date
  doc.text('Date of receipt of material:', leftMargin, yPos);
  doc.setFont(undefined, 'bold');
  doc.text(formatDate(formData.materialReceiptDate), leftMargin + 65, yPos);
  doc.setFont(undefined, 'normal');
  yPos += lineHeight * 2;
  
  // Certification text
  doc.setFontSize(9);
  const certText = `It is certified that duly inspected material of ${formData.systemsInThisJCR || '___'} nos. of Solar Street Lighting Systems supplied by M/s ${formData.supplierName || '_________________'} have been received in good condition as per the specifications of the Rate Contract & DNIT.`;
  const lines = doc.splitTextToSize(certText, pageWidth - 30);
  doc.text(lines, leftMargin, yPos);
  yPos += lines.length * 6 + 15;
  
  // Signatures
  doc.setFontSize(10);
  const sigY = pageHeight - 40;
  doc.text('Signature of the supplier', leftMargin, sigY);
  doc.text('Signature of PO/APO', pageWidth / 2 - 20, sigY);
  doc.text('with Seal', leftMargin, sigY + 6);
  doc.text('with Seal', pageWidth / 2 - 20, sigY + 6);
  
  return yPos;
};

/**
 * Generate Format-III: Joint Commissioning Report Summary
 */
const generateFormatIII = (doc, formData, pageWidth, pageHeight) => {
  doc.addPage();
  
  let yPos = addHeader(doc, 'FORMAT OF JOINT COMMISSIONING REPORT (JCR)', 'Format-III', pageWidth);
  
  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  
  const leftMargin = 15;
  const lineHeight = 8;
  
  // System Name
  doc.text('Name of System:', leftMargin, yPos);
  doc.setFont(undefined, 'bold');
  doc.text(formData.systemName || '', leftMargin + 45, yPos);
  doc.setFont(undefined, 'normal');
  yPos += lineHeight;
  
  // District
  doc.text('Name of District:', leftMargin, yPos);
  doc.setFont(undefined, 'bold');
  doc.text(formData.district || '', leftMargin + 45, yPos);
  doc.setFont(undefined, 'normal');
  yPos += lineHeight;
  
  // Rate Contract
  doc.text('Rate Contract No. & date:', leftMargin, yPos);
  doc.setFont(undefined, 'bold');
  const rcLines = doc.splitTextToSize(formData.rateContractNo || '', pageWidth - leftMargin - 60);
  doc.text(rcLines, leftMargin + 60, yPos);
  doc.setFont(undefined, 'normal');
  yPos += rcLines.length * lineHeight;
  
  // Work Order
  doc.text('Work Order No. & date:', leftMargin, yPos);
  doc.setFont(undefined, 'bold');
  const woLines = doc.splitTextToSize(formData.workOrderNo || '', pageWidth - leftMargin - 60);
  doc.text(woLines, leftMargin + 60, yPos);
  doc.setFont(undefined, 'normal');
  yPos += woLines.length * lineHeight;
  
  // Supplier
  doc.text('Name & address of Supplier:', leftMargin, yPos);
  doc.setFont(undefined, 'bold');
  const supplierLines = doc.splitTextToSize(formData.supplierName || '', pageWidth - leftMargin - 70);
  doc.text(supplierLines, leftMargin + 70, yPos);
  doc.setFont(undefined, 'normal');
  yPos += supplierLines.length * lineHeight + 2;
  
  // Total Work Order Quantity
  doc.text('Total Work Order Quantity (nos.):', leftMargin, yPos);
  doc.setFont(undefined, 'bold');
  doc.text(formData.totalWorkOrderQty || '', leftMargin + 80, yPos);
  doc.setFont(undefined, 'normal');
  yPos += lineHeight;
  
  // Date of Supply
  doc.text('Date of Supply of Material by the firm:', leftMargin, yPos);
  doc.setFont(undefined, 'bold');
  doc.text(formatDate(formData.materialSupplyDate), leftMargin + 95, yPos);
  doc.setFont(undefined, 'normal');
  yPos += lineHeight;
  
  // No. of systems in this JCR
  doc.text('No. of systems covered under this JCR (nos.):', leftMargin, yPos);
  doc.setFont(undefined, 'bold');
  doc.text(formData.systemsInThisJCR || '0', leftMargin + 110, yPos);
  doc.setFont(undefined, 'normal');
  yPos += lineHeight;
  
  // Installation complete date
  doc.text('Date of complete installation and commissioning:', leftMargin, yPos);
  doc.setFont(undefined, 'bold');
  doc.text(formatDate(formData.installationCompleteDate), leftMargin + 115, yPos);
  doc.setFont(undefined, 'normal');
  yPos += lineHeight;
  
  // Handover date
  doc.text('Date of Handing over the system(s) to the beneficiary:', leftMargin, yPos);
  doc.setFont(undefined, 'bold');
  doc.text(formatDate(formData.handoverDate), leftMargin + 125, yPos);
  doc.setFont(undefined, 'normal');
  yPos += lineHeight * 2;
  
  // Site-wise list reference
  doc.setFontSize(9);
  doc.text('Site-wise list of installations:', leftMargin, yPos);
  doc.setFont(undefined, 'bold');
  doc.text('LIST ATTACHED', leftMargin + 60, yPos);
  doc.setFont(undefined, 'normal');
  yPos += lineHeight * 2;
  
  // Certification text
  const certLines = doc.splitTextToSize(
    `Certified that ${formData.systemsInThisJCR || '___'} nos. of Solar Street Lighting Systems in reference to work order no. ${formData.workOrderNo || '___________'} dated ${formatDate(formData.installationCompleteDate)} have been installed and commissioned at the plant on mentioned in the enclosed list & these systems have been taken over by beneficiary(s) in good working condition.`,
    pageWidth - 30
  );
  doc.text(certLines, leftMargin, yPos);
  yPos += certLines.length * 6 + 15;
  
  // Signatures
  const sigY = pageHeight - 50;
  doc.setFontSize(10);
  doc.text('Signature of Supplier', leftMargin, sigY);
  doc.text('Signature of user', leftMargin + 70, sigY);
  doc.text('Signature of PO/APO', leftMargin + 140, sigY);
  doc.text('Name:', leftMargin, sigY + 8);
  doc.text('Name:', leftMargin + 70, sigY + 8);
  doc.text('Name:', leftMargin + 140, sigY + 8);
  
  // Countersign
  doc.text('Countersigned by', leftMargin, sigY + 20);
  doc.text('Addl. Deputy Commissioner-cum-', leftMargin, sigY + 26);
  doc.text('Chief Project Officer, PANCHKULA', leftMargin, sigY + 32);
  
  return yPos;
};

/**
 * Generate Format-III(a): Site-wise Installation List
 */
const generateFormatIIIa = (doc, formData, pageWidth, pageHeight) => {
  doc.addPage();
  
  let yPos = addHeader(doc, 'Site-wise list of installations of Solar Street Lighting Systems', 'Format-III(a)', pageWidth);
  
  doc.setFontSize(9);
  doc.setFont(undefined, 'normal');
  
  const leftMargin = 10;
  
  // Header information
  doc.text(`District: ${formData.district || ''}`, leftMargin, yPos);
  doc.text(`Year: ${formData.year || ''}`, pageWidth - 40, yPos);
  yPos += 6;
  
  doc.text(`Work Order No. & date: ${formData.workOrderNo || ''}`, leftMargin, yPos);
  yPos += 6;
  
  doc.text(`Name & address of Supplier: ${formData.supplierName || ''}`, leftMargin, yPos);
  yPos += 6;
  
  // Equipment specs
  doc.text(`Make of Module: ${formData.moduleMake || ''}`, leftMargin, yPos);
  doc.text(`Capacity of PV Module: ${formData.moduleCapacity || ''} Wp`, leftMargin + 80, yPos);
  yPos += 6;
  
  doc.text(`Make of Luminaire: ${formData.luminaireMake || ''}`, leftMargin, yPos);
  doc.text(`Capacity of Luminaire: ${formData.luminaireCapacity || ''} W`, leftMargin + 80, yPos);
  yPos += 6;
  
  doc.text(`Make of battery: ${formData.batteryMake || ''}`, leftMargin, yPos);
  doc.text(`Capacity of battery: ${formData.batteryCapacity || ''} Wh`, leftMargin + 80, yPos);
  yPos += 10;
  
  // Installation table
  const tableData = formData.installations.map((inst) => [
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
  
  doc.autoTable({
    startY: yPos,
    head: [[
      'S.No.',
      'Name/Location',
      'Lat',
      'Long',
      'Village/GP',
      'Block',
      'Assembly',
      'Comm. Date',
      'Module S/N',
      'Battery S/N',
      'Luminaire S/N',
      'RMS',
    ]],
    body: tableData,
    theme: 'grid',
    styles: {
      fontSize: 7,
      cellPadding: 2,
      overflow: 'linebreak',
    },
    headStyles: {
      fillColor: [230, 230, 230],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      halign: 'center',
    },
    columnStyles: {
      0: { cellWidth: 12, halign: 'center' }, // S.No
      1: { cellWidth: 30 }, // Name
      2: { cellWidth: 18 }, // Lat
      3: { cellWidth: 18 }, // Long
      4: { cellWidth: 22 }, // Village
      5: { cellWidth: 18 }, // Block
      6: { cellWidth: 20 }, // Assembly
      7: { cellWidth: 18 }, // Date
      8: { cellWidth: 22 }, // Module S/N
      9: { cellWidth: 22 }, // Battery S/N
      10: { cellWidth: 24 }, // Luminaire S/N
      11: { cellWidth: 12, halign: 'center' }, // RMS
    },
    margin: { left: leftMargin, right: leftMargin },
  });
  
  // Signatures at bottom
  const finalY = doc.lastAutoTable.finalY + 15;
  doc.setFontSize(9);
  doc.text('For Sunfeed Ecosolutions India Pvt Ltd', leftMargin, finalY);
  doc.text('Signature of user', leftMargin + 80, finalY);
  doc.text('Signature of PO/APO', leftMargin + 140, finalY);
  doc.text('Director/Auth. Signatory', leftMargin, finalY + 6);
  
  return finalY;
};

/**
 * Main function to generate complete JCR PDF
 */
export const generateJCRPDF = (formData) => {
  try {
    // Create PDF document
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });
    
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    // Generate Format-II (Material Receipt)
    generateFormatII(doc, formData, pageWidth, pageHeight);
    
    // Generate Format-III (JCR Summary)
    generateFormatIII(doc, formData, pageWidth, pageHeight);
    
    // Generate Format-III(a) (Installation List)
    generateFormatIIIa(doc, formData, pageWidth, pageHeight);
    
    // Generate filename
    const timestamp = new Date().toISOString().split('T')[0];
    const workOrderShort = (formData.workOrderNo || 'JCR').replace(/[^a-zA-Z0-9]/g, '_').substring(0, 20);
    const filename = `JCR_${workOrderShort}_${timestamp}.pdf`;
    
    // Save the PDF
    doc.save(filename);
    
    return { success: true, filename };
  } catch (error) {
    console.error('Error generating PDF:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Generate preview (returns blob URL for preview)
 */
export const generateJCRPreview = (formData) => {
  try {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });
    
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    generateFormatII(doc, formData, pageWidth, pageHeight);
    generateFormatIII(doc, formData, pageWidth, pageHeight);
    generateFormatIIIa(doc, formData, pageWidth, pageHeight);
    
    const blob = doc.output('blob');
    const url = URL.createObjectURL(blob);
    
    return { success: true, url };
  } catch (error) {
    console.error('Error generating preview:', error);
    return { success: false, error: error.message };
  }
};
