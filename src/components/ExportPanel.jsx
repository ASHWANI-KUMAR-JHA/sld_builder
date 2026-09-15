import { useState } from 'react';
import { X, FileImage, FileText, Download } from 'lucide-react';
import './ExportPanel.css';

function ExportPanel({ formData, derivedValues, onClose }) {
  const [exporting, setExporting] = useState(false);
  const [paperSize, setPaperSize] = useState('a4');
  const [orientation, setOrientation] = useState('landscape');

  const getSvgElement = () => {
    return document.querySelector('.sld-svg');
  };

  const prepareSvgForExport = (svgElement) => {
    // Clone the SVG so we don't mutate the DOM
    const clone = svgElement.cloneNode(true);

    // Inline all computed styles onto SVG elements so the export captures them
    const inlineStyles = (original, cloned) => {
      const originalChildren = original.children;
      const clonedChildren = cloned.children;

      const computedStyle = window.getComputedStyle(original);

      // For SVG elements, inline key properties
      if (original instanceof SVGElement) {
        const importantProps = [
          'fill', 'stroke', 'stroke-width', 'stroke-dasharray',
          'font-family', 'font-size', 'font-weight', 'opacity',
          'text-anchor', 'dominant-baseline'
        ];
        importantProps.forEach(prop => {
          const value = computedStyle.getPropertyValue(prop);
          if (value && value !== '' && value !== 'none' && value !== 'normal') {
            cloned.style.setProperty(prop, value);
          }
        });
      }

      for (let i = 0; i < originalChildren.length; i++) {
        inlineStyles(originalChildren[i], clonedChildren[i]);
      }
    };

    inlineStyles(svgElement, clone);

    // Add a white background rect as the first child so export has white bg
    const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bgRect.setAttribute('width', '100%');
    bgRect.setAttribute('height', '100%');
    bgRect.setAttribute('fill', 'white');
    clone.insertBefore(bgRect, clone.firstChild);

    // Set explicit width/height for proper rendering in <img>
    const viewBox = clone.getAttribute('viewBox');
    if (viewBox) {
      const parts = viewBox.split(' ');
      clone.setAttribute('width', parts[2]);
      clone.setAttribute('height', parts[3]);
    }

    return clone;
  };

  const loadImage = (src) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = src;
    });
  };

  const exportAsPNG = async () => {
    setExporting(true);
    try {
      const svgElement = getSvgElement();
      if (!svgElement) {
        alert('Please switch to the "SLD Diagram" tab first, then export.');
        setExporting(false);
        return;
      }

      const clone = prepareSvgForExport(svgElement);
      const svgData = new XMLSerializer().serializeToString(clone);
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);

      // Load all images in parallel
      const [svgImg, logoImg, addressImg] = await Promise.all([
        loadImage(url),
        loadImage('/SUNFEED LOGO.png'),
        loadImage('/ADDRESS.png'),
      ]);

      if (!svgImg) {
        console.error('Failed to load SVG as image');
        setExporting(false);
        URL.revokeObjectURL(url);
        return;
      }

      const scale = 3;
      const logoHeight = 40;
      const logoWidth = logoImg ? (logoImg.naturalWidth / logoImg.naturalHeight) * logoHeight : 0;
      const addressHeight = 36;
      const addressWidth = addressImg ? (addressImg.naturalWidth / addressImg.naturalHeight) * addressHeight : 0;

      const headerSpace = logoImg ? logoHeight + 16 : 0;
      const footerSpace = addressImg ? addressHeight + 16 : 0;

      const totalWidth = svgImg.naturalWidth;
      const totalHeight = svgImg.naturalHeight + headerSpace + footerSpace;

      const canvas = document.createElement('canvas');
      canvas.width = totalWidth * scale;
      canvas.height = totalHeight * scale;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.scale(scale, scale);

      // Draw logo at top-left
      if (logoImg) {
        ctx.drawImage(logoImg, 10, 8, logoWidth, logoHeight);
      }

      // Draw SVG diagram below header
      ctx.drawImage(svgImg, 0, headerSpace, svgImg.naturalWidth, svgImg.naturalHeight);

      // Draw address/footer at bottom center
      if (addressImg) {
        const footerX = (totalWidth - addressWidth) / 2;
        const footerY = headerSpace + svgImg.naturalHeight + 8;
        ctx.drawImage(addressImg, footerX, footerY, addressWidth, addressHeight);
      }

      canvas.toBlob((blob) => {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${formData.companyName}_SLD_${derivedValues.totalKWP}KWP.png`;
        link.click();
        URL.revokeObjectURL(link.href);
        setExporting(false);
      }, 'image/png');

      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export error:', err);
      setExporting(false);
    }
  };

  const exportAsPDF = async () => {
    setExporting(true);
    try {
      const { jsPDF } = await import('jspdf');

      const svgElement = getSvgElement();
      if (!svgElement) {
        alert('Please switch to the "SLD Diagram" tab first, then export.');
        setExporting(false);
        return;
      }

      const clone = prepareSvgForExport(svgElement);
      const svgData = new XMLSerializer().serializeToString(clone);
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);

      // Load all images in parallel
      const [svgImg, logoImg, addressImg] = await Promise.all([
        loadImage(url),
        loadImage('/SUNFEED LOGO.png'),
        loadImage('/ADDRESS.png'),
      ]);

      if (!svgImg) {
        console.error('Failed to load SVG as image');
        setExporting(false);
        URL.revokeObjectURL(url);
        return;
      }

      const scale = 3;
      const logoHeight = 40;
      const logoWidth = logoImg ? (logoImg.naturalWidth / logoImg.naturalHeight) * logoHeight : 0;
      const addressHeight = 36;
      const addressWidth = addressImg ? (addressImg.naturalWidth / addressImg.naturalHeight) * addressHeight : 0;

      const headerSpace = logoImg ? logoHeight + 16 : 0;
      const footerSpace = addressImg ? addressHeight + 16 : 0;

      const totalWidth = svgImg.naturalWidth;
      const totalHeight = svgImg.naturalHeight + headerSpace + footerSpace;

      const canvas = document.createElement('canvas');
      canvas.width = totalWidth * scale;
      canvas.height = totalHeight * scale;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.scale(scale, scale);

      // Draw logo at top-left
      if (logoImg) {
        ctx.drawImage(logoImg, 10, 8, logoWidth, logoHeight);
      }

      // Draw SVG diagram below header
      ctx.drawImage(svgImg, 0, headerSpace, svgImg.naturalWidth, svgImg.naturalHeight);

      // Draw address/footer at bottom center
      if (addressImg) {
        const footerX = (totalWidth - addressWidth) / 2;
        const footerY = headerSpace + svgImg.naturalHeight + 8;
        ctx.drawImage(addressImg, footerX, footerY, addressWidth, addressHeight);
      }

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: orientation,
        unit: 'mm',
        format: paperSize,
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const availWidth = pdfWidth - margin * 2;
      const availHeight = pdfHeight - margin * 2;

      const imgAspect = canvas.width / canvas.height;
      let drawWidth = availWidth;
      let drawHeight = drawWidth / imgAspect;

      if (drawHeight > availHeight) {
        drawHeight = availHeight;
        drawWidth = drawHeight * imgAspect;
      }

      const xOffset = (pdfWidth - drawWidth) / 2;
      const yOffset = (pdfHeight - drawHeight) / 2;

      pdf.addImage(imgData, 'PNG', xOffset, yOffset, drawWidth, drawHeight);

      pdf.save(`${formData.companyName}_SLD_${derivedValues.totalKWP}KWP.pdf`);

      URL.revokeObjectURL(url);
      setExporting(false);
    } catch (err) {
      console.error('Export error:', err);
      setExporting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal export-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Export Diagram</h2>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          <div className="export-options">
            <div className="export-option-group">
              <label>Paper Size</label>
              <select value={paperSize} onChange={e => setPaperSize(e.target.value)}>
                <option value="a4">A4</option>
                <option value="a3">A3</option>
                <option value="letter">Letter</option>
                <option value="legal">Legal</option>
              </select>
            </div>
            <div className="export-option-group">
              <label>Orientation</label>
              <select value={orientation} onChange={e => setOrientation(e.target.value)}>
                <option value="landscape">Landscape</option>
                <option value="portrait">Portrait</option>
              </select>
            </div>
          </div>

          <div className="export-buttons">
            <button className="export-btn" onClick={exportAsPNG} disabled={exporting}>
              <FileImage size={24} />
              <div>
                <span className="export-btn-title">Export as PNG</span>
                <span className="export-btn-desc">High-resolution image (3x scale)</span>
              </div>
              <Download size={16} className="export-download-icon" />
            </button>

            <button className="export-btn" onClick={exportAsPDF} disabled={exporting}>
              <FileText size={24} />
              <div>
                <span className="export-btn-title">Export as PDF</span>
                <span className="export-btn-desc">Print-ready document ({paperSize.toUpperCase()} {orientation})</span>
              </div>
              <Download size={16} className="export-download-icon" />
            </button>
          </div>

          {exporting && (
            <div className="export-progress">
              <div className="spinner"></div>
              <span>Generating export...</span>
            </div>
          )}

          <p className="export-note">
            Tip: Switch to the "SLD Diagram" tab before exporting for best results.
          </p>
        </div>
      </div>
    </div>
  );
}

export default ExportPanel;
