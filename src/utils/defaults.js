export const DEFAULT_FORM_DATA = {
  // System Parameters
  modules: 25,
  wattPerModule: 530,
  moduleBrand: 'JAKSON',
  orientation: 'V', // H or V
  strings: 1,
  phase: 'Single', // Single or Three

  // Inverter
  inverterCapacity: '12.00',
  inverterBrand: 'POWERONE',
  inverterType: 'S', // S = String, M = Micro

  // DC Side
  dcCableSize: '4 sqmm',
  dcCableBrand: 'Polycab',

  // Lightning Arrester
  showLightningArrester: true,
  lightningArresterEarthing: '6SQMM Cu Cable, 3 Mtrs CU Bonded, 17mm Rod, Earthing Chemical',

  // ACDB
  acdbRating: '63 Amp',
  acdbPoles: '4 Pole',
  acdbType: 'MCCB with SPD',
  acdbConfig: '1 IN 1 Out',

  // AC Output Cable
  acCableSize: '6sqmm × 4Core',
  acCableBrand: 'Polycab',

  // Meters
  showSolarMeter: true,
  showNetMeter: true,

  // Data Logger
  showDataLogger: true,
  dataLoggerType: 'WiFi',

  // LT Panel
  showLTPanel: true,
  ltPanelCable: '10 sqmm × 4Core Aluminium Armored',

  // Earthing
  showEarthing: true,
  earthingSpec: '16SQMM Cu Cable, 3 Mtrs CU Bonded, 17mm Rod, Earthing Chemical',

  // Branding
  companyName: 'SUNFEED ECOSOLUTIONS',
  projectTitle: 'SINGLE LINE DIAGRAM',
};

export function calculateDerivedValues(formData) {
  const totalKWP = ((formData.modules * formData.wattPerModule) / 1000).toFixed(2);
  const modulesPerString = Math.ceil(formData.modules / formData.strings);

  // Build string description
  let stringDescription;
  if (formData.strings === 1) {
    stringDescription = `1 String of ${formData.modules} Modules`;
  } else {
    const remainder = formData.modules % formData.strings;
    if (remainder === 0) {
      stringDescription = `${formData.strings} Strings of ${modulesPerString} Modules`;
    } else {
      const fullStrings = formData.strings - 1;
      const lastStringModules = formData.modules - (fullStrings * modulesPerString);
      stringDescription = `${fullStrings}×${modulesPerString} + 1×${lastStringModules} (${formData.strings} Strings Total)`;
    }
  }

  return {
    totalKWP,
    modulesPerString,
    stringDescription,
  };
}
