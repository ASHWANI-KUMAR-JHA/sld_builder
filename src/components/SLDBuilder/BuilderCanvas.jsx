import { useState, useCallback, useRef, forwardRef, useEffect } from 'react';
import { COMPONENT_TEMPLATES } from './componentTemplates';
import { renderNodeSVG } from './nodeIcons';

const PORT_RADIUS = 7;

function getPortPosition(node, portId, portOverrides) {
  const { x, y, width, height } = node;
  const template = COMPONENT_TEMPLATES[node.type];
  if (!template) return { x: x + width / 2, y: y + height / 2 };

  const templatePort = template.ports.find(p => p.id === portId);
  if (!templatePort) {
    // Check dynamic sockets for textBox/imageBox
    const sockets = node.config?.sockets || [];
    const dynamicSocket = sockets.find(s => s.id === portId);
    if (dynamicSocket) {
      const idx = sockets.indexOf(dynamicSocket);
      return getDynamicSocketPosition(node, dynamicSocket, idx, sockets);
    }
    return { x: x + width / 2, y: y + height / 2 };
  }

  // Check if port position has been overridden on this node instance
  const overrideKey = `${node.id}-${portId}`;
  const position = (portOverrides && portOverrides[overrideKey]) || templatePort.position;

  switch (position) {
    case 'top': return { x: x + width / 2, y };
    case 'bottom': return { x: x + width / 2, y: y + height };
    case 'left': return { x, y: y + height / 2 };
    case 'right': return { x: x + width, y: y + height / 2 };
    default: return { x: x + width / 2, y: y + height / 2 };
  }
}

function getPortPositionValue(node, portId, portOverrides) {
  const template = COMPONENT_TEMPLATES[node.type];
  if (!template) return 'right';
  const templatePort = template.ports.find(p => p.id === portId);
  if (!templatePort) {
    // Check dynamic sockets for textBox/imageBox
    const sockets = node.config?.sockets || [];
    const dynamicSocket = sockets.find(s => s.id === portId);
    if (dynamicSocket) return dynamicSocket.position;
    return 'right';
  }
  const overrideKey = `${node.id}-${portId}`;
  return (portOverrides && portOverrides[overrideKey]) || templatePort.position;
}

// Calculate position for dynamic sockets on textBox/imageBox nodes
// Distributes multiple sockets evenly along the same edge
function getDynamicSocketPosition(node, socket, index, allSockets) {
  const { x, y, width, height } = node;
  const position = socket.position || 'right';

  // Count how many sockets share this same position
  const sameSideSockets = allSockets.filter(s => (s.position || 'right') === position);
  const indexOnSide = sameSideSockets.indexOf(socket);
  const countOnSide = sameSideSockets.length;

  // Distribute evenly along the edge
  const fraction = (indexOnSide + 1) / (countOnSide + 1);

  switch (position) {
    case 'top': return { x: x + width * fraction, y };
    case 'bottom': return { x: x + width * fraction, y: y + height };
    case 'left': return { x, y: y + height * fraction };
    case 'right': return { x: x + width, y: y + height * fraction };
    default: return { x: x + width, y: y + height * fraction };
  }
}

// Generate orthogonal (cornered) path with waypoints
function generateOrthogonalPath(from, to, fromPosition, toPosition, waypoints) {
  if (waypoints && waypoints.length > 0) {
    // Use user-defined waypoints for cornered layout
    let path = `M ${from.x} ${from.y}`;
    for (const wp of waypoints) {
      path += ` L ${wp.x} ${wp.y}`;
    }
    path += ` L ${to.x} ${to.y}`;
    return path;
  }

  // Default: Create orthogonal path with corners based on port positions
  const OFFSET = 30; // distance from port before turning
  let startX = from.x, startY = from.y;
  let endX = to.x, endY = to.y;

  // Calculate exit point from source
  let exitX = startX, exitY = startY;
  switch (fromPosition) {
    case 'right': exitX += OFFSET; break;
    case 'left': exitX -= OFFSET; break;
    case 'bottom': exitY += OFFSET; break;
    case 'top': exitY -= OFFSET; break;
  }

  // Calculate entry point to target
  let entryX = endX, entryY = endY;
  switch (toPosition) {
    case 'right': entryX += OFFSET; break;
    case 'left': entryX -= OFFSET; break;
    case 'bottom': entryY += OFFSET; break;
    case 'top': entryY -= OFFSET; break;
  }

  // Build orthogonal path: start -> exit -> mid routing -> entry -> end
  let path = `M ${startX} ${startY} L ${exitX} ${exitY}`;

  // Route from exit to entry with at most 2 corners
  if (Math.abs(exitX - entryX) < 1 && Math.abs(exitY - entryY) < 1) {
    path += ` L ${entryX} ${entryY}`;
  } else if (fromPosition === 'right' || fromPosition === 'left') {
    if (toPosition === 'left' || toPosition === 'right') {
      // horizontal to horizontal: go midX then vertical
      const midX = (exitX + entryX) / 2;
      path += ` L ${midX} ${exitY} L ${midX} ${entryY} L ${entryX} ${entryY}`;
    } else {
      // horizontal to vertical: corner at (entryX, exitY)
      path += ` L ${entryX} ${exitY} L ${entryX} ${entryY}`;
    }
  } else {
    if (toPosition === 'top' || toPosition === 'bottom') {
      // vertical to vertical: go midY then horizontal
      const midY = (exitY + entryY) / 2;
      path += ` L ${exitX} ${midY} L ${entryX} ${midY} L ${entryX} ${entryY}`;
    } else {
      // vertical to horizontal: corner at (exitX, entryY)
      path += ` L ${exitX} ${entryY} L ${entryX} ${entryY}`;
    }
  }

  path += ` L ${endX} ${endY}`;
  return path;
}

const BuilderCanvas = forwardRef(function BuilderCanvas(
  {
    nodes,
    connections,
    selectedNodeId,
    selectedConnectionId,
    connectingFrom,
    portOverrides,
    selectedNodeIds,
    canvasBgColor,
    onDrop,
    onNodeMove,
    onNodeSelect,
    onConnectionSelect,
    onCanvasClick,
    onStartConnection,
    onEndConnection,
    onDeleteNode,
    onResizeNode,
    onMultiSelect,
    onAddWaypoint,
  },
  ref
) {
  const svgRef = useRef(null);
  const [dragging, setDragging] = useState(null);
  const [resizing, setResizing] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [zoomLocked, setZoomLocked] = useState(false);
  const [zoomInputValue, setZoomInputValue] = useState('100');
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [panMoved, setPanMoved] = useState(false);
  const [selectionBox, setSelectionBox] = useState(null);
  const [selectionStart, setSelectionStart] = useState(null);
  const [draggingWaypoint, setDraggingWaypoint] = useState(null);

  const getSVGPoint = useCallback((clientX, clientY) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    return {
      x: (clientX - rect.left - panOffset.x) / zoom,
      y: (clientY - rect.top - panOffset.y) / zoom,
    };
  }, [panOffset, zoom]);

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const componentType = e.dataTransfer.getData('componentType');
    if (!componentType) return;
    const point = getSVGPoint(e.clientX, e.clientY);
    const template = COMPONENT_TEMPLATES[componentType];
    if (template) {
      onDrop(componentType, point.x - template.width / 2, point.y - template.height / 2);
    }
  };

  const handleMouseDown = (e) => {
    if (e.target === svgRef.current || e.target.classList.contains('canvas-bg')) {
      if (e.shiftKey) {
        // Start selection box
        const point = getSVGPoint(e.clientX, e.clientY);
        setSelectionStart(point);
        setSelectionBox({ x: point.x, y: point.y, width: 0, height: 0 });
      } else if (e.button === 0 || e.button === 1) {
        // Left click or middle click on canvas = pan
        setIsPanning(true);
        setPanMoved(false);
        setPanStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
        e.preventDefault();
      }
    }
  };

  const handleMouseMove = useCallback((e) => {
    const point = getSVGPoint(e.clientX, e.clientY);
    setMousePos(point);

    if (isPanning) {
      setPanMoved(true);
      setPanOffset({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
      return;
    }

    // Dragging a waypoint
    if (draggingWaypoint) {
      onAddWaypoint(draggingWaypoint.connId, draggingWaypoint.index, point);
      return;
    }

    if (selectionStart) {
      const x = Math.min(selectionStart.x, point.x);
      const y = Math.min(selectionStart.y, point.y);
      const width = Math.abs(point.x - selectionStart.x);
      const height = Math.abs(point.y - selectionStart.y);
      setSelectionBox({ x, y, width, height });
      return;
    }

    if (resizing) {
      const newWidth = Math.max(40, point.x - resizing.nodeX);
      const newHeight = Math.max(40, point.y - resizing.nodeY);
      onResizeNode(resizing.id, newWidth, newHeight);
      return;
    }

    if (dragging) {
      onNodeMove(dragging.id, point.x - dragging.offsetX, point.y - dragging.offsetY);
    }
  }, [dragging, resizing, isPanning, panStart, selectionStart, draggingWaypoint, getSVGPoint, onNodeMove, onResizeNode, onAddWaypoint]);

  const handleMouseUp = useCallback(() => {
    if (selectionBox && selectionStart) {
      // Find nodes within selection box
      const selected = nodes.filter(n => {
        const nx = n.x + n.width / 2;
        const ny = n.y + n.height / 2;
        return nx >= selectionBox.x && nx <= selectionBox.x + selectionBox.width &&
               ny >= selectionBox.y && ny <= selectionBox.y + selectionBox.height;
      }).map(n => n.id);
      if (selected.length > 0 && onMultiSelect) {
        onMultiSelect(selected);
      }
      setSelectionBox(null);
      setSelectionStart(null);
    }
    // If was panning but didn't actually move, treat as a click to deselect
    if (isPanning && !panMoved) {
      onCanvasClick();
    }
    setDragging(null);
    setResizing(null);
    setIsPanning(false);
    setPanMoved(false);
    setDraggingWaypoint(null);
  }, [selectionBox, selectionStart, nodes, onMultiSelect, isPanning, panMoved, onCanvasClick]);

  const handleWheel = useCallback((e) => {
    e.preventDefault();
    if (zoomLocked) return;
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(prev => {
      const next = Math.min(3, Math.max(0.3, prev * delta));
      setZoomInputValue(String(Math.round(next * 100)));
      return next;
    });
  }, [zoomLocked]);

  useEffect(() => {
    const svg = svgRef.current;
    if (svg) {
      svg.addEventListener('wheel', handleWheel, { passive: false });
      return () => svg.removeEventListener('wheel', handleWheel);
    }
  }, [handleWheel]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Only respond when the canvas container or svg is focused, or no input is focused
      const tag = document.activeElement?.tagName.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

      const PAN_STEP = 80;
      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          setPanOffset(prev => ({ ...prev, y: prev.y + PAN_STEP }));
          break;
        case 'ArrowDown':
          e.preventDefault();
          setPanOffset(prev => ({ ...prev, y: prev.y - PAN_STEP }));
          break;
        case 'ArrowLeft':
          e.preventDefault();
          setPanOffset(prev => ({ ...prev, x: prev.x + PAN_STEP }));
          break;
        case 'ArrowRight':
          e.preventDefault();
          setPanOffset(prev => ({ ...prev, x: prev.x - PAN_STEP }));
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const startNodeDrag = (e, node) => {
    e.stopPropagation();
    const point = getSVGPoint(e.clientX, e.clientY);
    setDragging({
      id: node.id,
      offsetX: point.x - node.x,
      offsetY: point.y - node.y,
    });
    onNodeSelect(node.id);
  };

  const handlePortClick = (e, nodeId, port) => {
    e.stopPropagation();
    if (connectingFrom) {
      onEndConnection(nodeId, port.id);
    } else {
      onStartConnection(nodeId, port.id);
    }
  };

  // Double-click on a connection to add a waypoint
  const handleConnectionDoubleClick = (e, conn) => {
    e.stopPropagation();
    const point = getSVGPoint(e.clientX, e.clientY);
    const waypoints = conn.waypoints || [];
    const newWaypoints = [...waypoints, { x: point.x, y: point.y }];
    onAddWaypoint(conn.id, -1, null, newWaypoints);
  };

  const renderTextBoxNode = (node) => {
    const isSelected = node.id === selectedNodeId || (selectedNodeIds && selectedNodeIds.includes(node.id));
    const config = node.config;
    const textAnchor = config.textAlign === 'left' ? 'start' : config.textAlign === 'right' ? 'end' : 'middle';
    const textX = config.textAlign === 'left' ? node.x + 8 : config.textAlign === 'right' ? node.x + node.width - 8 : node.x + node.width / 2;
    const dynamicSockets = config.sockets || [];

    return (
      <g key={node.id} className="builder-node-group">
        <rect
          x={node.x}
          y={node.y}
          width={node.width}
          height={node.height}
          fill={config.backgroundColor || '#ffffff'}
          stroke={isSelected ? '#1a56db' : (config.borderColor || '#d1d5db')}
          strokeWidth={isSelected ? 2.5 : (config.borderWidth || 1)}
          rx="4"
          ry="4"
          style={{ cursor: 'grab' }}
          onMouseDown={e => startNodeDrag(e, node)}
        />
        <text
          x={textX}
          y={node.y + node.height / 2}
          textAnchor={textAnchor}
          dominantBaseline="central"
          fill={config.textColor || '#333333'}
          fontSize={config.fontSize || 14}
          fontWeight={config.bold ? 'bold' : 'normal'}
          fontStyle={config.italic ? 'italic' : 'normal'}
          pointerEvents="none"
          style={{ fontFamily: 'Inter, sans-serif' }}
        >
          {(config.text || '').split('\n').map((line, i, arr) => (
            <tspan
              key={i}
              x={textX}
              dy={i === 0 ? `${-(arr.length - 1) * (config.fontSize || 14) * 0.5}px` : `${(config.fontSize || 14) + 2}px`}
            >
              {line}
            </tspan>
          ))}
        </text>
        {/* Dynamic sockets */}
        {dynamicSockets.map((socket, idx) => {
          const pos = getDynamicSocketPosition(node, socket, idx, dynamicSockets);
          const isConnecting = connectingFrom &&
            connectingFrom.nodeId === node.id &&
            connectingFrom.port === socket.id;
          return (
            <g key={socket.id}>
              <circle
                cx={pos.x}
                cy={pos.y}
                r={PORT_RADIUS}
                className={`builder-port ${isConnecting ? 'connecting' : ''}`}
                onClick={e => handlePortClick(e, node.id, socket)}
                onMouseDown={e => e.stopPropagation()}
              />
              <text
                x={pos.x}
                y={pos.y - 12}
                textAnchor="middle"
                className="builder-port-label"
                pointerEvents="none"
                style={{
                  fontWeight: socket.bold ? 'bold' : 'normal',
                  fontStyle: socket.italic ? 'italic' : 'normal',
                  textDecoration: socket.underline ? 'underline' : 'none',
                  fill: socket.color || '#9ca3af',
                }}
              >
                {socket.label}
              </text>
            </g>
          );
        })}
        {/* Delete button */}
        {isSelected && (
          <g
            className="builder-node-delete"
            onClick={(e) => { e.stopPropagation(); onDeleteNode(node.id); }}
          >
            <circle cx={node.x + node.width - 4} cy={node.y - 4} r="10" />
            <text x={node.x + node.width - 4} y={node.y - 4} textAnchor="middle" dominantBaseline="central">×</text>
          </g>
        )}
        {/* Resize handle */}
        {isSelected && (
          <rect
            x={node.x + node.width - 8}
            y={node.y + node.height - 8}
            width={10}
            height={10}
            className="builder-resize-handle"
            onMouseDown={(e) => {
              e.stopPropagation();
              setResizing({ id: node.id, nodeX: node.x, nodeY: node.y });
            }}
          />
        )}
      </g>
    );
  };

  const renderNode = (node) => {
    const template = COMPONENT_TEMPLATES[node.type];
    if (!template) return null;

    // TextBox nodes have their own renderer
    if (node.type === 'textBox') {
      return renderTextBoxNode(node);
    }

    // ImageBox nodes have their own renderer
    if (node.type === 'imageBox') {
      const isSelected = node.id === selectedNodeId || (selectedNodeIds && selectedNodeIds.includes(node.id));
      const config = node.config;
      const dynamicSockets = config.sockets || [];
      return (
        <g key={node.id} className="builder-node-group">
          <rect
            x={node.x}
            y={node.y}
            width={node.width}
            height={node.height}
            fill={config.backgroundColor || '#ffffff'}
            stroke={isSelected ? '#1a56db' : (config.borderColor || '#d1d5db')}
            strokeWidth={isSelected ? 2.5 : (config.borderWidth || 1)}
            rx="4"
            ry="4"
            style={{ cursor: 'grab' }}
            onMouseDown={e => startNodeDrag(e, node)}
          />
          {config.customImage ? (
            <image
              href={config.customImage}
              x={node.x}
              y={node.y}
              width={node.width}
              height={node.height}
              preserveAspectRatio="xMidYMid meet"
              opacity={config.opacity ?? 1}
              pointerEvents="none"
            />
          ) : (
            <text
              x={node.x + node.width / 2}
              y={node.y + node.height / 2}
              textAnchor="middle"
              dominantBaseline="central"
              fill="#9ca3af"
              fontSize="12"
              pointerEvents="none"
              style={{ fontFamily: 'Inter, sans-serif' }}
            >
              Upload image in properties →
            </text>
          )}
          {/* Dynamic sockets */}
          {dynamicSockets.map((socket, idx) => {
            const pos = getDynamicSocketPosition(node, socket, idx, dynamicSockets);
            const isConnecting = connectingFrom &&
              connectingFrom.nodeId === node.id &&
              connectingFrom.port === socket.id;
            return (
              <g key={socket.id}>
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={PORT_RADIUS}
                  className={`builder-port ${isConnecting ? 'connecting' : ''}`}
                  onClick={e => handlePortClick(e, node.id, socket)}
                  onMouseDown={e => e.stopPropagation()}
                />
                <text
                  x={pos.x}
                  y={pos.y - 12}
                  textAnchor="middle"
                  className="builder-port-label"
                  pointerEvents="none"
                  style={{
                    fontWeight: socket.bold ? 'bold' : 'normal',
                    fontStyle: socket.italic ? 'italic' : 'normal',
                    textDecoration: socket.underline ? 'underline' : 'none',
                    fill: socket.color || '#9ca3af',
                  }}
                >
                  {socket.label}
                </text>
              </g>
            );
          })}
          {/* Delete button */}
          {isSelected && (
            <g
              className="builder-node-delete"
              onClick={(e) => { e.stopPropagation(); onDeleteNode(node.id); }}
            >
              <circle cx={node.x + node.width - 4} cy={node.y - 4} r="10" />
              <text x={node.x + node.width - 4} y={node.y - 4} textAnchor="middle" dominantBaseline="central">×</text>
            </g>
          )}
          {/* Resize handle */}
          {isSelected && (
            <rect
              x={node.x + node.width - 8}
              y={node.y + node.height - 8}
              width={10}
              height={10}
              className="builder-resize-handle"
              onMouseDown={(e) => {
                e.stopPropagation();
                setResizing({ id: node.id, nodeX: node.x, nodeY: node.y });
              }}
            />
          )}
        </g>
      );
    }

    const isSelected = node.id === selectedNodeId || (selectedNodeIds && selectedNodeIds.includes(node.id));
    const nodeBgColor = node.config.customImage
      ? (node.config.backgroundColor || 'transparent')
      : (node.config.backgroundColor || 'white');

    return (
      <g key={node.id} className="builder-node-group">
        {/* Node body */}
        <rect
          x={node.x}
          y={node.y}
          width={node.width}
          height={node.height}
          className={`builder-node ${isSelected ? 'selected' : ''}`}
          fill={nodeBgColor}
          rx="8"
          ry="8"
          onMouseDown={e => startNodeDrag(e, node)}
        />
        {/* Custom user image or SVG icon */}
        {node.config.customImage ? (
          <image
            href={node.config.customImage}
            x={node.x}
            y={node.y}
            width={node.width}
            height={node.height}
            preserveAspectRatio="xMidYMid meet"
            className="builder-node-image"
            pointerEvents="none"
          />
        ) : (
          renderNodeSVG(node.type, node.x, node.y, node.width, node.height)
        )}
        {/* Ports */}
        {template.ports.map(port => {
          const pos = getPortPosition(node, port.id, portOverrides);
          const isConnecting = connectingFrom &&
            connectingFrom.nodeId === node.id &&
            connectingFrom.port === port.id;

          return (
            <g key={port.id}>
              <circle
                cx={pos.x}
                cy={pos.y}
                r={PORT_RADIUS}
                className={`builder-port ${isConnecting ? 'connecting' : ''}`}
                onClick={e => handlePortClick(e, node.id, port)}
                onMouseDown={e => e.stopPropagation()}
              />
              <text
                x={pos.x}
                y={pos.y - 12}
                textAnchor="middle"
                className="builder-port-label"
                pointerEvents="none"
              >
                {port.label}
              </text>
            </g>
          );
        })}
        {/* Delete button */}
        {isSelected && (
          <g
            className="builder-node-delete"
            onClick={(e) => { e.stopPropagation(); onDeleteNode(node.id); }}
          >
            <circle cx={node.x + node.width - 4} cy={node.y - 4} r="10" />
            <text x={node.x + node.width - 4} y={node.y - 4} textAnchor="middle" dominantBaseline="central">×</text>
          </g>
        )}
        {/* Resize handle */}
        {isSelected && (
          <rect
            x={node.x + node.width - 8}
            y={node.y + node.height - 8}
            width={10}
            height={10}
            className="builder-resize-handle"
            onMouseDown={(e) => {
              e.stopPropagation();
              setResizing({ id: node.id, nodeX: node.x, nodeY: node.y });
            }}
          />
        )}
      </g>
    );
  };

  const renderConnection = (conn) => {
    const fromNode = nodes.find(n => n.id === conn.fromNodeId);
    const toNode = nodes.find(n => n.id === conn.toNodeId);
    if (!fromNode || !toNode) return null;

    const fromTemplate = COMPONENT_TEMPLATES[fromNode.type];
    const toTemplate = COMPONENT_TEMPLATES[toNode.type];
    if (!fromTemplate || !toTemplate) return null;

    // Check static ports or dynamic sockets
    const fromPort = fromTemplate.ports.find(p => p.id === conn.fromPort)
      || (fromNode.config?.sockets || []).find(s => s.id === conn.fromPort);
    const toPort = toTemplate.ports.find(p => p.id === conn.toPort)
      || (toNode.config?.sockets || []).find(s => s.id === conn.toPort);
    if (!fromPort || !toPort) return null;

    const from = getPortPosition(fromNode, conn.fromPort, portOverrides);
    const to = getPortPosition(toNode, conn.toPort, portOverrides);
    const fromPosition = getPortPositionValue(fromNode, conn.fromPort, portOverrides);
    const toPosition = getPortPositionValue(toNode, conn.toPort, portOverrides);

    const path = generateOrthogonalPath(from, to, fromPosition, toPosition, conn.waypoints);
    const isSelected = conn.id === selectedConnectionId;
    const color = conn.config.color || '#333';

    // Calculate midpoint for label
    const waypoints = conn.waypoints || [];
    let midX, midY;
    if (waypoints.length > 0) {
      const midIdx = Math.floor(waypoints.length / 2);
      midX = waypoints[midIdx].x;
      midY = waypoints[midIdx].y - 14;
    } else {
      midX = (from.x + to.x) / 2;
      midY = (from.y + to.y) / 2 - 14;
    }

    return (
      <g key={conn.id} className="builder-connection-group" onMouseDown={e => e.stopPropagation()}>
        {/* Invisible wider path for easier clicking */}
        <path
          d={path}
          fill="none"
          stroke="transparent"
          strokeWidth="14"
          style={{ cursor: 'pointer' }}
          onClick={(e) => { e.stopPropagation(); onConnectionSelect(conn.id); }}
          onDoubleClick={(e) => handleConnectionDoubleClick(e, conn)}
        />
        {/* Visible wire */}
        <path
          d={path}
          fill="none"
          stroke={color}
          strokeWidth={isSelected ? 3 : 2}
          strokeDasharray={conn.config.cableType === 'AC' ? '8,4' : 'none'}
          className={`builder-connection ${isSelected ? 'selected' : ''}`}
          strokeLinejoin="round"
          strokeLinecap="round"
          markerEnd={`url(#arrowhead-${conn.id})`}
          onClick={(e) => { e.stopPropagation(); onConnectionSelect(conn.id); }}
          onDoubleClick={(e) => handleConnectionDoubleClick(e, conn)}
        />
        {/* Arrow marker definition */}
        <defs>
          <marker
            id={`arrowhead-${conn.id}`}
            markerWidth="10"
            markerHeight="8"
            refX="9"
            refY="4"
            orient="auto"
          >
            <polygon points="0,0 10,4 0,8" fill={color} />
          </marker>
        </defs>
        {/* Waypoint handles (visible when selected) */}
        {isSelected && waypoints.map((wp, i) => (
          <circle
            key={`wp-${i}`}
            cx={wp.x}
            cy={wp.y}
            r={5}
            fill="#3b82f6"
            stroke="white"
            strokeWidth={2}
            style={{ cursor: 'move' }}
            onMouseDown={(e) => {
              e.stopPropagation();
              setDraggingWaypoint({ connId: conn.id, index: i });
            }}
          />
        ))}
        {/* Label */}
        {conn.config.label && (
          <text
            x={midX}
            y={midY}
            textAnchor="middle"
            className="builder-connection-label"
            pointerEvents="none"
          >
            {conn.config.label} {conn.config.cableSize ? `(${conn.config.cableSize})` : ''}
          </text>
        )}
      </g>
    );
  };

  // Render in-progress connection line
  const renderConnectingLine = () => {
    if (!connectingFrom) return null;
    const fromNode = nodes.find(n => n.id === connectingFrom.nodeId);
    if (!fromNode) return null;
    const fromTemplate = COMPONENT_TEMPLATES[fromNode.type];
    if (!fromTemplate) return null;
    // Check static ports or dynamic sockets
    const fromPort = fromTemplate.ports.find(p => p.id === connectingFrom.port)
      || (fromNode.config?.sockets || []).find(s => s.id === connectingFrom.port);
    if (!fromPort) return null;
    const from = getPortPosition(fromNode, connectingFrom.port, portOverrides);

    return (
      <g>
        <line
          x1={from.x}
          y1={from.y}
          x2={mousePos.x}
          y2={mousePos.y}
          stroke="#3b82f6"
          strokeWidth="2"
          strokeDasharray="6,3"
          pointerEvents="none"
        />
        <circle cx={mousePos.x} cy={mousePos.y} r="5" fill="#3b82f6" opacity="0.5" pointerEvents="none" />
      </g>
    );
  };

  return (
    <div
      className="builder-canvas-container"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      ref={ref}
    >
      <div className="canvas-toolbar">
        <button
          onClick={() => {
            if (zoomLocked) return;
            setZoom(prev => {
              const next = Math.min(3, prev * 1.2);
              setZoomInputValue(String(Math.round(next * 100)));
              return next;
            });
          }}
          title="Zoom In"
          disabled={zoomLocked}
        >+</button>
        <div className="zoom-input-wrapper">
          <input
            type="number"
            className="zoom-input"
            min="30"
            max="300"
            value={zoomInputValue}
            disabled={zoomLocked}
            onChange={(e) => setZoomInputValue(e.target.value)}
            onBlur={() => {
              let val = parseInt(zoomInputValue, 10);
              if (isNaN(val)) val = 100;
              val = Math.min(300, Math.max(30, val));
              setZoomInputValue(String(val));
              setZoom(val / 100);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.target.blur();
              }
            }}
          />
          <span className="zoom-input-suffix">%</span>
        </div>
        <button
          onClick={() => {
            if (zoomLocked) return;
            setZoom(prev => {
              const next = Math.max(0.3, prev / 1.2);
              setZoomInputValue(String(Math.round(next * 100)));
              return next;
            });
          }}
          title="Zoom Out"
          disabled={zoomLocked}
        >−</button>
        <button
          onClick={() => setZoomLocked(prev => !prev)}
          title={zoomLocked ? 'Unlock Zoom' : 'Lock Zoom'}
          className={zoomLocked ? 'zoom-lock-btn locked' : 'zoom-lock-btn'}
        >
          {zoomLocked ? '🔒' : '🔓'}
        </button>
        <button onClick={() => { setZoom(1); setZoomInputValue('100'); setPanOffset({ x: 0, y: 0 }); }} title="Reset View">⌂</button>
      </div>
      <div className="canvas-pan-controls">
        <button onClick={() => setPanOffset(prev => ({ ...prev, y: prev.y + 80 }))} title="Pan Up" className="pan-btn pan-up">↑</button>
        <div className="pan-middle-row">
          <button onClick={() => setPanOffset(prev => ({ ...prev, x: prev.x + 80 }))} title="Pan Left" className="pan-btn pan-left">←</button>
          <button onClick={() => setPanOffset({ x: 0, y: 0 })} title="Center" className="pan-btn pan-center">•</button>
          <button onClick={() => setPanOffset(prev => ({ ...prev, x: prev.x - 80 }))} title="Pan Right" className="pan-btn pan-right">→</button>
        </div>
        <button onClick={() => setPanOffset(prev => ({ ...prev, y: prev.y - 80 }))} title="Pan Down" className="pan-btn pan-down">↓</button>
      </div>
      <svg
        ref={svgRef}
        className="builder-canvas-svg"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <g transform={`translate(${panOffset.x}, ${panOffset.y}) scale(${zoom})`}>
          {/* Grid pattern */}
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#e5e7eb" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect
            className="canvas-bg"
            x="-5000"
            y="-5000"
            width="10000"
            height="10000"
            fill={canvasBgColor || '#f9fafb'}
          />
          {/* Grid pattern (only show if not using a solid dark background) */}
          {(!canvasBgColor || canvasBgColor === '#f9fafb' || canvasBgColor === '#ffffff') && (
            <rect
              x="-5000"
              y="-5000"
              width="10000"
              height="10000"
              fill="url(#grid)"
            />
          )}
          {/* Connections */}
          {connections.map(renderConnection)}
          {/* In-progress connection */}
          {renderConnectingLine()}
          {/* Nodes */}
          {nodes.map(renderNode)}
          {/* Selection box */}
          {selectionBox && selectionBox.width > 0 && (
            <rect
              x={selectionBox.x}
              y={selectionBox.y}
              width={selectionBox.width}
              height={selectionBox.height}
              fill="rgba(59, 130, 246, 0.1)"
              stroke="#3b82f6"
              strokeWidth={1}
              strokeDasharray="4,2"
              pointerEvents="none"
            />
          )}
        </g>
      </svg>
      {nodes.length === 0 && (
        <div className="canvas-empty-state">
          <p>Drag components from the sidebar to start building your SLD</p>
          <p className="canvas-empty-hint">Click ports to connect • Shift+drag to multi-select • Double-click wire to add corner • Scroll to zoom • Drag canvas to pan</p>
        </div>
      )}
    </div>
  );
});

export default BuilderCanvas;
