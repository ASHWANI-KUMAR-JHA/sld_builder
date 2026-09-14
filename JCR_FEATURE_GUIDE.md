# JCR (Joint Commissioning Report) Feature Guide

## Overview
The JCR feature is a comprehensive digital form generator for Solar Street Lighting System installation documentation. It matches the government's official JCR formats (Format-II, Format-III, and Format-III(a)).

## Accessing JCR
1. Log in to the application
2. Click the **"JCR"** button in the main navigation header
3. You'll be taken to the JCR form page

## Key Features

### 1. Smart Dropdown Fields with History
- **Auto-save**: When you enter a new value in any common field, it's automatically saved to a dropdown for future use
- **Searchable**: Type to filter existing options
- **Deletable**: Click the 'x' button next to any saved option to remove it from history
- **Reusable**: Previously entered values appear as suggestions in all future forms

### 2. Form Sections

#### Section 1: Project Information (Format-III)
- System name, district, work order details
- Supplier information
- Installation and handover dates
- Material supply dates

#### Section 2: Equipment Specifications (Format-III(a))
- Module make and capacity (Wp)
- Luminaire make and capacity (W)
- Battery make and capacity (Wh)
- Year

#### Section 3: Material Receipt (Format-II)
- Pre-dispatch inspection date
- Material receipt date

#### Section 4: Certification & Signatures
- Supplier signatory
- User (village level) signatory
- PO/APO signature
- Chief Project Officer countersign

#### Section 5: Site-wise Installation List (Format-III(a) Table)
- Repeatable table with columns for:
  - Serial number
  - Beneficiary name/location
  - GPS coordinates (latitude/longitude)
  - Photo date
  - Village & Gram Panchayat
  - Block
  - Assembly Constituency
  - Commissioning date
  - Module/Battery/Luminaire serial numbers
  - RMS (YES/NO)

### 3. Installation Table Features

#### Auto-Generation
- Set "No. of Systems in this JCR" in Project Information
- The table automatically generates that many empty rows

#### Bulk Actions
- **Fill Commissioning Dates**: Fills all rows with the installation complete date
- **Fill Photo Dates**: Fills all rows with the installation complete date
- **Add Row**: Add additional installation sites manually
- **Remove Row**: Delete unwanted rows

#### Auto-Fill
- When you set the "Installation Complete Date", new rows automatically pre-fill:
  - Commissioning Date = Installation Complete Date
  - Photo Date = Installation Complete Date

### 4. Draft Management

#### Save Draft
- Click **"Save Draft"** to save your current progress
- Unsaved changes are marked with an asterisk (*)
- Drafts are saved locally in your browser

#### Load Draft
- Click **"Load Draft"** to see all saved drafts
- Shows work order number and save timestamp
- Click "Load" to restore a draft
- Click "Delete" to permanently remove a draft

#### New Form
- Click **"New Form"** to start fresh
- Warns you if you have unsaved changes

### 5. PDF Generation

#### Generate PDF
1. Fill in required fields:
   - District
   - Work Order No.
   - Supplier Name
   - No. of Systems
2. Add at least one installation entry
3. Click **"Generate PDF"**

#### PDF Output
The generated PDF includes three formats:
- **Format-II**: Material Receipt certificate
- **Format-III**: Joint Commissioning Report summary with certification text
- **Format-III(a)**: Complete site-wise installation table with equipment specifications

#### Validation
- Checks for required fields before generation
- Warns about incomplete installation rows
- Option to proceed anyway or fix data first

### 6. Data Persistence

#### Field History
- Common field values are stored per-field
- Shared across all JCR forms in your project
- Delete unwanted suggestions anytime

#### Draft Storage
- Multiple drafts can be saved simultaneously
- Each draft includes complete form state (common fields + installation table)
- Drafts persist until manually deleted

## Workflow Example

### New JCR Creation
1. **Start**: Click "JCR" in the header
2. **Project Info**: Enter district, work order number, supplier details
3. **Equipment**: Enter module, luminaire, and battery specifications
4. **Systems Count**: Enter number of installations (e.g., 20)
5. **Installation Table**: Automatically generated with 20 rows
6. **Fill Data**: Enter beneficiary names, coordinates, serial numbers for each site
7. **Bulk Fill**: Use "Fill Commissioning Dates" and "Fill Photo Dates" buttons
8. **Save Draft**: Click "Save Draft" to preserve your work
9. **Generate PDF**: Click "Generate PDF" to create the official document

### Resume Existing JCR
1. Click "Load Draft" button
2. Select the draft you want to continue
3. Click "Load"
4. Make any necessary changes
5. Generate PDF when complete

## Tips & Best Practices

### Data Entry
- Fill common fields first (they'll be suggested in future forms)
- Use bulk actions to save time on dates
- Double-check serial numbers before PDF generation
- Save drafts frequently for complex projects

### Field History Management
- Review and delete outdated supplier names periodically
- Keep district/block names consistent for better autocomplete
- Remove test data before production use

### Installation Table
- Copy-paste coordinates from spreadsheets for efficiency
- Use clear, consistent naming for beneficiaries/locations
- Set commissioning dates before generating rows (they auto-fill)

### PDF Generation
- Review all data before final PDF generation
- Save a draft before generating PDF (backup)
- Keep generated PDFs organized by work order number

## Technical Details

### Browser Storage
- Field options stored in localStorage with prefix `jcr_field_options_`
- Drafts stored with prefix `jcr_draft_`
- No server-side storage required
- Data persists across browser sessions

### PDF Library
- Uses jsPDF with jspdf-autotable for professional output
- Matches government format specifications
- Supports multi-page documents
- Tables automatically paginate if needed

### Mobile Support
- Fully responsive design
- Horizontal scrolling for large tables
- Touch-friendly controls
- Optimized for field use on tablets

## Troubleshooting

### Dropdown not showing history
- Enter a value and blur the field (click outside)
- Check browser localStorage isn't disabled
- Clear browser cache if issues persist

### PDF not generating
- Verify all required fields are filled
- Check browser console for errors
- Ensure popup blockers aren't interfering

### Draft not saving
- Check localStorage quota (usually 5-10MB)
- Clear old drafts to free space
- Verify no browser privacy mode is active

### Table not scrolling
- Use horizontal scroll on smaller screens
- Try landscape orientation on mobile
- Desktop browser recommended for large tables

## Support & Feedback

For issues or feature requests related to the JCR module, contact your system administrator.

---

**Version**: 1.0  
**Last Updated**: September 14, 2026  
**Component Files**:
- `src/components/JCR.jsx` - Main form component
- `src/components/InstallationTable.jsx` - Installation table component
- `src/components/ComboboxWithHistory.jsx` - Smart dropdown component
- `src/utils/jcrStorage.js` - Storage management
- `src/utils/jcrPdfGenerator.js` - PDF generation logic
