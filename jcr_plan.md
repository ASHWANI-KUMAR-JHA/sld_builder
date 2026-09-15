# JCR — Joint Commissioning Report (Inspection Report PDF Form)

## Overview

Create a new **JCR (Joint Commissioning Report)** page/component that produces a 2-page editable form matching the "FORMAT OF INSPECTION REPORT OF SOLAR STREET LIGHTING SYSTEM" screenshot. The user fills in fields on-screen and exports a paginated, print-ready PDF via jsPDF.

---

## Page 1 — General Information + Sample Testing Tables

### 1.1 Title Bar (top of every page)

| Element | Details |
|---------|---------|
| **Project Name** | Editable text input — entered once at the top, printed as the title on every PDF page. |
| **Format label** | Static text: `FORMAT-I` (right-aligned, top corner). |
| **Report heading** | **Editable** text input — defaults to `FORMAT OF INSPECTION REPORT OF SOLAR STREET LIGHTING SYSTEM`, printed centered on every PDF page. |

### 1.2 General Information Fields (numbered label + editable value)

Render as a 2-column layout: left column = numbered label (read-only), right column = editable text field.

| # | Label | Input Type | Notes |
|---|-------|-----------|-------|
| 1 | NAME OF THE DEPARTMENT | text | |
| 2(i) | RATE CONTRACT NO & DATE | text | |
| 2(ii) | WORK ORDER NO & DATE | **dynamic table** | Multiple work orders — see 1.2a below |
| 3 | ORDERED QUANTITY (NOS) | text | |
| 4 | CONSIGNEE DEPARTMENT/OFFICE | textarea | Multi-line |
| 5 | NAME OF THE COMPANY WHO OFFERED THE MATERIAL FOR INSPECTION | textarea | |
| 6 | DATE OF INSPECTION | date | Date picker |
| 7 | NO. OF SYSTEMS OFFERED FOR INSPECTION | text | |
| 8 | SERIAL NO. OF SPV MODULES (PL ALSO ATTACH LIST OF MODULES AND MANUFACTURERS FOR PV MODULES EMPANELLED BY MNRE AS PER ITS ALMM ORDER) | textarea | |
| 9 | SERIAL NO OF LUMINAIRE (PI ATTACH LIST) | textarea | |
| 10 | SERIAL NO OF BATTERY (PI ATTACH LIST) | textarea | |
| 11 | NOS. OF SAMPLE TAKEN AT RANDOM FOR TESTING AS PER DETAILS GIVEN BELOW | text | **This value drives the number of rows in the 3 tables below** |

### 1.2a Work Order No & Date (dynamic table — field #2ii)

The Work Order field is **not** a single text box. It is a small editable table so the user can enter **multiple** work orders, matching the screenshot where several `DNRE/2025-2026/xxxxx DATED:dd-mm-yyyy` entries are stacked.

| Column | Input Type | Notes |
|--------|-----------|-------|
| WORK ORDER NO | text | e.g., `DNRE/2025-2026/10060` |
| DATE | date / text | e.g., `04-02-2026` |

- **Add Row** button appends a new blank work-order row.
- **Remove Row** button (trash icon) deletes a row.
- Starts with 1 row by default.
- On the PDF, all work-order rows are printed stacked within the value cell of field #2ii (No + Date per line), preserving the multi-entry format from the screenshot.

### 1.3 Dynamic Sample Tables

When the user enters a number in field **#11** ("No. of samples taken"), three tables are rendered, each with that many rows. All cell values are manually editable.

#### (I) SPV MODULE

| Column | Width hint |
|--------|-----------|
| SR. NO OF SPV MODULE | narrow |
| SPV MODULE MAKE | medium |
| TYPE OF MODULE | medium |
| WATTAGE AS PER SPECIFICATION (IN WATT) | medium |
| VOC | narrow |
| ISC | narrow |
| WATTAGE | narrow |
| EFFICIENCY | narrow |

Last 4 columns grouped under header: **AS PER I-V CURVE OF SOLAR PV MODULE**

#### (II) BATTERY

| Column |
|--------|
| SR. NO OF BATTERY |
| BATTERY MAKE |
| TYPE OF BATTERY |
| VOLTAGE |
| CAPACITY |

#### (III) LUMINARIES

| Column |
|--------|
| SR. NO OF LUMINARIES |
| LUMINARY MAKE |
| POWER CONSUMPTION OF THE LUMINAIRE (IN WATT) |
| NO LOAD CURRENT OF LUMINAIRE (IN mA) |

---

## Page 2 — Additional Specifications + Signatures

### 2.1 Additional Fields (numbered label + editable value, continuing from page 1)

| # | Label | Input Type |
|---|-------|-----------|
| 12 | TYPE OF CHARGE CONTROLLER | text |
| 13 | ELECTRONIC EFFICIENCY OF SYSTEM | text |
| 14 | TYPE OF POLE, LENGTH & OUTER DIA OF THE POLE | text |
| 15 | TYPE, MAKE, SIZE & STANDARD OF CABLE USED | text |
| 16 | TWO LED INDICATOR (GREEN ON- CHARGING, RED ON- BATTERY DEEP DISCHARGE) | text |
| 17 | REMOTE MONITORING SYSTEM (RMS) AS PER RATE CONTRACT | text |

### 2.2 Comments Section

- Static label: `COMMENTS OF THE COMMITTEE:`
- Editable textarea for committee comments (default: "Material verified and accepted.")

### 2.3 Signature Block (dynamic)

- **Input**: "Number of Signatures" (numeric input)
- When a number is entered, that many signature slots are generated, evenly spaced across the page width near the footer.
- Each slot has:
  - Blank space for real-world physical signature
  - Editable **Name** text field (below signature space)
  - Editable **Designation** text field (below name)
- On the PDF, signature space is left blank; name/designation are printed below it.

### 2.4 Footer

- Page number: `Page X of Y`
- Company branding footer (matching existing Sunfeed style from FlashReport)

---

## Technical Implementation Plan

### Step 1 — Create Component Files

| File | Purpose |
|------|---------|
| `src/components/JCR.jsx` | Main component with state, form, preview, and PDF export logic |
| `src/components/JCR.css` | Styling (follows FlashReport.css patterns) |

### Step 2 — Component State Structure

```js
const [projectName, setProjectName] = useState('');
const [reportHeading, setReportHeading] = useState('FORMAT OF INSPECTION REPORT OF SOLAR STREET LIGHTING SYSTEM');

// General info fields (keyed by field number)
const [fields, setFields] = useState({
  department: '',
  rateContractNo: '',
  workOrderNo: '',
  orderedQty: '',
  consigneeDept: '',
  companyName: '',
  dateOfInspection: '',
  systemsOffered: '',
  spvSerialNos: '',
  luminaireSerialNos: '',
  batterySerialNos: '',
  sampleCount: 0,          // drives dynamic table row count
});

// Work Order No & Date (field #2ii) — dynamic table
const [workOrders, setWorkOrders] = useState([{ id: 1, orderNo: '', date: '' }]);

// Page 2 fields
const [additionalFields, setAdditionalFields] = useState({
  chargeController: '',
  electronicEfficiency: '',
  poleType: '',
  cableType: '',
  ledIndicator: '',
  rms: '',
});

const [committeeComments, setCommitteeComments] = useState('Material verified and accepted.');

// Dynamic tables — arrays of objects, length = sampleCount
const [spvRows, setSpvRows] = useState([]);
const [batteryRows, setBatteryRows] = useState([]);
const [luminaireRows, setLuminaireRows] = useState([]);

// Signatures
const [signatureCount, setSignatureCount] = useState(0);
const [signatures, setSignatures] = useState([]); // { name, designation }
```

### Step 3 — Dynamic Row Generation Logic

When `sampleCount` changes:
- Resize `spvRows`, `batteryRows`, `luminaireRows` arrays to match.
- If increasing, add empty rows; if decreasing, trim from end.
- Preserve already-entered data for rows that remain.

When `signatureCount` changes:
- Same resize logic for `signatures` array.

### Step 4 — UI Layout

```
┌─────────────────────────────────────────┐
│  Header (Back, Logo, Title, Logout)     │
├─────────────────────────────────────────┤
│  Project Name Input                     │
├─────────────────────────────────────────┤
│  PAGE 1 SECTION                         │
│  ┌──────────────────┬──────────────────┐│
│  │ Label col        │ Editable value   ││
│  │ (fields 1–11)    │ col              ││
│  └──────────────────┴──────────────────┘│
│                                         │
│  (I) SPV MODULE Table  [N rows]         │
│  (II) BATTERY Table    [N rows]         │
│  (III) LUMINARIES Table [N rows]        │
├─────────────────────────────────────────┤
│  PAGE 2 SECTION                         │
│  Fields 12–17 (same 2-col layout)       │
│  Committee Comments textarea            │
│  Signature Count input                  │
│  Signature slots (Name + Designation)   │
├─────────────────────────────────────────┤
│  [Export PDF] button                    │
└─────────────────────────────────────────┘
```

### Step 5 — PDF Export (jsPDF)

Using jsPDF (already in `package.json`), generate a multi-page A4 PDF:

**PDF Page 1:**
1. Print `FORMAT-I` top-right.
2. Print report heading centered.
3. Print project name as title.
4. Render general info as a bordered 2-column table (label | value).
5. Render SPV Module table with merged header row for I-V curve columns.
6. Render Battery table.
7. Render Luminaire table (may overflow to continuation page if many rows).
8. Footer with page number.

**PDF Page 2:**
1. Print project name as title.
2. Render fields 12–17 as a bordered 2-column table.
3. Print committee comments.
4. Render signature block — evenly spaced columns, each with:
   - ~30mm blank vertical space for physical signature
   - Printed name
   - Printed designation
5. Footer with page number.

**Pagination:**
- If the sample tables exceed Page 1 space, automatically continue onto additional pages.
- Page 2 content follows after all tables are complete.

### Step 6 — Wire Into App

1. **App.jsx**: Add `'jcr'` to `currentPage` state options, import JCR component, render it conditionally.
2. **Header.jsx**: Add a "JCR" navigation button with `onJcrClick` prop.

### Step 7 — Styling

- Reuse existing design tokens from FlashReport.css (card styles, config-grid, table styles).
- Ensure tables are responsive on screen but use fixed-width layout for PDF.
- Two-column label/value fields styled as a clean form with borders.

---

## File Change Summary

| File | Action | Description |
|------|--------|-------------|
| `src/components/JCR.jsx` | **Create** | Full JCR form component with state, tables, PDF export |
| `src/components/JCR.css` | **Create** | Styling for the JCR page |
| `src/App.jsx` | **Modify** | Add `'jcr'` page routing + import JCR component |
| `src/components/Header.jsx` | **Modify** | Add JCR navigation button + `onJcrClick` prop |

---

## Key Design Decisions

1. **All fields editable on-screen, printed to PDF** — no auto-generation of values (unlike FlashReport's random ranges). This is a pure form-fill → export workflow.
2. **Dynamic rows driven by "No. of samples"** — avoids clutter; user only sees rows they need.
3. **Signature slots with blank space** — PDF leaves physical space for wet signatures, prints name/designation below.
4. **jsPDF direct rendering** (not html2canvas) — matches existing FlashReport pattern, gives precise control over table layout and pagination.
5. **Single component** — follows the FlashReport pattern (one self-contained component file + CSS).
