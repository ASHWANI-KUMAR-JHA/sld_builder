# Changelog

All notable changes to the Solar Plan Layout Generator will be documented in this file.

## [1.3.0] - 2026-08-08

### Added
- **Cornered/Orthogonal Wire Routing** — Wires now use right-angle (orthogonal) paths instead of straight lines. Double-click any wire on the canvas to add corner waypoints for custom routing. Drag the blue corner dots to reposition them.
- **Workflow Export/Import** — Save your entire SLD builder diagram (nodes, connections, port overrides, waypoints) as a JSON file. Import it back to restore the exact same layout with all configurations preserved.
- **Text Box Component** — New annotation component with rich formatting: bold, italic, font size, text color, background color, border color, border width, and text alignment properties.
- **Configurable Socket/Port Positions** — Every component's input/output ports can now be repositioned to top, right, bottom, or left via the Properties Panel, allowing fully flexible connection layouts.
- **Copy/Paste with Group Support** — Select multiple elements using Shift+drag box selection, then Ctrl+C/Ctrl+V to duplicate entire groups including their inter-connections and port overrides.
- **Export Preview Modal** — Before exporting as PNG or PDF, preview the output in a modal dialog. Choose to download as PNG or PDF directly from the preview.
- **Multi-select with Box Selection** — Hold Shift and drag on the canvas to draw a selection box. All components within the box are selected for group operations (copy, delete, move).

### Changed
- **Wire connections** now use orthogonal (right-angle) paths by default instead of curved Bezier paths, better matching standard electrical diagram conventions.
- **Removed automatic label** from new wire connections (was "Wire" by default) — users should add Text Box annotations near components instead.
- **Connection labels** are still available as an optional field for those who want inline wire labels.

### Removed
- Default "Wire" label on new connections (label field still available but starts empty).

## [1.2.0] - 2026-08-08

### Changed
- **Realistic component icons** in the SLD diagram replacing placeholder boxes:
  - Solar panel with grid cells, busbars, and mounting brackets
  - Inverter with ventilation grille, display, DC/AC ports
  - ACDB enclosure with breaker switches, SPD indicator, status LEDs
  - Solar Meter & Net Meter with digital display, LEDs, terminals
  - LT Panel with internal components and labeled enclosure
  - Data Logger with WiFi signal arcs and antenna
  - Lightning Arrester as tall mast with cross-arms and guy wires
  - Earthing with rod, plate, and specification label box
- **Directional flow arrows** showing energy path matching the reference diagram:
  - Panels → DC Cable → Inverter → ACDB → Solar Meter → Net Meter → LT Panel
  - Dashed lines for Data Logger and Earthing connections
- **Resizable split panels** — drag the center handle to resize the input form and diagram preview independently (clamped between 280px and 60% of viewport)

### Added
- `ResizableSplit` component with drag-to-resize handle (grip dots visual)
- AC Output label component in diagram

## [1.1.0] - 2026-08-08

### Changed
- Replaced tab-based navigation with a **side-by-side split layout**
  - Input parameters on the left (scrollable)
  - Live SLD Diagram preview on the right (sticky, always visible)
- Summary card now uses a 2-column grid to fit the narrower input panel
- Removed tab bar entirely — no more switching needed

## [1.0.0] - 2026-08-08

### Added
- Initial project setup with Vite + React
- **Input Panel** with full system parameter configuration:
  - System Parameters (modules, watt, brand, orientation, strings, phase)
  - Inverter settings (capacity, brand, type)
  - DC Cable configuration (size, brand)
  - Lightning Arrester toggle and earthing spec
  - ACDB configuration (config, rating, poles, type)
  - AC Output Cable settings
  - Component visibility toggles (Solar Meter, Net Meter, Data Logger, LT Panel, Earthing)
  - LT Panel & Earthing specifications
  - Branding (company name, project title)
- **SVG-based Single Line Diagram (SLD)** renderer:
  - Solar panel array with H/V orientation support
  - Inverter, ACDB, Solar Meter, Net Meter, LT Panel boxes
  - Data Logger with wireless icon
  - Lightning Arrester with earthing symbol
  - Earthing symbol
  - DC and AC wire connections with labels
  - Title block with company branding
- **Auto-save** — all input values persist to localStorage automatically
- **Project Manager** — save/load/delete named project configurations
- **Export Module**:
  - Export as PNG (3x high-resolution)
  - Export as PDF (A4, A3, Letter, Legal; Landscape/Portrait)
- **Derived calculations**:
  - Total KWP auto-calculated
  - String configuration description auto-generated
- **Professional UI**:
  - Clean, modern design with Inter font
  - Tab-based navigation (Input Parameters / SLD Diagram)
  - Summary card with live system stats
  - Responsive form grid layout
  - Modal dialogs for Projects and Export
- **White-label support** — customizable company name displayed in header and diagram
- Default branding set to "SUNFEED ECOSOLUTIONS"
