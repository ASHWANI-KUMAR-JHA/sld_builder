import { useState, useEffect } from 'react';
import { X, FileImage, FileText } from 'lucide-react';

function ExportPreview({ svgElement, onClose, onExportPNG, onExportPDF }) {
  const [previewUrl, setPreviewUrl] = useState(null);
  const [loading, setLoading] = useState(!!svgElement);

  useEffect(() => {
    if (!svgElement) return;

    let cancelled = false;
    const clone = svgElement.cloneNode(true);
    const rect = svgElement.getBoundingClientRect();
    clone.setAttribute('width', rect.width);
    clone.setAttribute('height', rect.height);
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

    // Add white background
    const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bgRect.setAttribute('width', '100%');
    bgRect.setAttribute('height', '100%');
    bgRect.setAttribute('fill', 'white');
    clone.insertBefore(bgRect, clone.firstChild);

    // Inline styles
    const styleEl = document.createElementNS('http://www.w3.org/2000/svg', 'style');
    styleEl.textContent = `
      .builder-node { fill: white; stroke: #d1d5db; stroke-width: 1.5; }
      .builder-node.selected { stroke: #1a56db; stroke-width: 2.5; }
      .builder-node-label { font-size: 11px; font-weight: 500; fill: #374151; font-family: Inter, sans-serif; }
      .builder-connection-label { font-size: 10px; fill: #4b5563; font-weight: 500; font-family: Inter, sans-serif; }
      .builder-port { fill: white; stroke: #9ca3af; stroke-width: 2; }
      .builder-port-label { font-size: 8px; fill: #9ca3af; font-family: Inter, sans-serif; }
      .builder-node-delete, .builder-resize-handle { display: none; }
    `;
    clone.insertBefore(styleEl, clone.firstChild.nextSibling);

    const svgData = new XMLSerializer().serializeToString(clone);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    const img = new Image();
    img.onload = async () => {
      if (cancelled) { URL.revokeObjectURL(url); return; }
      const canvas = document.createElement('canvas');
      const scale = 2;
      canvas.width = img.naturalWidth * scale;
      canvas.height = img.naturalHeight * scale;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.scale(scale, scale);
      ctx.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight);

      const dataUrl = canvas.toDataURL('image/png');
      if (!cancelled) {
        setPreviewUrl(dataUrl);
        setLoading(false);
      }
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      if (!cancelled) setLoading(false);
      URL.revokeObjectURL(url);
    };
    img.src = url;

    return () => { cancelled = true; };
  }, [svgElement]);

  return (
    <div className="export-preview-overlay" onClick={onClose}>
      <div className="export-preview-modal" onClick={e => e.stopPropagation()}>
        <div className="export-preview-header">
          <h3>Export Preview</h3>
          <button className="export-preview-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="export-preview-body">
          {loading ? (
            <div className="export-preview-loading">Generating preview...</div>
          ) : previewUrl ? (
            <img
              src={previewUrl}
              alt="Export Preview"
              className="export-preview-image"
            />
          ) : (
            <div className="export-preview-loading">Failed to generate preview</div>
          )}
        </div>
        <div className="export-preview-footer">
          <button
            className="export-preview-btn export-preview-btn-png"
            onClick={onExportPNG}
            disabled={loading}
          >
            <FileImage size={14} />
            Download PNG
          </button>
          <button
            className="export-preview-btn export-preview-btn-pdf"
            onClick={onExportPDF}
            disabled={loading}
          >
            <FileText size={14} />
            Download PDF
          </button>
        </div>
      </div>
    </div>
  );
}

export default ExportPreview;
