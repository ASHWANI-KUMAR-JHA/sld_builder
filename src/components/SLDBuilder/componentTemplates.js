export const COMPONENT_TEMPLATES = {
  solarPanel: {
    label: 'Solar Panel',
    icon: '☀️',
    category: 'generation',
    width: 120,
    height: 100,
    ports: [
      { id: 'out', position: 'right', label: 'DC+' },
      { id: 'out2', position: 'bottom', label: 'DC-' },
    ],
    defaultConfig: {
      name: 'Solar Panel',
      moduleCount: 25,
      wattPerModule: 530,
      brand: 'JAKSON',
      orientation: 'V',
      strings: 1,
    },
    configFields: [
      { key: 'name', label: 'Name', type: 'text' },
      { key: 'moduleCount', label: 'Module Count', type: 'number', min: 1 },
      { key: 'wattPerModule', label: 'Watt per Module', type: 'number', min: 100 },
      { key: 'brand', label: 'Brand', type: 'text' },
      { key: 'orientation', label: 'Orientation', type: 'select', options: ['V', 'H'] },
      { key: 'strings', label: 'Strings', type: 'number', min: 1 },
    ],
  },

  inverter: {
    label: 'Inverter',
    icon: '⚡',
    category: 'conversion',
    width: 120,
    height: 110,
    ports: [
      { id: 'dc_in', position: 'left', label: 'DC In' },
      { id: 'ac_out', position: 'right', label: 'AC Out' },
      { id: 'earth', position: 'bottom', label: 'Earth' },
    ],
    defaultConfig: {
      name: 'Inverter',
      capacity: '12.00',
      brand: 'POWERONE',
      type: 'String',
      phase: 'Single',
    },
    configFields: [
      { key: 'name', label: 'Name', type: 'text' },
      { key: 'capacity', label: 'Capacity (KWP)', type: 'text' },
      { key: 'brand', label: 'Brand', type: 'text' },
      { key: 'type', label: 'Type', type: 'select', options: ['String', 'Micro', 'Hybrid'] },
      { key: 'phase', label: 'Phase', type: 'select', options: ['Single', 'Three'] },
    ],
  },

  acdb: {
    label: 'ACDB',
    icon: '🔲',
    category: 'protection',
    width: 110,
    height: 90,
    ports: [
      { id: 'in', position: 'left', label: 'In' },
      { id: 'out', position: 'right', label: 'Out' },
      { id: 'earth', position: 'bottom', label: 'Earth' },
    ],
    defaultConfig: {
      name: 'ACDB',
      rating: '63 Amp',
      poles: '4 Pole',
      type: 'MCCB with SPD',
      config: '1 IN 1 Out',
    },
    configFields: [
      { key: 'name', label: 'Name', type: 'text' },
      { key: 'rating', label: 'Rating', type: 'text' },
      { key: 'poles', label: 'Poles', type: 'select', options: ['2 Pole', '4 Pole'] },
      { key: 'type', label: 'Type', type: 'select', options: ['MCCB with SPD', 'MCB', 'MCCB'] },
      { key: 'config', label: 'Configuration', type: 'text' },
    ],
  },

  dcdb: {
    label: 'DCDB',
    icon: '🔳',
    category: 'protection',
    width: 110,
    height: 90,
    ports: [
      { id: 'in', position: 'left', label: 'In' },
      { id: 'out', position: 'right', label: 'Out' },
      { id: 'earth', position: 'bottom', label: 'Earth' },
    ],
    defaultConfig: {
      name: 'DCDB',
      rating: '32 Amp',
      poles: '2 Pole',
      type: 'MCB with SPD',
      config: '1 IN 1 Out',
    },
    configFields: [
      { key: 'name', label: 'Name', type: 'text' },
      { key: 'rating', label: 'Rating', type: 'text' },
      { key: 'poles', label: 'Poles', type: 'select', options: ['2 Pole', '4 Pole'] },
      { key: 'type', label: 'Type', type: 'select', options: ['MCB with SPD', 'MCB', 'Fuse'] },
      { key: 'config', label: 'Configuration', type: 'text' },
    ],
  },

  solarMeter: {
    label: 'Solar Meter',
    icon: '📊',
    category: 'metering',
    width: 100,
    height: 80,
    ports: [
      { id: 'in', position: 'left', label: 'In' },
      { id: 'out', position: 'right', label: 'Out' },
    ],
    defaultConfig: {
      name: 'Solar Meter',
      type: 'Generation',
      brand: 'L&T',
      rating: '10-60A',
    },
    configFields: [
      { key: 'name', label: 'Name', type: 'text' },
      { key: 'type', label: 'Meter Type', type: 'select', options: ['Generation', 'Export', 'Import'] },
      { key: 'brand', label: 'Brand', type: 'text' },
      { key: 'rating', label: 'Rating', type: 'text' },
    ],
  },

  netMeter: {
    label: 'Net Meter',
    icon: '📈',
    category: 'metering',
    width: 100,
    height: 80,
    ports: [
      { id: 'in', position: 'left', label: 'In' },
      { id: 'out', position: 'right', label: 'Out' },
    ],
    defaultConfig: {
      name: 'Net Meter',
      type: 'Bidirectional',
      brand: 'L&T',
      rating: '10-60A',
    },
    configFields: [
      { key: 'name', label: 'Name', type: 'text' },
      { key: 'type', label: 'Meter Type', type: 'select', options: ['Bidirectional', 'Import', 'Export'] },
      { key: 'brand', label: 'Brand', type: 'text' },
      { key: 'rating', label: 'Rating', type: 'text' },
    ],
  },

  ltPanel: {
    label: 'LT Panel',
    icon: '🏢',
    category: 'distribution',
    width: 110,
    height: 100,
    ports: [
      { id: 'in', position: 'left', label: 'In' },
      { id: 'out', position: 'right', label: 'Out' },
      { id: 'load', position: 'bottom', label: 'Load' },
    ],
    defaultConfig: {
      name: 'LT Panel',
      cable: '10 sqmm × 4Core Aluminium Armored',
      rating: '63A',
      type: 'Main Distribution',
    },
    configFields: [
      { key: 'name', label: 'Name', type: 'text' },
      { key: 'cable', label: 'Cable Spec', type: 'text' },
      { key: 'rating', label: 'Rating', type: 'text' },
      { key: 'type', label: 'Panel Type', type: 'text' },
    ],
  },

  lightningArrester: {
    label: 'Lightning Arrester',
    icon: '⚡',
    category: 'protection',
    width: 80,
    height: 100,
    ports: [
      { id: 'in', position: 'top', label: 'In' },
      { id: 'earth', position: 'bottom', label: 'Earth' },
    ],
    defaultConfig: {
      name: 'Lightning Arrester',
      earthing: '6SQMM Cu Cable, 3 Mtrs CU Bonded, 17mm Rod',
      type: 'Surge Arrester',
    },
    configFields: [
      { key: 'name', label: 'Name', type: 'text' },
      { key: 'earthing', label: 'Earthing Spec', type: 'text' },
      { key: 'type', label: 'Type', type: 'text' },
    ],
  },

  earthing: {
    label: 'Earthing',
    icon: '⏚',
    category: 'protection',
    width: 80,
    height: 80,
    ports: [
      { id: 'in', position: 'top', label: 'In' },
    ],
    defaultConfig: {
      name: 'Earthing',
      spec: '16SQMM Cu Cable, 3 Mtrs CU Bonded, 17mm Rod',
      type: 'Chemical Earthing',
    },
    configFields: [
      { key: 'name', label: 'Name', type: 'text' },
      { key: 'spec', label: 'Specification', type: 'text' },
      { key: 'type', label: 'Type', type: 'select', options: ['Chemical Earthing', 'Pipe Earthing', 'Plate Earthing'] },
    ],
  },

  dataLogger: {
    label: 'Data Logger',
    icon: '📡',
    category: 'monitoring',
    width: 90,
    height: 70,
    ports: [
      { id: 'in', position: 'left', label: 'In' },
    ],
    defaultConfig: {
      name: 'Data Logger',
      type: 'WiFi',
      brand: 'Generic',
      protocol: 'Modbus',
    },
    configFields: [
      { key: 'name', label: 'Name', type: 'text' },
      { key: 'type', label: 'Connectivity', type: 'select', options: ['WiFi', '4G', 'Ethernet', 'RS485'] },
      { key: 'brand', label: 'Brand', type: 'text' },
      { key: 'protocol', label: 'Protocol', type: 'select', options: ['Modbus', 'SunSpec', 'MQTT'] },
    ],
  },

  battery: {
    label: 'Battery',
    icon: '🔋',
    category: 'storage',
    width: 110,
    height: 90,
    ports: [
      { id: 'in', position: 'left', label: 'DC In' },
      { id: 'out', position: 'right', label: 'DC Out' },
    ],
    defaultConfig: {
      name: 'Battery',
      capacity: '10 kWh',
      brand: 'Generic',
      type: 'Lithium-Ion',
      voltage: '48V',
    },
    configFields: [
      { key: 'name', label: 'Name', type: 'text' },
      { key: 'capacity', label: 'Capacity', type: 'text' },
      { key: 'brand', label: 'Brand', type: 'text' },
      { key: 'type', label: 'Type', type: 'select', options: ['Lithium-Ion', 'Lead Acid', 'LFP'] },
      { key: 'voltage', label: 'Voltage', type: 'text' },
    ],
  },

  grid: {
    label: 'Grid',
    icon: '🏭',
    category: 'distribution',
    width: 100,
    height: 80,
    ports: [
      { id: 'in', position: 'left', label: 'In' },
      { id: 'out', position: 'right', label: 'Out' },
    ],
    defaultConfig: {
      name: 'Utility Grid',
      voltage: '230V',
      phase: 'Single',
      provider: 'DISCOM',
    },
    configFields: [
      { key: 'name', label: 'Name', type: 'text' },
      { key: 'voltage', label: 'Voltage', type: 'text' },
      { key: 'phase', label: 'Phase', type: 'select', options: ['Single', 'Three'] },
      { key: 'provider', label: 'Provider', type: 'text' },
    ],
  },

  load: {
    label: 'Load',
    icon: '💡',
    category: 'distribution',
    width: 90,
    height: 80,
    ports: [
      { id: 'in', position: 'left', label: 'In' },
    ],
    defaultConfig: {
      name: 'Load',
      type: 'Residential',
      rating: '5 kW',
      description: 'Building Load',
    },
    configFields: [
      { key: 'name', label: 'Name', type: 'text' },
      { key: 'type', label: 'Load Type', type: 'select', options: ['Residential', 'Commercial', 'Industrial'] },
      { key: 'rating', label: 'Rating', type: 'text' },
      { key: 'description', label: 'Description', type: 'text' },
    ],
  },

  junction: {
    label: 'Junction Box',
    icon: '⊞',
    category: 'connection',
    width: 60,
    height: 60,
    ports: [
      { id: 'top', position: 'top', label: 'Top' },
      { id: 'right', position: 'right', label: 'Right' },
      { id: 'bottom', position: 'bottom', label: 'Bottom' },
      { id: 'left', position: 'left', label: 'Left' },
    ],
    defaultConfig: {
      name: 'Junction Box',
      type: 'IP65',
    },
    configFields: [
      { key: 'name', label: 'Name', type: 'text' },
      { key: 'type', label: 'IP Rating', type: 'select', options: ['IP65', 'IP55', 'IP44'] },
    ],
  },

  textBox: {
    label: 'Text Box',
    icon: '📝',
    category: 'annotation',
    width: 160,
    height: 60,
    ports: [],
    defaultConfig: {
      name: '',
      text: 'Enter text here',
      bold: false,
      italic: false,
      fontSize: 14,
      textColor: '#333333',
      backgroundColor: '#ffffff',
      borderColor: '#d1d5db',
      borderWidth: 1,
      textAlign: 'center',
      sockets: [], // Dynamic socket list: [{id, label, position}]
    },
    configFields: [
      { key: 'text', label: 'Text', type: 'textarea' },
      { key: 'bold', label: 'Bold', type: 'checkbox' },
      { key: 'italic', label: 'Italic', type: 'checkbox' },
      { key: 'fontSize', label: 'Font Size', type: 'number', min: 8, max: 72 },
      { key: 'textColor', label: 'Text Color', type: 'color' },
      { key: 'backgroundColor', label: 'Background', type: 'color' },
      { key: 'borderColor', label: 'Border Color', type: 'color' },
      { key: 'borderWidth', label: 'Border Width', type: 'number', min: 0, max: 10 },
      { key: 'textAlign', label: 'Text Align', type: 'select', options: ['left', 'center', 'right'] },
      { key: 'sockets', label: 'Sockets', type: 'socketList' },
    ],
  },

  imageBox: {
    label: 'Image',
    icon: '🖼️',
    category: 'annotation',
    width: 150,
    height: 120,
    ports: [],
    defaultConfig: {
      name: 'Image',
      customImage: '',
      borderColor: '#d1d5db',
      borderWidth: 1,
      backgroundColor: '#ffffff',
      opacity: 1,
      sockets: [], // Dynamic socket list: [{id, label, position}]
    },
    configFields: [
      { key: 'name', label: 'Name', type: 'text' },
      { key: 'borderColor', label: 'Border Color', type: 'color' },
      { key: 'borderWidth', label: 'Border Width', type: 'number', min: 0, max: 10 },
      { key: 'backgroundColor', label: 'Background', type: 'color' },
      { key: 'opacity', label: 'Opacity', type: 'number', min: 0, max: 1 },
      { key: 'sockets', label: 'Sockets', type: 'socketList' },
    ],
  },
};

export const COMPONENT_CATEGORIES = {
  generation: { label: 'Generation', color: '#f59e0b' },
  conversion: { label: 'Conversion', color: '#3b82f6' },
  protection: { label: 'Protection', color: '#ef4444' },
  metering: { label: 'Metering', color: '#8b5cf6' },
  monitoring: { label: 'Monitoring', color: '#10b981' },
  storage: { label: 'Storage', color: '#06b6d4' },
  distribution: { label: 'Distribution', color: '#6366f1' },
  connection: { label: 'Connection', color: '#6b7280' },
  annotation: { label: 'Annotation', color: '#ec4899' },
};
