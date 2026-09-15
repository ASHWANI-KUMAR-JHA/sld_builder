import { useState, useCallback, useRef, useEffect } from 'react';
import { FileImage, FileText, Upload, Download, Copy, Eye } from 'lucide-react';
import ComponentSidebar from './ComponentSidebar';
import BuilderCanvas from './BuilderCanvas';
import PropertiesPanel from './PropertiesPanel';
import ExportPreview from './ExportPreview';
import Logo from '../Logo';
import { COMPONENT_TEMPLATES } from './componentTemplates';
import './SLDBuilder.css';

let nextId = 1;

function SLDBuilder({ onBack }) {
  const [nodes, setNodes] = useState([]);
  const [connections, setConnections] = useState([]);
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [selectedConnectionId, setSelectedConnectionId] = useState(null);
  const [selectedNodeIds, setSelectedNodeIds] = useState([]);
  const [connectingFrom, setConnectingFrom] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewSvgElement, setPreviewSvgElement] = useState(null);
  const [portOverrides, setPortOverrides] = useState({}); // { "nodeId-portId": "left"|"right"|"top"|"bottom" }
  const [clipboard, setClipboard] = useState(null);
  const [canvasBgColor, setCanvasBgColor] = useState('#f9fafb');
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  const selectedNode = nodes.find(n => n.id === selectedNodeId) || null;
  const selectedConnection = connections.find(c => c.id === selectedConnectionId) || null;

  const handleDrop = useCallback((componentType, x, y) => {
    const template = COMPONENT_TEMPLATES[componentType];
    if (!template) return;

    const newNode = {
      id: nextId++,
      type: componentType,
      x,
      y,
      width: template.width,
      height: template.height,
      config: { ...template.defaultConfig },
    };

    setNodes(prev => [...prev, newNode]);
    setSelectedNodeId(newNode.id);
    setSelectedConnectionId(null);
    setSelectedNodeIds([]);
  }, []);

  const handleNodeMove = useCallback((id, x, y) => {
    setNodes(prev => prev.map(n => n.id === id ? { ...n, x, y } : n));
  }, []);

  const handleNodeSelect = useCallback((id) => {
    setSelectedNodeId(id);
    setSelectedConnectionId(null);
    setSelectedNodeIds([]);
  }, []);

  const handleConnectionSelect = useCallback((id) => {
    setSelectedConnectionId(id);
    setSelectedNodeId(null);
    setSelectedNodeIds([]);
  }, []);

  const handleCanvasClick = useCallback(() => {
    setSelectedNodeId(null);
    setSelectedConnectionId(null);
    setSelectedNodeIds([]);
    setConnectingFrom(null);
  }, []);

  const handleMultiSelect = useCallback((ids) => {
    setSelectedNodeIds(ids);
    setSelectedNodeId(null);
    setSelectedConnectionId(null);
  }, []);

  const handleStartConnection = useCallback((nodeId, port) => {
    setConnectingFrom({ nodeId, port });
  }, []);

  const handleEndConnection = useCallback((nodeId, port) => {
    if (connectingFrom && connectingFrom.nodeId !== nodeId) {
      const newConnection = {
        id: nextId++,
        fromNodeId: connectingFrom.nodeId,
        fromPort: connectingFrom.port,
        toNodeId: nodeId,
        toPort: port,
        waypoints: [],
        config: {
          label: '',
          cableSize: '4 sqmm',
          cableBrand: 'Polycab',
          cableType: 'DC',
          color: '#333333',
        },
      };
      setConnections(prev => [...prev, newConnection]);
      setSelectedConnectionId(newConnection.id);
      setSelectedNodeId(null);
    }
    setConnectingFrom(null);
  }, [connectingFrom]);

  const handleConfigChange = useCallback((field, value) => {
    if (selectedNodeId) {
      setNodes(prev => prev.map(n =>
        n.id === selectedNodeId
          ? { ...n, config: { ...n.config, [field]: value } }
          : n
      ));
    } else if (selectedConnectionId) {
      setConnections(prev => prev.map(c =>
        c.id === selectedConnectionId
          ? { ...c, config: { ...c.config, [field]: value } }
          : c
      ));
    }
  }, [selectedNodeId, selectedConnectionId]);

  const handleDeleteNode = useCallback((id) => {
    setNodes(prev => prev.filter(n => n.id !== id));
    setConnections(prev => prev.filter(c => c.fromNodeId !== id && c.toNodeId !== id));
    // Clean port overrides for this node
    setPortOverrides(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(key => {
        if (key.startsWith(`${id}-`)) delete next[key];
      });
      return next;
    });
    if (selectedNodeId === id) setSelectedNodeId(null);
  }, [selectedNodeId]);

  const handleDeleteConnection = useCallback((id) => {
    setConnections(prev => prev.filter(c => c.id !== id));
    if (selectedConnectionId === id) setSelectedConnectionId(null);
  }, [selectedConnectionId]);

  const handleDuplicateNode = useCallback((id) => {
    const node = nodes.find(n => n.id === id);
    if (!node) return;
    const newNode = {
      ...node,
      id: nextId++,
      x: node.x + 30,
      y: node.y + 30,
      config: { ...node.config },
    };
    setNodes(prev => [...prev, newNode]);
    setSelectedNodeId(newNode.id);
  }, [nodes]);

  const handleResizeNode = useCallback((id, width, height) => {
    setNodes(prev => prev.map(n =>
      n.id === id ? { ...n, width: Math.max(40, width), height: Math.max(40, height) } : n
    ));
  }, []);

  // Port position override
  const handlePortPositionChange = useCallback((nodeId, portId, newPosition) => {
    const key = `${nodeId}-${portId}`;
    setPortOverrides(prev => ({ ...prev, [key]: newPosition }));
  }, []);

  // Waypoint management for connections
  const handleAddWaypoint = useCallback((connId, index, point, newWaypoints) => {
    setConnections(prev => prev.map(c => {
      if (c.id !== connId) return c;
      if (newWaypoints) {
        return { ...c, waypoints: newWaypoints };
      }
      // Update existing waypoint position (dragging)
      const wps = [...(c.waypoints || [])];
      if (index >= 0 && index < wps.length && point) {
        wps[index] = { x: point.x, y: point.y };
      }
      return { ...c, waypoints: wps };
    }));
  }, []);

  const handleRemoveWaypoint = useCallback((connId, index) => {
    setConnections(prev => prev.map(c => {
      if (c.id !== connId) return c;
      const wps = [...(c.waypoints || [])];
      wps.splice(index, 1);
      return { ...c, waypoints: wps };
    }));
  }, []);

  // Copy/Paste functionality
  const handleCopy = useCallback(() => {
    const idsToCopy = selectedNodeIds.length > 0 ? selectedNodeIds : (selectedNodeId ? [selectedNodeId] : []);
    if (idsToCopy.length === 0) return;

    const copiedNodes = nodes.filter(n => idsToCopy.includes(n.id));
    const copiedConnections = connections.filter(c =>
      idsToCopy.includes(c.fromNodeId) && idsToCopy.includes(c.toNodeId)
    );

    // Collect port overrides for copied nodes
    const copiedPortOverrides = {};
    Object.entries(portOverrides).forEach(([key, value]) => {
      const nodeId = parseInt(key.split('-')[0]);
      if (idsToCopy.includes(nodeId)) {
        copiedPortOverrides[key] = value;
      }
    });

    setClipboard({ nodes: copiedNodes, connections: copiedConnections, portOverrides: copiedPortOverrides });
  }, [selectedNodeIds, selectedNodeId, nodes, connections, portOverrides]);

  const handlePaste = useCallback(() => {
    if (!clipboard || clipboard.nodes.length === 0) return;

    const idMap = {};
    const newNodes = clipboard.nodes.map(n => {
      const newId = nextId++;
      idMap[n.id] = newId;
      return { ...n, id: newId, x: n.x + 40, y: n.y + 40, config: { ...n.config } };
    });

    const newConnections = clipboard.connections.map(c => ({
      ...c,
      id: nextId++,
      fromNodeId: idMap[c.fromNodeId],
      toNodeId: idMap[c.toNodeId],
      waypoints: (c.waypoints || []).map(wp => ({ x: wp.x + 40, y: wp.y + 40 })),
      config: { ...c.config },
    }));

    // Map port overrides
    const newPortOverrides = {};
    Object.entries(clipboard.portOverrides).forEach(([key, value]) => {
      const parts = key.split('-');
      const oldNodeId = parseInt(parts[0]);
      const portId = parts.slice(1).join('-');
      if (idMap[oldNodeId]) {
        newPortOverrides[`${idMap[oldNodeId]}-${portId}`] = value;
      }
    });

    setNodes(prev => [...prev, ...newNodes]);
    setConnections(prev => [...prev, ...newConnections]);
    setPortOverrides(prev => ({ ...prev, ...newPortOverrides }));
    setSelectedNodeIds(newNodes.map(n => n.id));
    setSelectedNodeId(null);
  }, [clipboard]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') return;

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedConnectionId) {
          setConnections(prev => prev.filter(c => c.id !== selectedConnectionId));
          setSelectedConnectionId(null);
          e.preventDefault();
        } else if (selectedNodeIds.length > 0) {
          setNodes(prev => prev.filter(n => !selectedNodeIds.includes(n.id)));
          setConnections(prev => prev.filter(c => !selectedNodeIds.includes(c.fromNodeId) && !selectedNodeIds.includes(c.toNodeId)));
          setSelectedNodeIds([]);
          e.preventDefault();
        } else if (selectedNodeId) {
          setNodes(prev => prev.filter(n => n.id !== selectedNodeId));
          setConnections(prev => prev.filter(c => c.fromNodeId !== selectedNodeId && c.toNodeId !== selectedNodeId));
          setSelectedNodeId(null);
          e.preventDefault();
        }
      }

      // Ctrl+C / Cmd+C
      if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        handleCopy();
        e.preventDefault();
      }

      // Ctrl+V / Cmd+V
      if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        handlePaste();
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNodeId, selectedConnectionId, selectedNodeIds, handleCopy, handlePaste]);

  // --- Export / Import workflow ---
  const exportWorkflow = useCallback(() => {
    const workflow = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      nodes: nodes.map(n => ({ ...n, config: { ...n.config } })),
      connections: connections.map(c => ({ ...c, config: { ...c.config } })),
      portOverrides: { ...portOverrides },
    };
    const json = JSON.stringify(workflow, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'sld-workflow.json';
    link.click();
    URL.revokeObjectURL(url);
  }, [nodes, connections, portOverrides]);

  const importWorkflow = useCallback((e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const workflow = JSON.parse(ev.target.result);
        if (workflow.nodes && workflow.connections) {
          // Find max id to avoid collisions
          let maxId = 0;
          workflow.nodes.forEach(n => { if (n.id > maxId) maxId = n.id; });
          workflow.connections.forEach(c => { if (c.id > maxId) maxId = c.id; });
          nextId = maxId + 1;

          setNodes(workflow.nodes);
          setConnections(workflow.connections.map(c => ({
            ...c,
            waypoints: c.waypoints || [],
          })));
          setPortOverrides(workflow.portOverrides || {});
          setSelectedNodeId(null);
          setSelectedConnectionId(null);
          setSelectedNodeIds([]);
        }
      } catch (err) {
        console.error('Failed to import workflow:', err);
        alert('Invalid workflow file. Please select a valid JSON file.');
      }
    };
    reader.readAsText(file);
    // Reset file input so same file can be imported again
    e.target.value = '';
  }, []);

  // --- Export as image/pdf functions ---
  const getSvgForExport = useCallback(() => {
    const container = canvasRef.current;
    if (!container) return null;
    const svg = container.querySelector('.builder-canvas-svg');
    return svg;
  }, []);

  const handleShowPreview = useCallback(() => {
    const container = canvasRef.current;
    if (!container || nodes.length === 0) return;
    const svg = container.querySelector('.builder-canvas-svg');
    if (!svg) return;
    setPreviewSvgElement(svg);
    setShowPreview(true);
  }, [nodes]);

  const exportAsPNG = useCallback(async () => {
    setExporting(true);
    setShowPreview(false);
    try {
      const svgElement = getSvgForExport();
      if (!svgElement) { setExporting(false); return; }

      const clone = svgElement.cloneNode(true);
      const rect = svgElement.getBoundingClientRect();
      clone.setAttribute('width', rect.width);
      clone.setAttribute('height', rect.height);
      clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

      const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      bgRect.setAttribute('width', '100%');
      bgRect.setAttribute('height', '100%');
      bgRect.setAttribute('fill', 'white');
      clone.insertBefore(bgRect, clone.firstChild);

      const styleEl = document.createElementNS('http://www.w3.org/2000/svg', 'style');
      styleEl.textContent = `
        .builder-node { fill: white; stroke: #d1d5db; stroke-width: 1.5; }
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
        const canvas = document.createElement('canvas');
        const scale = 3;
        canvas.width = img.naturalWidth * scale;
        canvas.height = img.naturalHeight * scale;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.scale(scale, scale);
        ctx.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight);

        canvas.toBlob((blob) => {
          const link = document.createElement('a');
          link.href = URL.createObjectURL(blob);
          link.download = `SLD_Builder_Diagram.png`;
          link.click();
          URL.revokeObjectURL(link.href);
          setExporting(false);
        }, 'image/png');

        URL.revokeObjectURL(url);
      };
      img.onerror = () => {
        console.error('PNG export failed');
        setExporting(false);
      };
      img.src = url;
    } catch (err) {
      console.error('Export error:', err);
      setExporting(false);
    }
  }, [getSvgForExport]);

  const exportAsPDF = useCallback(async () => {
    setExporting(true);
    setShowPreview(false);
    try {
      const { jsPDF } = await import('jspdf');

      const svgElement = getSvgForExport();
      if (!svgElement) { setExporting(false); return; }

      const clone = svgElement.cloneNode(true);
      const rect = svgElement.getBoundingClientRect();
      clone.setAttribute('width', rect.width);
      clone.setAttribute('height', rect.height);
      clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

      const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      bgRect.setAttribute('width', '100%');
      bgRect.setAttribute('height', '100%');
      bgRect.setAttribute('fill', 'white');
      clone.insertBefore(bgRect, clone.firstChild);

      const styleEl = document.createElementNS('http://www.w3.org/2000/svg', 'style');
      styleEl.textContent = `
        .builder-node { fill: white; stroke: #d1d5db; stroke-width: 1.5; }
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
        const canvas = document.createElement('canvas');
        const scale = 3;
        canvas.width = img.naturalWidth * scale;
        canvas.height = img.naturalHeight * scale;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.scale(scale, scale);
        ctx.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight);

        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({
          orientation: 'landscape',
          unit: 'mm',
          format: 'a4',
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

        pdf.save('SLD_Builder_Diagram.pdf');

        URL.revokeObjectURL(url);
        setExporting(false);
      };
      img.onerror = () => {
        console.error('PDF export failed');
        setExporting(false);
      };
      img.src = url;
    } catch (err) {
      console.error('Export error:', err);
      setExporting(false);
    }
  }, [getSvgForExport]);

  return (
    <div className="sld-builder">
      <div className="sld-builder-header">
        <button className="sld-builder-back-btn" onClick={onBack}>
          ← Back to Generator
        </button>
        <Logo size="small" />
        <h2 className="sld-builder-title">Interactive SLD Builder</h2>
        <div className="sld-builder-actions">
          <span className="sld-builder-hint">
            Drag components • Click ports to connect • Shift+drag to select group • Ctrl+C/V to copy/paste
          </span>
          <button
            className="sld-builder-export-btn"
            onClick={handleCopy}
            disabled={!selectedNodeId && selectedNodeIds.length === 0}
            title="Copy selected (Ctrl+C)"
          >
            <Copy size={14} />
            Copy
          </button>
          <button
            className="sld-builder-export-btn"
            onClick={handlePaste}
            disabled={!clipboard}
            title="Paste (Ctrl+V)"
          >
            <Copy size={14} style={{ transform: 'scaleX(-1)' }} />
            Paste
          </button>
          <span className="sld-builder-divider">|</span>
          <button
            className="sld-builder-export-btn"
            onClick={exportWorkflow}
            disabled={nodes.length === 0}
            title="Export workflow as JSON"
          >
            <Download size={14} />
            Save
          </button>
          <button
            className="sld-builder-export-btn"
            onClick={() => fileInputRef.current?.click()}
            title="Import workflow from JSON"
          >
            <Upload size={14} />
            Load
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            style={{ display: 'none' }}
            onChange={importWorkflow}
          />
          <span className="sld-builder-divider">|</span>
          <div className="sld-builder-canvas-color">
            <label title="Canvas Background Color">🎨</label>
            <input
              type="color"
              value={canvasBgColor}
              onChange={(e) => setCanvasBgColor(e.target.value)}
              title="Canvas Background Color"
            />
          </div>
          <span className="sld-builder-divider">|</span>
          <button
            className="sld-builder-export-btn"
            onClick={handleShowPreview}
            disabled={exporting || nodes.length === 0}
            title="Preview before export"
          >
            <Eye size={14} />
            Preview
          </button>
          <button
            className="sld-builder-export-btn"
            onClick={exportAsPNG}
            disabled={exporting || nodes.length === 0}
            title="Export as PNG"
          >
            <FileImage size={14} />
            PNG
          </button>
          <button
            className="sld-builder-export-btn"
            onClick={exportAsPDF}
            disabled={exporting || nodes.length === 0}
            title="Export as PDF"
          >
            <FileText size={14} />
            PDF
          </button>
        </div>
      </div>
      <div className="sld-builder-body">
        <ComponentSidebar />
        <BuilderCanvas
          ref={canvasRef}
          nodes={nodes}
          connections={connections}
          selectedNodeId={selectedNodeId}
          selectedConnectionId={selectedConnectionId}
          selectedNodeIds={selectedNodeIds}
          connectingFrom={connectingFrom}
          portOverrides={portOverrides}
          canvasBgColor={canvasBgColor}
          onDrop={handleDrop}
          onNodeMove={handleNodeMove}
          onNodeSelect={handleNodeSelect}
          onConnectionSelect={handleConnectionSelect}
          onCanvasClick={handleCanvasClick}
          onStartConnection={handleStartConnection}
          onEndConnection={handleEndConnection}
          onDeleteNode={handleDeleteNode}
          onResizeNode={handleResizeNode}
          onMultiSelect={handleMultiSelect}
          onAddWaypoint={handleAddWaypoint}
        />
        <PropertiesPanel
          selectedNode={selectedNode}
          selectedConnection={selectedConnection}
          portOverrides={portOverrides}
          onConfigChange={handleConfigChange}
          onDeleteNode={handleDeleteNode}
          onDeleteConnection={handleDeleteConnection}
          onDuplicateNode={handleDuplicateNode}
          onResizeNode={handleResizeNode}
          onPortPositionChange={handlePortPositionChange}
          onRemoveWaypoint={handleRemoveWaypoint}
        />
      </div>
      {/* Export Preview Modal */}
      {showPreview && previewSvgElement && (
        <ExportPreview
          svgElement={previewSvgElement}
          onClose={() => { setShowPreview(false); setPreviewSvgElement(null); }}
          onExportPNG={exportAsPNG}
          onExportPDF={exportAsPDF}
        />
      )}
    </div>
  );
}

export default SLDBuilder;
