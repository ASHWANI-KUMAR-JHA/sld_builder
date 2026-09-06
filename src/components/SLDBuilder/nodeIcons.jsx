/**
 * SVG icon renderers for each component type in the SLD Builder canvas.
 * These replicate the detailed illustrations from the existing SLDDiagram.
 */

export function renderNodeSVG(type, x, y, width, height) {
  const cx = x + width / 2;
  const cy = y + height / 2 - 6;
  const pad = 10;

  switch (type) {
    case 'solarPanel':
      return renderSolarPanelIcon(x + pad, y + pad, width - pad * 2, height - pad * 2 - 14);
    case 'inverter':
      return renderInverterIcon(x + pad, y + pad, width - pad * 2, height - pad * 2 - 14);
    case 'acdb':
    case 'dcdb':
      return renderACDBIcon(x + pad, y + pad, width - pad * 2, height - pad * 2 - 14, type);
    case 'solarMeter':
    case 'netMeter':
      return renderMeterIcon(x + pad, y + pad, width - pad * 2, height - pad * 2 - 14);
    case 'ltPanel':
      return renderLTPanelIcon(x + pad, y + pad, width - pad * 2, height - pad * 2 - 14);
    case 'lightningArrester':
      return renderLightningArresterIcon(cx, y + pad, height - pad * 2 - 14);
    case 'earthing':
      return renderEarthingIcon(cx, y + pad, height - pad * 2 - 14);
    case 'dataLogger':
      return renderDataLoggerIcon(x + pad, y + pad, width - pad * 2, height - pad * 2 - 14);
    case 'battery':
      return renderBatteryIcon(x + pad, y + pad, width - pad * 2, height - pad * 2 - 14);
    case 'grid':
      return renderGridIcon(x + pad, y + pad, width - pad * 2, height - pad * 2 - 14);
    case 'load':
      return renderLoadIcon(cx, y + pad, width - pad * 2, height - pad * 2 - 14);
    case 'junction':
      return renderJunctionIcon(cx, cy, Math.min(width, height) / 2 - pad);
    case 'textBox':
      return null; // Text boxes are rendered directly in BuilderCanvas
    default:
      return null;
  }
}

function renderSolarPanelIcon(x, y, w, h) {
  const cellRows = 4;
  const cellCols = 3;
  return (
    <g pointerEvents="none">
      <rect x={x} y={y} width={w} height={h} fill="#1a2e4a" stroke="#0f1f33" strokeWidth="2" rx="3" />
      {Array.from({ length: cellRows }).map((_, r) =>
        Array.from({ length: cellCols }).map((_, c) => (
          <rect
            key={`cell-${r}-${c}`}
            x={x + 4 + c * ((w - 8) / cellCols)}
            y={y + 4 + r * ((h - 8) / cellRows)}
            width={(w - 8) / cellCols - 2}
            height={(h - 8) / cellRows - 2}
            fill="#2d5a8e"
            stroke="#1a3a5f"
            strokeWidth="0.5"
            rx="1"
          />
        ))
      )}
      <line x1={x + w / 2} y1={y + 4} x2={x + w / 2} y2={y + h - 4} stroke="#888" strokeWidth="1" />
      <line x1={x + 4} y1={y + h / 2} x2={x + w - 4} y2={y + h / 2} stroke="#888" strokeWidth="1" />
    </g>
  );
}

function renderInverterIcon(x, y, w, h) {
  return (
    <g pointerEvents="none">
      <rect x={x} y={y} width={w} height={h} fill="#4a4a4a" stroke="#333" strokeWidth="1.5" rx="5" />
      {/* Ventilation */}
      {Array.from({ length: 3 }).map((_, i) => (
        <line key={`v-${i}`}
          x1={x + w * 0.25 + i * w * 0.2} y1={y + 6}
          x2={x + w * 0.25 + i * w * 0.2} y2={y + 14}
          stroke="#666" strokeWidth="1.5" strokeLinecap="round"
        />
      ))}
      {/* Display */}
      <rect x={x + w * 0.2} y={y + h * 0.35} width={w * 0.6} height={h * 0.25} fill="#1a5276" stroke="#555" strokeWidth="0.5" rx="2" />
      <circle cx={x + w / 2} cy={y + h * 0.47} r={w * 0.08} fill="#2980b9" opacity="0.8" />
      {/* DC/AC labels */}
      <rect x={x + 4} y={y + h - 14} width={w * 0.35} height={10} fill="#222" rx="2" />
      <text x={x + 4 + w * 0.175} y={y + h - 6} textAnchor="middle" fill="white" fontSize="6" fontWeight="bold">DC</text>
      <rect x={x + w - 4 - w * 0.35} y={y + h - 14} width={w * 0.35} height={10} fill="#222" rx="2" />
      <text x={x + w - 4 - w * 0.175} y={y + h - 6} textAnchor="middle" fill="white" fontSize="6" fontWeight="bold">AC</text>
    </g>
  );
}

function renderACDBIcon(x, y, w, h, type) {
  const boxColor = type === 'acdb' ? '#f0e6f6' : '#e6f0f6';
  const borderColor = type === 'acdb' ? '#b388c9' : '#88a9c9';
  return (
    <g pointerEvents="none">
      <rect x={x} y={y} width={w} height={h} fill={boxColor} stroke={borderColor} strokeWidth="1.5" rx="4" />
      <rect x={x + 4} y={y + 12} width={w - 8} height={h - 20} fill="white" stroke="#ccc" strokeWidth="0.5" rx="2" />
      {/* Breakers */}
      {Array.from({ length: 3 }).map((_, i) => (
        <rect key={`br-${i}`}
          x={x + 8 + i * ((w - 16) / 3)}
          y={y + 16}
          width={(w - 16) / 3 - 4}
          height={h - 30}
          fill="#333"
          rx="1"
        />
      ))}
      {/* Status LEDs */}
      <circle cx={x + w * 0.3} cy={y + h - 5} r={2} fill="#27ae60" />
      <circle cx={x + w * 0.5} cy={y + h - 5} r={2} fill="#27ae60" />
      <circle cx={x + w * 0.7} cy={y + h - 5} r={2} fill="#e74c3c" />
      {/* Label */}
      <text x={x + w / 2} y={y + 9} textAnchor="middle" fontSize="7" fontWeight="bold" fill="#333">
        {type === 'acdb' ? 'ACDB' : 'DCDB'}
      </text>
    </g>
  );
}

function renderMeterIcon(x, y, w, h) {
  return (
    <g pointerEvents="none">
      <rect x={x} y={y} width={w} height={h} fill="#f8f8f8" stroke="#999" strokeWidth="1" rx="3" />
      {/* Display */}
      <rect x={x + 6} y={y + 6} width={w - 12} height={h * 0.35} fill="#1a1a2e" stroke="#444" rx="2" />
      <text x={x + w / 2} y={y + 6 + h * 0.24} textAnchor="middle" fontSize="7" fill="#0f0" fontFamily="monospace">00000</text>
      {/* LEDs */}
      <circle cx={x + w * 0.25} cy={y + h * 0.6} r={2.5} fill="#e74c3c" />
      <circle cx={x + w * 0.5} cy={y + h * 0.6} r={2.5} fill="#f1c40f" />
      <circle cx={x + w * 0.75} cy={y + h * 0.6} r={2.5} fill="#27ae60" />
      {/* Terminals */}
      <rect x={x + w * 0.2} y={y + h - 8} width={6} height={5} fill="#555" rx="1" />
      <rect x={x + w * 0.45} y={y + h - 8} width={6} height={5} fill="#555" rx="1" />
      <rect x={x + w * 0.7} y={y + h - 8} width={6} height={5} fill="#555" rx="1" />
    </g>
  );
}

function renderLTPanelIcon(x, y, w, h) {
  return (
    <g pointerEvents="none">
      <rect x={x} y={y} width={w} height={h} fill="#e8e8e8" stroke="#777" strokeWidth="1.5" rx="3" />
      <rect x={x + 4} y={y + 6} width={w * 0.3} height={h - 12} fill="#444" rx="2" />
      <rect x={x + w * 0.4} y={y + 6} width={w * 0.55} height={h - 12} fill="#222" stroke="#555" rx="2" />
      <rect x={x + w * 0.42} y={y + 10} width={w * 0.5} height={h * 0.35} fill="#0a0a1a" rx="1" />
      <circle cx={x + w * 0.67} cy={y + h - 10} r={3} fill="#27ae60" />
    </g>
  );
}

function renderLightningArresterIcon(cx, y, h) {
  return (
    <g pointerEvents="none">
      {/* Pole */}
      <line x1={cx} y1={y} x2={cx} y2={y + h} stroke="#888" strokeWidth="2.5" />
      {/* Cross arms */}
      <line x1={cx - 12} y1={y + h * 0.2} x2={cx + 12} y2={y + h * 0.2} stroke="#888" strokeWidth="1.5" />
      <line x1={cx - 9} y1={y + h * 0.4} x2={cx + 9} y2={y + h * 0.4} stroke="#888" strokeWidth="1.5" />
      <line x1={cx - 6} y1={y + h * 0.6} x2={cx + 6} y2={y + h * 0.6} stroke="#888" strokeWidth="1.5" />
      {/* Pointed tip */}
      <polygon points={`${cx},${y - 6} ${cx - 3},${y + 2} ${cx + 3},${y + 2}`} fill="#555" />
      {/* Earth symbol at base */}
      <line x1={cx - 10} y1={y + h} x2={cx + 10} y2={y + h} stroke="#2ecc71" strokeWidth="2" />
      <line x1={cx - 7} y1={y + h + 4} x2={cx + 7} y2={y + h + 4} stroke="#2ecc71" strokeWidth="1.5" />
      <line x1={cx - 4} y1={y + h + 8} x2={cx + 4} y2={y + h + 8} stroke="#2ecc71" strokeWidth="1" />
    </g>
  );
}

function renderEarthingIcon(cx, y, h) {
  return (
    <g pointerEvents="none">
      {/* Rod */}
      <line x1={cx} y1={y} x2={cx} y2={y + h * 0.5} stroke="#666" strokeWidth="2.5" />
      {/* Plate */}
      <rect x={cx - 12} y={y + h * 0.5} width={24} height={4} fill="#8B4513" stroke="#5C3317" rx="1" />
      {/* Earth symbol */}
      <line x1={cx - 15} y1={y + h * 0.65} x2={cx + 15} y2={y + h * 0.65} stroke="#2ecc71" strokeWidth="2.5" />
      <line x1={cx - 10} y1={y + h * 0.75} x2={cx + 10} y2={y + h * 0.75} stroke="#2ecc71" strokeWidth="2" />
      <line x1={cx - 6} y1={y + h * 0.85} x2={cx + 6} y2={y + h * 0.85} stroke="#2ecc71" strokeWidth="1.5" />
    </g>
  );
}

function renderDataLoggerIcon(x, y, w, h) {
  return (
    <g pointerEvents="none">
      <rect x={x} y={y} width={w} height={h} fill="#f0fdf4" stroke="#86efac" strokeWidth="1.5" rx="4" />
      <circle cx={x + 10} cy={y + h / 2} r={4} fill="#22c55e" />
      {/* WiFi arcs */}
      <path d={`M${x + w - 18} ${y + 8} Q${x + w - 12} ${y + 4} ${x + w - 6} ${y + 8}`}
        fill="none" stroke="#22c55e" strokeWidth="1.5" />
      <path d={`M${x + w - 15} ${y + 12} Q${x + w - 12} ${y + 9} ${x + w - 9} ${y + 12}`}
        fill="none" stroke="#22c55e" strokeWidth="1" />
      <circle cx={x + w - 12} cy={y + 14} r={1.5} fill="#22c55e" />
    </g>
  );
}

function renderBatteryIcon(x, y, w, h) {
  return (
    <g pointerEvents="none">
      <rect x={x + 4} y={y} width={w - 8} height={h} fill="#e0f2fe" stroke="#0ea5e9" strokeWidth="1.5" rx="4" />
      {/* Terminal nub */}
      <rect x={x + w / 2 - 6} y={y - 3} width={12} height={4} fill="#666" rx="1" />
      {/* Charge level bars */}
      {Array.from({ length: 4 }).map((_, i) => (
        <rect
          key={`bar-${i}`}
          x={x + 10}
          y={y + h - 8 - i * (h * 0.2)}
          width={w - 20}
          height={h * 0.15}
          fill={i < 3 ? '#22c55e' : '#86efac'}
          rx="2"
        />
      ))}
      {/* + - labels */}
      <text x={x + 10} y={y + 10} fontSize="7" fontWeight="bold" fill="#333">+</text>
      <text x={x + w - 14} y={y + 10} fontSize="7" fontWeight="bold" fill="#333">−</text>
    </g>
  );
}

function renderGridIcon(x, y, w, h) {
  return (
    <g pointerEvents="none">
      {/* Utility pole / tower */}
      <rect x={x} y={y} width={w} height={h} fill="#f5f5f5" stroke="#888" strokeWidth="1" rx="3" />
      {/* Tower lines */}
      <line x1={x + w * 0.3} y1={y + 4} x2={x + w * 0.3} y2={y + h - 4} stroke="#444" strokeWidth="2" />
      <line x1={x + w * 0.7} y1={y + 4} x2={x + w * 0.7} y2={y + h - 4} stroke="#444" strokeWidth="2" />
      {/* Cross beams */}
      <line x1={x + w * 0.2} y1={y + h * 0.25} x2={x + w * 0.8} y2={y + h * 0.25} stroke="#444" strokeWidth="1.5" />
      <line x1={x + w * 0.2} y1={y + h * 0.55} x2={x + w * 0.8} y2={y + h * 0.55} stroke="#444" strokeWidth="1.5" />
      {/* Wires */}
      <path d={`M${x + 4} ${y + h * 0.35} Q${x + w / 2} ${y + h * 0.42} ${x + w - 4} ${y + h * 0.35}`}
        fill="none" stroke="#e74c3c" strokeWidth="1" />
      <path d={`M${x + 4} ${y + h * 0.7} Q${x + w / 2} ${y + h * 0.77} ${x + w - 4} ${y + h * 0.7}`}
        fill="none" stroke="#3498db" strokeWidth="1" />
    </g>
  );
}

function renderLoadIcon(cx, y, w, h) {
  // Light bulb style
  const r = Math.min(w, h) * 0.3;
  return (
    <g pointerEvents="none">
      {/* Bulb */}
      <circle cx={cx} cy={y + r + 4} r={r} fill="#fef3c7" stroke="#f59e0b" strokeWidth="1.5" />
      {/* Filament */}
      <path
        d={`M${cx - r * 0.3} ${y + r + 4} Q${cx} ${y + 4} ${cx + r * 0.3} ${y + r + 4}`}
        fill="none" stroke="#f59e0b" strokeWidth="1"
      />
      {/* Base */}
      <rect x={cx - r * 0.4} y={y + r * 2 + 4} width={r * 0.8} height={h - r * 2 - 8} fill="#888" stroke="#666" rx="2" />
      {/* Rays */}
      {[0, 45, 90, 135, 180, 225, 270, 315].map(angle => {
        const rad = (angle * Math.PI) / 180;
        const x1 = cx + Math.cos(rad) * (r + 3);
        const y1 = y + r + 4 + Math.sin(rad) * (r + 3);
        const x2 = cx + Math.cos(rad) * (r + 7);
        const y2 = y + r + 4 + Math.sin(rad) * (r + 7);
        return <line key={angle} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#fbbf24" strokeWidth="1" />;
      })}
    </g>
  );
}

function renderJunctionIcon(cx, cy, r) {
  return (
    <g pointerEvents="none">
      <circle cx={cx} cy={cy} r={r} fill="#f3f4f6" stroke="#6b7280" strokeWidth="1.5" />
      <circle cx={cx} cy={cy} r={r * 0.4} fill="#374151" />
      {/* Cross lines */}
      <line x1={cx - r} y1={cy} x2={cx + r} y2={cy} stroke="#6b7280" strokeWidth="1" />
      <line x1={cx} y1={cy - r} x2={cx} y2={cy + r} stroke="#6b7280" strokeWidth="1" />
    </g>
  );
}
