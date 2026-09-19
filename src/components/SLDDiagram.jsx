import { useRef } from 'react';
import './SLDDiagram.css';

function SLDDiagram({ formData, derivedValues, unlocked, onSecretTap }) {
  const width = 1100;
  const height = 780;

  // Hidden 3-tap gate: count taps on the inverter's blue dot. Three taps
  // within 1.5s toggles the unlock state via onSecretTap.
  const tapCountRef = useRef(0);
  const tapTimerRef = useRef(null);

  const handleDotTap = () => {
    tapCountRef.current += 1;
    clearTimeout(tapTimerRef.current);

    if (tapCountRef.current >= 3) {
      tapCountRef.current = 0;
      if (onSecretTap) onSecretTap();
      return;
    }

    // Reset the counter if taps are too far apart
    tapTimerRef.current = setTimeout(() => {
      tapCountRef.current = 0;
    }, 1500);
  };

  // Flow based on reference: Panels(top-left) -> Inverter(top-center) -> ACDB(top-right)
  // Then down: ACDB -> Solar Meter(right) -> Net Meter(bottom-center) -> LT Panel(bottom-center)
  // Lightning Arrester below panels, Earthing below inverter, Data Logger center

  const renderArrow = (x1, y1, x2, y2, color = '#333', label = '', sublabel = '', dashed = false) => {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.sqrt(dx * dx + dy * dy);
    const ux = dx / len;
    const uy = dy / len;
    // Arrow head
    const headLen = 10;
    const ax = x2 - ux * headLen;
    const ay = y2 - uy * headLen;
    const perpX = -uy * 5;
    const perpY = ux * 5;

    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;

    return (
      <g>
        <line
          x1={x1} y1={y1} x2={x2} y2={y2}
          stroke={color} strokeWidth="2.5"
          strokeDasharray={dashed ? '6,4' : 'none'}
        />
        <polygon
          points={`${x2},${y2} ${ax + perpX},${ay + perpY} ${ax - perpX},${ay - perpY}`}
          fill={color}
        />
        {label && (
          <text x={midX} y={midY - 8} textAnchor="middle" className="sld-wire-label">{label}</text>
        )}
        {sublabel && (
          <text x={midX} y={midY + 12} textAnchor="middle" className="sld-label-tiny">{sublabel}</text>
        )}
      </g>
    );
  };

  const renderSolarPanel = () => {
    // Realistic solar panel icon - grid pattern with frame
    const x = 60, y = 50;
    const pw = 140, ph = 160;
    const isVert = formData.orientation === 'V';
    const cellRows = isVert ? 6 : 4;
    const cellCols = isVert ? 4 : 6;

    return (
      <g>
        {/* Panel outer frame */}
        <rect x={x} y={y} width={pw} height={ph} fill="#1a2e4a" stroke="#0f1f33" strokeWidth="3" rx="4" />
        {/* Inner cells */}
        {Array.from({ length: cellRows }).map((_, r) =>
          Array.from({ length: cellCols }).map((_, c) => (
            <rect
              key={`cell-${r}-${c}`}
              x={x + 8 + c * ((pw - 16) / cellCols)}
              y={y + 8 + r * ((ph - 16) / cellRows)}
              width={(pw - 16) / cellCols - 2}
              height={(ph - 16) / cellRows - 2}
              fill="#2d5a8e"
              stroke="#1a3a5f"
              strokeWidth="0.5"
              rx="1"
            />
          ))
        )}
        {/* Center line (busbars) */}
        <line x1={x + pw / 2} y1={y + 8} x2={x + pw / 2} y2={y + ph - 8} stroke="#888" strokeWidth="1.5" />
        <line x1={x + 8} y1={y + ph / 2} x2={x + pw - 8} y2={y + ph / 2} stroke="#888" strokeWidth="1.5" />
        {/* Mounting bracket lines at bottom */}
        <line x1={x + 30} y1={y + ph} x2={x + 30} y2={y + ph + 15} stroke="#555" strokeWidth="2" />
        <line x1={x + pw - 30} y1={y + ph} x2={x + pw - 30} y2={y + ph + 15} stroke="#555" strokeWidth="2" />
        {/* Label */}
        <text x={x + pw / 2} y={y + ph + 35} textAnchor="middle" className="sld-component-label">
          {formData.modules} Modules-{formData.wattPerModule}
        </text>
        <text x={x + pw / 2} y={y + ph + 50} textAnchor="middle" className="sld-component-label">
          Watt {formData.moduleBrand}
        </text>
        <text x={x + pw / 2} y={y + ph + 68} textAnchor="middle" className="sld-component-sublabel">
          {derivedValues.stringDescription}
        </text>
      </g>
    );
  };

  const renderInverter = () => {
    // Realistic inverter - rectangular box with ventilation, display, DC/AC ports
    const x = 420, y = 30;
    const w = 160, h = 180;

    return (
      <g>
        {/* Main body */}
        <rect x={x} y={y} width={w} height={h} fill="#4a4a4a" stroke="#333" strokeWidth="2" rx="8" />
        {/* Top ventilation grille */}
        {Array.from({ length: 5 }).map((_, i) => (
          <line key={`vent-${i}`}
            x1={x + 30 + i * 20} y1={y + 15}
            x2={x + 30 + i * 20} y2={y + 35}
            stroke="#666" strokeWidth="2" strokeLinecap="round"
          />
        ))}
        {/* Display/indicator area */}
        <rect x={x + 40} y={y + 50} width={80} height={40} fill="#1a5276" stroke="#555" strokeWidth="1" rx="3" />
        {/* Hidden 3-tap gate button (looks like the inverter indicator dot) */}
        <circle
          cx={x + 80}
          cy={y + 70}
          r={12}
          fill="#2980b9"
          opacity="0.8"
          stroke={unlocked ? '#27ae60' : 'none'}
          strokeWidth={unlocked ? 2.5 : 0}
          style={{ cursor: 'pointer' }}
          onClick={handleDotTap}
        />
        {/* DC port */}
        <rect x={x + 30} y={y + h - 30} width={35} height={20} fill="#222" stroke="#555" rx="2" />
        <text x={x + 47} y={y + h - 16} textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">DC</text>
        {/* AC port */}
        <rect x={x + 95} y={y + h - 30} width={35} height={20} fill="#222" stroke="#555" rx="2" />
        <text x={x + 112} y={y + h - 16} textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">AC</text>
        {/* Label above */}
        <text x={x + w / 2} y={y - 12} textAnchor="middle" className="sld-component-title">
          Inverter-{formData.inverterCapacity}KWP {formData.inverterType === 'S' ? 'S' : 'M'}
        </text>
        <text x={x + w / 2} y={y - 0} textAnchor="middle" className="sld-component-sublabel">
          {formData.inverterBrand}
        </text>
      </g>
    );
  };

  const renderACDB = () => {
    // Realistic ACDB - enclosure with breakers/indicators
    const x = 800, y = 30;
    const w = 180, h = 140;

    return (
      <g>
        {/* Enclosure */}
        <rect x={x} y={y} width={w} height={h} fill="#f0e6f6" stroke="#b388c9" strokeWidth="2" rx="6" />
        {/* Inner panel area */}
        <rect x={x + 10} y={y + 30} width={w - 20} height={h - 50} fill="white" stroke="#ccc" strokeWidth="1" rx="3" />
        {/* Breaker switches */}
        <rect x={x + 25} y={y + 45} width={20} height={30} fill="#333" rx="2" />
        <rect x={x + 55} y={y + 45} width={20} height={30} fill="#333" rx="2" />
        <rect x={x + 85} y={y + 45} width={20} height={30} fill="#333" rx="2" />
        <rect x={x + 115} y={y + 45} width={20} height={30} fill="#333" rx="2" />
        {/* SPD indicator (triangle with lightning) */}
        <polygon points={`${x + 150},${y + 45} ${x + 140},${y + 75} ${x + 160},${y + 75}`} fill="#f1c40f" stroke="#d4ac0d" />
        <text x={x + 150} y={y + 68} textAnchor="middle" fontSize="8" fontWeight="bold">⚡</text>
        {/* Status LEDs */}
        <circle cx={x + 35} cy={y + 95} r={4} fill="#27ae60" />
        <circle cx={x + 65} cy={y + 95} r={4} fill="#27ae60" />
        <circle cx={x + 95} cy={y + 95} r={4} fill="#e74c3c" />
        {/* Title */}
        <text x={x + w / 2} y={y + 18} textAnchor="middle" fontSize="11" fontWeight="bold" fill="#333">
          ACDB {formData.acdbConfig}
        </text>
        <text x={x + w / 2} y={y + h + 16} textAnchor="middle" className="sld-component-sublabel">
          {formData.acdbRating} {formData.acdbPoles} {formData.acdbType}
        </text>
      </g>
    );
  };

  const renderSolarMeter = () => {
    if (!formData.showSolarMeter) return null;
    const x = 880, y = 320;
    const w = 80, h = 100;

    return (
      <g>
        {/* Meter body */}
        <rect x={x} y={y} width={w} height={h} fill="#f8f8f8" stroke="#999" strokeWidth="1.5" rx="4" />
        {/* Display */}
        <rect x={x + 10} y={y + 10} width={w - 20} height={30} fill="#1a1a2e" stroke="#444" rx="2" />
        {/* Digits */}
        <text x={x + w / 2} y={y + 30} textAnchor="middle" fontSize="10" fill="#0f0" fontFamily="monospace">00000</text>
        {/* Indicator LEDs */}
        <circle cx={x + 20} cy={y + 55} r={3} fill="#e74c3c" />
        <circle cx={x + 40} cy={y + 55} r={3} fill="#f1c40f" />
        <circle cx={x + 60} cy={y + 55} r={3} fill="#27ae60" />
        {/* Terminal connections */}
        <rect x={x + 15} y={y + h - 15} width={10} height={10} fill="#555" rx="1" />
        <rect x={x + 35} y={y + h - 15} width={10} height={10} fill="#555" rx="1" />
        <rect x={x + 55} y={y + h - 15} width={10} height={10} fill="#555" rx="1" />
        {/* Label */}
        <text x={x + w / 2} y={y + h + 16} textAnchor="middle" className="sld-component-label">Solar Meter</text>
      </g>
    );
  };

  const renderNetMeter = () => {
    if (!formData.showNetMeter) return null;
    const x = 380, y = 560;
    const w = 80, h = 100;

    return (
      <g>
        {/* Meter body */}
        <rect x={x} y={y} width={w} height={h} fill="#f8f8f8" stroke="#999" strokeWidth="1.5" rx="4" />
        {/* Display */}
        <rect x={x + 10} y={y + 10} width={w - 20} height={30} fill="#1a1a2e" stroke="#444" rx="2" />
        <text x={x + w / 2} y={y + 30} textAnchor="middle" fontSize="10" fill="#0f0" fontFamily="monospace">00000</text>
        {/* Indicator LEDs */}
        <circle cx={x + 20} cy={y + 55} r={3} fill="#e74c3c" />
        <circle cx={x + 40} cy={y + 55} r={3} fill="#f1c40f" />
        <circle cx={x + 60} cy={y + 55} r={3} fill="#27ae60" />
        {/* Terminals */}
        <rect x={x + 15} y={y + h - 15} width={10} height={10} fill="#555" rx="1" />
        <rect x={x + 35} y={y + h - 15} width={10} height={10} fill="#555" rx="1" />
        <rect x={x + 55} y={y + h - 15} width={10} height={10} fill="#555" rx="1" />
        {/* Label */}
        <text x={x + w / 2} y={y - 10} textAnchor="middle" className="sld-component-label">Net Meter</text>
      </g>
    );
  };

  const renderLTPanel = () => {
    if (!formData.showLTPanel) return null;
    const x = 560, y = 540;
    const w = 220, h = 80;

    return (
      <g>
        {/* Panel enclosure */}
        <rect x={x} y={y} width={w} height={h} fill="#e8e8e8" stroke="#777" strokeWidth="2" rx="4" />
        {/* Inner components */}
        <rect x={x + 15} y={y + 15} width={30} height={50} fill="#444" rx="2" />
        <rect x={x + 55} y={y + 15} width={30} height={50} fill="#444" rx="2" />
        <rect x={x + 95} y={y + 15} width={80} height={50} fill="#222" stroke="#555" rx="3" />
        {/* Display on panel */}
        <rect x={x + 100} y={y + 22} width={70} height={25} fill="#0a0a1a" rx="2" />
        <circle cx={x + 135} cy={y + 55} r={4} fill="#27ae60" />
        {/* Label */}
        <rect x={x + 40} y={y + h + 5} width={140} height={22} fill="#dbeafe" stroke="#93c5fd" rx="3" />
        <text x={x + w / 2} y={y + h + 20} textAnchor="middle" fontSize="10" fontWeight="bold" fill="#1e40af">
          EXISTING LT PANEL
        </text>
        {/* Cable label */}
        <text x={x + w + 10} y={y + h / 2 + 4} className="sld-component-sublabel" textAnchor="start">
          {formData.ltPanelCable}
        </text>
      </g>
    );
  };

  const renderDataLogger = () => {
    if (!formData.showDataLogger) return null;
    const x = 430, y = 410;
    const w = 120, h = 50;

    return (
      <g>
        {/* Logger body */}
        <rect x={x} y={y} width={w} height={h} fill="#f0fdf4" stroke="#86efac" strokeWidth="1.5" rx="6" />
        {/* Green indicator dot */}
        <circle cx={x + 15} cy={y + h / 2} r={6} fill="#22c55e" />
        {/* Text */}
        <text x={x + 55} y={y + h / 2 - 4} className="sld-component-label" textAnchor="middle">
          Data Logger {formData.dataLoggerType}
        </text>
        {/* WiFi signal arcs */}
        <path d={`M${x + w - 25} ${y + 15} Q${x + w - 15} ${y + 5} ${x + w - 5} ${y + 15}`}
          fill="none" stroke="#22c55e" strokeWidth="2" />
        <path d={`M${x + w - 20} ${y + 20} Q${x + w - 15} ${y + 13} ${x + w - 10} ${y + 20}`}
          fill="none" stroke="#22c55e" strokeWidth="1.5" />
        <circle cx={x + w - 15} cy={y + 23} r={2} fill="#22c55e" />
        {/* Antenna icon */}
        <text x={x + 70} y={y + h / 2 + 10} fontSize="8" fill="#666" textAnchor="middle">📡</text>
      </g>
    );
  };

  const renderLightningArrester = () => {
    if (!formData.showLightningArrester) return null;
    const x = 80, y = 370;

    return (
      <g>
        {/* Tall pole/mast */}
        <line x1={x + 40} y1={y} x2={x + 40} y2={y + 120} stroke="#888" strokeWidth="3" />
        {/* Cross arms */}
        <line x1={x + 20} y1={y + 20} x2={x + 60} y2={y + 20} stroke="#888" strokeWidth="2" />
        <line x1={x + 25} y1={y + 40} x2={x + 55} y2={y + 40} stroke="#888" strokeWidth="2" />
        <line x1={x + 30} y1={y + 60} x2={x + 50} y2={y + 60} stroke="#888" strokeWidth="2" />
        {/* Pointed tip */}
        <polygon points={`${x + 40},${y - 15} ${x + 37},${y} ${x + 43},${y}`} fill="#555" />
        {/* Guy wires */}
        <line x1={x + 40} y1={y + 30} x2={x + 10} y2={y + 100} stroke="#aaa" strokeWidth="1" strokeDasharray="3,2" />
        <line x1={x + 40} y1={y + 30} x2={x + 70} y2={y + 100} stroke="#aaa" strokeWidth="1" strokeDasharray="3,2" />
        {/* Earth connection at base */}
        <line x1={x + 40} y1={y + 120} x2={x + 40} y2={y + 140} stroke="#2ecc71" strokeWidth="2" />
        {/* Earth symbol */}
        <line x1={x + 25} y1={y + 140} x2={x + 55} y2={y + 140} stroke="#2ecc71" strokeWidth="2.5" />
        <line x1={x + 29} y1={y + 145} x2={x + 51} y2={y + 145} stroke="#2ecc71" strokeWidth="2" />
        <line x1={x + 33} y1={y + 150} x2={x + 47} y2={y + 150} stroke="#2ecc71" strokeWidth="1.5" />
        {/* Label */}
        <text x={x + 40} y={y - 25} textAnchor="middle" className="sld-component-label">
          Lightning Arrester Head
        </text>
        {/* Earthing spec */}
        <text x={x - 10} y={y + 170} className="sld-component-sublabel">
          {formData.lightningArresterEarthing.substring(0, 20)}
        </text>
        <text x={x - 10} y={y + 184} className="sld-component-sublabel">
          {formData.lightningArresterEarthing.substring(20, 45)}
        </text>
      </g>
    );
  };

  const renderEarthing = () => {
    if (!formData.showEarthing) return null;
    const x = 240, y = 500;

    return (
      <g>
        {/* Earth rod */}
        <line x1={x + 40} y1={y} x2={x + 40} y2={y + 50} stroke="#666" strokeWidth="3" />
        {/* Cross plate */}
        <rect x={x + 20} y={y + 50} width={40} height={6} fill="#8B4513" stroke="#5C3317" rx="2" />
        {/* Earth symbol lines */}
        <line x1={x + 20} y1={y + 65} x2={x + 60} y2={y + 65} stroke="#2ecc71" strokeWidth="3" />
        <line x1={x + 26} y1={y + 72} x2={x + 54} y2={y + 72} stroke="#2ecc71" strokeWidth="2.5" />
        <line x1={x + 32} y1={y + 79} x2={x + 48} y2={y + 79} stroke="#2ecc71" strokeWidth="2" />
        {/* Label box */}
        <rect x={x - 20} y={y + 90} width={120} height={60} fill="#fffbeb" stroke="#fbbf24" rx="4" />
        <text x={x + 40} y={y + 108} textAnchor="middle" fontSize="9" fontWeight="bold" fill="#333">
          16SQMM Cu Cable
        </text>
        <text x={x + 40} y={y + 122} textAnchor="middle" fontSize="9" fill="#555">
          3 Mtrs CU Bonded
        </text>
        <text x={x + 40} y={y + 136} textAnchor="middle" fontSize="9" fill="#555">
          17mm Rod
        </text>
        <text x={x + 40} y={y + 148} textAnchor="middle" fontSize="9" fontWeight="bold" fill="#333">
          Earthing Chemical
        </text>
      </g>
    );
  };

  const renderACOutput = () => {
    // AC Output label on the right side
    const x = 980, y = 440;
    return (
      <g>
        <rect x={x} y={y} width={70} height={35} fill="#dbeafe" stroke="#3b82f6" strokeWidth="1.5" rx="4" />
        <text x={x + 35} y={y + 22} textAnchor="middle" fontSize="10" fontWeight="bold" fill="#1e40af">AC Outpt</text>
      </g>
    );
  };

  const renderConnections = () => {
    return (
      <g>
        {/* 1. Panels -> DC Cable box -> Inverter (left arrow = energy flows from panels to inverter) */}
        {renderArrow(200, 130, 420, 130, '#dc2626', 'DC Cable', `${formData.dcCableSize} ${formData.dcCableBrand}`)}

        {/* 2. Inverter AC out -> ACDB (right) */}
        {renderArrow(580, 130, 800, 80, '#1a56db', '', '')}

        {/* 3. ACDB -> down to Solar Meter */}
        {formData.showSolarMeter && renderArrow(920, 170, 920, 320, '#1a56db', 'AC Output', `${formData.acCableSize} Cable`)}

        {/* 4. Solar Meter -> down to AC Output / Net Meter path */}
        {formData.showSolarMeter && renderArrow(920, 420, 920, 460, '#1a56db', '', '')}

        {/* AC Output box connection */}
        {renderACOutput()}

        {/* 5. Solar Meter -> down-left to Net Meter */}
        {formData.showSolarMeter && formData.showNetMeter && renderArrow(880, 400, 460, 580, '#1a56db', '', '')}

        {/* 6. Net Meter -> LT Panel (right) */}
        {formData.showNetMeter && formData.showLTPanel && renderArrow(460, 610, 560, 580, '#1a56db', '', '')}

        {/* 7. Data Logger connection (dashed from inverter area) */}
        {formData.showDataLogger && renderArrow(500, 280, 490, 410, '#22c55e', '', '', true)}

        {/* 8. Earthing connection from inverter */}
        {formData.showEarthing && renderArrow(500, 210, 280, 500, '#84cc16', '', '', true)}

        {/* 9. Lightning arrester - connection from panel area down */}
        {formData.showLightningArrester && (
          <line x1={130} y1={230} x2={120} y2={370} stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="4,3" />
        )}
      </g>
    );
  };

  const renderTitleBlock = () => {
    return (
      <g>
        {/* Border */}
        <rect x={5} y={5} width={width - 10} height={height - 10} fill="none" stroke="#ccc" strokeWidth="2" rx="4" />
        {/* Title block bottom-right */}
        <rect x={width - 280} y={height - 60} width={265} height={48} fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1" rx="4" />
        <text x={width - 148} y={height - 38} textAnchor="middle" fontSize="12" fontWeight="bold" fill="#1e293b">
          {formData.companyName}
        </text>
        <text x={width - 148} y={height - 22} textAnchor="middle" fontSize="9" fill="#64748b">
          {formData.projectTitle} | {derivedValues.totalKWP} KWP
        </text>
      </g>
    );
  };

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="sld-svg"
      xmlns="http://www.w3.org/2000/svg"
    >
      {renderTitleBlock()}
      {renderConnections()}
      {renderSolarPanel()}
      {renderInverter()}
      {renderACDB()}
      {renderSolarMeter()}
      {renderNetMeter()}
      {renderLTPanel()}
      {renderDataLogger()}
      {renderLightningArrester()}
      {renderEarthing()}
    </svg>
  );
}

export default SLDDiagram;
