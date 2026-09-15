import { useCallback } from 'react';
import { COMPONENT_TEMPLATES } from './componentTemplates';
import { Trash2, Copy, Plus, Bold, Italic, Underline } from 'lucide-react';

function PropertiesPanel({
  selectedNode,
  selectedConnection,
  portOverrides,
  onConfigChange,
  onDeleteNode,
  onDeleteConnection,
  onDuplicateNode,
  onResizeNode,
  onPortPositionChange,
  onRemoveWaypoint,
}) {
  const handleImageUpload = useCallback((e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      onConfigChange('customImage', ev.target.result);
      // Auto-set background to transparent when image is uploaded
      onConfigChange('backgroundColor', 'transparent');
    };
    reader.readAsDataURL(file);
  }, [onConfigChange]);

  const clearImage = useCallback(() => {
    onConfigChange('customImage', '');
  }, [onConfigChange]);

  if (!selectedNode && !selectedConnection) {
    return (
      <aside className="builder-properties">
        <div className="properties-empty">
          <p>Select a component or connection to view its properties</p>
        </div>
      </aside>
    );
  }

  // Connection properties
  if (selectedConnection) {
    const waypoints = selectedConnection.waypoints || [];
    return (
      <aside className="builder-properties">
        <div className="properties-header">
          <h3>Connection Properties</h3>
          <button
            className="properties-delete-btn"
            onClick={() => onDeleteConnection(selectedConnection.id)}
            title="Delete Connection"
          >
            <Trash2 size={16} />
          </button>
        </div>
        <div className="properties-form">
          <div className="prop-field">
            <label>Label</label>
            <input
              type="text"
              value={selectedConnection.config.label || ''}
              onChange={e => onConfigChange('label', e.target.value)}
            />
          </div>
          <div className="prop-field">
            <label>Cable Size</label>
            <input
              type="text"
              value={selectedConnection.config.cableSize || ''}
              onChange={e => onConfigChange('cableSize', e.target.value)}
            />
          </div>
          <div className="prop-field">
            <label>Cable Brand</label>
            <input
              type="text"
              value={selectedConnection.config.cableBrand || ''}
              onChange={e => onConfigChange('cableBrand', e.target.value)}
            />
          </div>
          <div className="prop-field">
            <label>Cable Type</label>
            <select
              value={selectedConnection.config.cableType || 'DC'}
              onChange={e => onConfigChange('cableType', e.target.value)}
            >
              <option value="DC">DC</option>
              <option value="AC">AC</option>
              <option value="Earth">Earth</option>
              <option value="Data">Data</option>
            </select>
          </div>
          <div className="prop-field">
            <label>Color</label>
            <input
              type="color"
              value={selectedConnection.config.color || '#333333'}
              onChange={e => onConfigChange('color', e.target.value)}
            />
          </div>

          {/* Waypoints section */}
          {waypoints.length > 0 && (
            <div className="prop-section">
              <label className="prop-section-label">Corners / Waypoints</label>
              <p className="prop-hint">Drag blue dots on the wire to reposition corners. Double-click the wire to add more.</p>
              {waypoints.map((wp, i) => (
                <div key={i} className="prop-waypoint-row">
                  <span className="prop-waypoint-label">Corner {i + 1}: ({Math.round(wp.x)}, {Math.round(wp.y)})</span>
                  <button
                    className="prop-waypoint-remove"
                    onClick={() => onRemoveWaypoint(selectedConnection.id, i)}
                    title="Remove corner"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
          {waypoints.length === 0 && (
            <div className="prop-hint-box">
              <p className="prop-hint">Double-click the wire on canvas to add corners for orthogonal routing.</p>
            </div>
          )}
        </div>
      </aside>
    );
  }

  // Node properties
  const template = COMPONENT_TEMPLATES[selectedNode.type];
  if (!template) return null;

  // Check if this is a textBox
  const isTextBox = selectedNode.type === 'textBox';
  const isImageBox = selectedNode.type === 'imageBox';

  return (
    <aside className="builder-properties">
      <div className="properties-header">
        <div className="properties-title-row">
          <span className="properties-icon">{template.icon}</span>
          <h3>{template.label}</h3>
        </div>
        <div className="properties-actions">
          <button
            className="properties-action-btn"
            onClick={() => onDuplicateNode(selectedNode.id)}
            title="Duplicate"
          >
            <Copy size={14} />
          </button>
          <button
            className="properties-delete-btn"
            onClick={() => onDeleteNode(selectedNode.id)}
            title="Delete"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
      <div className="properties-form">
        {/* Size controls */}
        <div className="prop-field-row">
          <div className="prop-field">
            <label>Width</label>
            <input
              type="number"
              value={selectedNode.width}
              min={40}
              max={400}
              step={10}
              onChange={e => onResizeNode(selectedNode.id, parseInt(e.target.value) || 60, selectedNode.height)}
            />
          </div>
          <div className="prop-field">
            <label>Height</label>
            <input
              type="number"
              value={selectedNode.height}
              min={40}
              max={400}
              step={10}
              onChange={e => onResizeNode(selectedNode.id, selectedNode.width, parseInt(e.target.value) || 60)}
            />
          </div>
        </div>

        {/* Background Color (for non-textBox, non-imageBox nodes) */}
        {!isTextBox && !isImageBox && (
          <div className="prop-field">
            <label>Background Color</label>
            <div className="prop-color-row">
              <input
                type="color"
                value={selectedNode.config.backgroundColor || '#ffffff'}
                onChange={e => onConfigChange('backgroundColor', e.target.value)}
              />
              <button
                className="prop-transparent-btn"
                onClick={() => onConfigChange('backgroundColor', 'transparent')}
                title="Set transparent background"
              >
                No Fill
              </button>
            </div>
          </div>
        )}

        {/* Custom Image Upload (not for textBox) */}
        {!isTextBox && (
          <div className="prop-field">
            <label>{isImageBox ? 'Image' : 'Custom Image'}</label>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
            />
            {/* Preset images from public folder */}
            {isImageBox && (
              <div className="prop-preset-images">
                <label className="prop-preset-label">Or choose:</label>
                <div className="prop-preset-grid">
                  <button
                    className="prop-preset-btn"
                    onClick={() => onConfigChange('customImage', '/SUNFEED LOGO.png')}
                    title="Sunfeed Logo"
                  >
                    <img src="/SUNFEED LOGO.png" alt="Sunfeed Logo" />
                    <span>Logo</span>
                  </button>
                  <button
                    className="prop-preset-btn"
                    onClick={() => onConfigChange('customImage', '/ADDRESS.png')}
                    title="Address"
                  >
                    <img src="/ADDRESS.png" alt="Address" />
                    <span>Address</span>
                  </button>
                </div>
              </div>
            )}
            {selectedNode.config.customImage && (
              <>
                <img
                  src={selectedNode.config.customImage}
                  alt="Custom component"
                  className="image-preview"
                />
                <button className="clear-image-btn" onClick={clearImage}>
                  Remove image
                </button>
              </>
            )}
          </div>
        )}

        {/* Config fields */}
        {template.configFields.map(field => {
          if (field.type === 'socketList') {
            // Socket list editor
            const sockets = selectedNode.config.sockets || [];
            return (
              <div key={field.key} className="prop-section">
                <label className="prop-section-label">
                  Sockets (Connection Points)
                </label>
                <p className="prop-hint">
                  Add sockets to create connection points on this component.
                </p>
                {sockets.map((socket, idx) => (
                  <div key={socket.id} className="prop-socket-item">
                    <div className="prop-socket-row">
                      <input
                        type="text"
                        className="prop-socket-label-input"
                        value={socket.label}
                        placeholder="Label"
                        onChange={e => {
                          const updated = [...sockets];
                          updated[idx] = { ...updated[idx], label: e.target.value };
                          onConfigChange('sockets', updated);
                        }}
                      />
                      <select
                        value={socket.position}
                        className="prop-socket-position-select"
                        onChange={e => {
                          const updated = [...sockets];
                          updated[idx] = { ...updated[idx], position: e.target.value };
                          onConfigChange('sockets', updated);
                        }}
                      >
                        <option value="top">Top</option>
                        <option value="right">Right</option>
                        <option value="bottom">Bottom</option>
                        <option value="left">Left</option>
                      </select>
                      <button
                        className="prop-socket-remove-btn"
                        onClick={() => {
                          const updated = sockets.filter((_, i) => i !== idx);
                          onConfigChange('sockets', updated);
                        }}
                        title="Remove socket"
                      >
                        ×
                      </button>
                    </div>
                    <div className="prop-socket-style-row">
                      <button
                        className={`prop-socket-style-btn ${socket.bold ? 'active' : ''}`}
                        onClick={() => {
                          const updated = [...sockets];
                          updated[idx] = { ...updated[idx], bold: !socket.bold };
                          onConfigChange('sockets', updated);
                        }}
                        title="Bold"
                      >
                        <Bold size={12} />
                      </button>
                      <button
                        className={`prop-socket-style-btn ${socket.italic ? 'active' : ''}`}
                        onClick={() => {
                          const updated = [...sockets];
                          updated[idx] = { ...updated[idx], italic: !socket.italic };
                          onConfigChange('sockets', updated);
                        }}
                        title="Italic"
                      >
                        <Italic size={12} />
                      </button>
                      <button
                        className={`prop-socket-style-btn ${socket.underline ? 'active' : ''}`}
                        onClick={() => {
                          const updated = [...sockets];
                          updated[idx] = { ...updated[idx], underline: !socket.underline };
                          onConfigChange('sockets', updated);
                        }}
                        title="Underline"
                      >
                        <Underline size={12} />
                      </button>
                      <input
                        type="color"
                        className="prop-socket-color-input"
                        value={socket.color || '#9ca3af'}
                        onChange={e => {
                          const updated = [...sockets];
                          updated[idx] = { ...updated[idx], color: e.target.value };
                          onConfigChange('sockets', updated);
                        }}
                        title="Label Color"
                      />
                    </div>
                  </div>
                ))}
                <button
                  className="prop-socket-add-btn"
                  onClick={() => {
                    const newSocket = {
                      id: `socket_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                      label: `Port ${sockets.length + 1}`,
                      position: 'right',
                      bold: false,
                      italic: false,
                      underline: false,
                      color: '#9ca3af',
                    };
                    onConfigChange('sockets', [...sockets, newSocket]);
                  }}
                >
                  <Plus size={14} />
                  Add Socket
                </button>
              </div>
            );
          }

          return (
          <div key={field.key} className="prop-field">
            <label>{field.label}</label>
            {field.type === 'select' ? (
              <select
                value={selectedNode.config[field.key] || ''}
                onChange={e => onConfigChange(field.key, e.target.value)}
              >
                {field.options.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            ) : field.type === 'number' ? (
              <input
                type="number"
                value={selectedNode.config[field.key] ?? ''}
                min={field.min}
                max={field.max}
                onChange={e => onConfigChange(field.key, parseFloat(e.target.value) || 0)}
              />
            ) : field.type === 'checkbox' ? (
              <label className="prop-checkbox-label">
                <input
                  type="checkbox"
                  checked={!!selectedNode.config[field.key]}
                  onChange={e => onConfigChange(field.key, e.target.checked)}
                />
                <span>{field.label}</span>
              </label>
            ) : field.type === 'color' ? (
              <input
                type="color"
                value={selectedNode.config[field.key] || '#333333'}
                onChange={e => onConfigChange(field.key, e.target.value)}
              />
            ) : field.type === 'textarea' ? (
              <textarea
                className="prop-textarea"
                value={selectedNode.config[field.key] || ''}
                onChange={e => onConfigChange(field.key, e.target.value)}
                rows={3}
              />
            ) : (
              <input
                type="text"
                value={selectedNode.config[field.key] || ''}
                onChange={e => onConfigChange(field.key, e.target.value)}
              />
            )}
          </div>
          );
        })}

        {/* Port position controls */}
        {template.ports.length > 0 && (
          <div className="prop-section">
            <label className="prop-section-label">Socket Positions</label>
            {template.ports.map(port => {
              const overrideKey = `${selectedNode.id}-${port.id}`;
              const currentPosition = (portOverrides && portOverrides[overrideKey]) || port.position;
              return (
                <div key={port.id} className="prop-field-row prop-port-row">
                  <div className="prop-field prop-port-name">
                    <label>{port.label}</label>
                  </div>
                  <div className="prop-field">
                    <select
                      value={currentPosition}
                      onChange={e => onPortPositionChange(selectedNode.id, port.id, e.target.value)}
                    >
                      <option value="top">Top</option>
                      <option value="right">Right</option>
                      <option value="bottom">Bottom</option>
                      <option value="left">Left</option>
                    </select>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <div className="properties-info">
        <p className="properties-id">ID: {selectedNode.id}</p>
        <p className="properties-pos">Position: ({Math.round(selectedNode.x)}, {Math.round(selectedNode.y)})</p>
      </div>
    </aside>
  );
}

export default PropertiesPanel;
