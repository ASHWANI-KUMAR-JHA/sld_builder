import { useState, useRef, useCallback } from 'react';
import { PDFDocument } from 'pdf-lib';
import { ArrowLeft, Upload, Trash2, GripVertical, Download, Eye, ChevronUp, ChevronDown, LogOut, FileText, Plus } from 'lucide-react';
import Logo from './Logo';
import './MergePDF.css';

function MergePDF({ onBack, onLogout }) {
  const [files, setFiles] = useState([]);
  const [mergedPdfUrl, setMergedPdfUrl] = useState(null);
  const [mergedPdfBlob, setMergedPdfBlob] = useState(null);
  const [isMerging, setIsMerging] = useState(false);
  const [error, setError] = useState('');
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [draggedIndex, setDraggedIndex] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileSelect = useCallback((e) => {
    const selectedFiles = Array.from(e.target.files);
    const pdfFiles = selectedFiles.filter(f => f.type === 'application/pdf');

    if (pdfFiles.length !== selectedFiles.length) {
      setError('Some files were skipped. Only PDF files are accepted.');
    } else {
      setError('');
    }

    const newFiles = pdfFiles.map(file => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      file,
      name: file.name,
      size: file.size,
    }));

    setFiles(prev => [...prev, ...newFiles]);
    setMergedPdfUrl(null);
    setMergedPdfBlob(null);
    e.target.value = '';
  }, []);

  const removeFile = useCallback((id) => {
    setFiles(prev => prev.filter(f => f.id !== id));
    setMergedPdfUrl(null);
    setMergedPdfBlob(null);
  }, []);

  const moveFile = useCallback((index, direction) => {
    setFiles(prev => {
      const newFiles = [...prev];
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= newFiles.length) return prev;
      [newFiles[index], newFiles[targetIndex]] = [newFiles[targetIndex], newFiles[index]];
      return newFiles;
    });
    setMergedPdfUrl(null);
    setMergedPdfBlob(null);
  }, []);

  // Drag and drop reordering
  const handleDragStart = useCallback((e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleDragOver = useCallback((e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  }, []);

  const handleDrop = useCallback((e, dropIndex) => {
    e.preventDefault();
    setDragOverIndex(null);
    if (draggedIndex === null || draggedIndex === dropIndex) return;

    setFiles(prev => {
      const newFiles = [...prev];
      const [moved] = newFiles.splice(draggedIndex, 1);
      newFiles.splice(dropIndex, 0, moved);
      return newFiles;
    });
    setDraggedIndex(null);
    setMergedPdfUrl(null);
    setMergedPdfBlob(null);
  }, [draggedIndex]);

  const handleDragEnd = useCallback(() => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  }, []);

  const mergePDFs = useCallback(async () => {
    if (files.length < 2) {
      setError('Please add at least 2 PDF files to merge.');
      return;
    }

    setIsMerging(true);
    setError('');

    try {
      const mergedPdf = await PDFDocument.create();

      for (const fileItem of files) {
        const arrayBuffer = await fileItem.file.arrayBuffer();
        const pdf = await PDFDocument.load(arrayBuffer);
        const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        pages.forEach(page => mergedPdf.addPage(page));
      }

      const mergedBytes = await mergedPdf.save();
      const blob = new Blob([mergedBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);

      if (mergedPdfUrl) {
        URL.revokeObjectURL(mergedPdfUrl);
      }

      setMergedPdfBlob(blob);
      setMergedPdfUrl(url);
    } catch (err) {
      setError(`Failed to merge PDFs: ${err.message}`);
    } finally {
      setIsMerging(false);
    }
  }, [files, mergedPdfUrl]);

  const downloadMergedPdf = useCallback(() => {
    if (!mergedPdfBlob) return;
    const link = document.createElement('a');
    link.href = mergedPdfUrl;
    link.download = 'merged-document.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [mergedPdfBlob, mergedPdfUrl]);

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  return (
    <div className="merge-pdf-page">
      <header className="header">
        <div className="header-inner">
          <div className="header-left">
            <div className="logo">
              <Logo size="medium" />
              <div className="logo-text">
                <h1>PDF Merger</h1>
                <span className="subtitle">Merge multiple PDFs into one</span>
              </div>
            </div>
          </div>
          <div className="header-right">
            <button className="header-btn" onClick={onBack} title="Back to Generator">
              <ArrowLeft size={18} />
              <span>Back</span>
            </button>
            <button className="header-btn logout" onClick={onLogout} title="Logout">
              <LogOut size={18} />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </header>

      <div className="merge-pdf-body">
        <div className="merge-pdf-container">
          {/* Left panel - File list */}
          <div className="merge-pdf-sidebar">
            <div className="sidebar-header">
              <h2><FileText size={18} /> Files to Merge</h2>
              <span className="file-count">{files.length} file{files.length !== 1 ? 's' : ''}</span>
            </div>

            <div className="file-upload-area" onClick={() => fileInputRef.current?.click()}>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                multiple
                onChange={handleFileSelect}
                className="file-input-hidden"
              />
              <Plus size={24} />
              <p>Click to add PDF files</p>
              <span className="upload-hint">or drag & drop files here</span>
            </div>

            {error && <div className="merge-error">{error}</div>}

            <div className="file-list">
              {files.map((fileItem, index) => (
                <div
                  key={fileItem.id}
                  className={`file-item ${dragOverIndex === index ? 'drag-over' : ''} ${draggedIndex === index ? 'dragging' : ''}`}
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragEnd={handleDragEnd}
                >
                  <div className="file-item-grip">
                    <GripVertical size={14} />
                  </div>
                  <div className="file-item-number">{index + 1}</div>
                  <div className="file-item-info">
                    <span className="file-item-name" title={fileItem.name}>{fileItem.name}</span>
                    <span className="file-item-size">{formatFileSize(fileItem.size)}</span>
                  </div>
                  <div className="file-item-actions">
                    <button
                      className="file-action-btn"
                      onClick={() => moveFile(index, -1)}
                      disabled={index === 0}
                      title="Move up"
                    >
                      <ChevronUp size={14} />
                    </button>
                    <button
                      className="file-action-btn"
                      onClick={() => moveFile(index, 1)}
                      disabled={index === files.length - 1}
                      title="Move down"
                    >
                      <ChevronDown size={14} />
                    </button>
                    <button
                      className="file-action-btn delete"
                      onClick={() => removeFile(fileItem.id)}
                      title="Remove file"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {files.length >= 2 && (
              <div className="merge-actions">
                <button
                  className="merge-btn"
                  onClick={mergePDFs}
                  disabled={isMerging}
                >
                  {isMerging ? (
                    <>
                      <span className="spinner" />
                      Merging...
                    </>
                  ) : (
                    <>
                      <Eye size={16} />
                      Merge & Preview
                    </>
                  )}
                </button>

                {mergedPdfUrl && (
                  <button className="download-btn" onClick={downloadMergedPdf}>
                    <Download size={16} />
                    Download Merged PDF
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Right panel - Preview */}
          <div className="merge-pdf-preview">
            {mergedPdfUrl ? (
              <iframe
                src={mergedPdfUrl}
                title="Merged PDF Preview"
                className="pdf-preview-frame"
              />
            ) : (
              <div className="preview-placeholder">
                <Upload size={48} />
                <h3>PDF Preview</h3>
                <p>Add PDF files and click "Merge & Preview" to see the result here.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default MergePDF;
