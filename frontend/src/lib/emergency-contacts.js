/**
 * Canonical emergency contact numbers for Camarines Norte PDRRMO and LGUs.
 * NOTE [HUMAN]: The real hotline numbers must be confirmed by PDRRMO leadership.
 */
export const EMERGENCY_CONTACTS = {
  pdrrmo_eoc: {
    label: 'Camarines Norte Provincial EOC',
    hotline: '0998-555-2673',
    landline: '(054) 885-1234',
    alt: '0917-888-2673',
  },
  mdrrmo_daet: {
    label: 'Daet MDRRMO',
    hotline: '0919-123-4567',
  },
  mdrrmo_labo: {
    label: 'Labo MDRRMO',
    hotline: '0919-234-5678',
  },
  red_cross: {
    label: 'Philippine Red Cross - CamNorte Chapter',
    hotline: '0920-987-6543',
  },
  pnp_provincial: {
    label: 'PNP Camarines Norte Provincial Police Office',
    hotline: '0998-598-6123',
  },
  bfp_provincial: {
    label: 'BFP Camarines Norte Provincial Office',
    hotline: '0915-456-7890',
  },
};

export function formatEmergencySMS(incidentType, municipality, barangay, lat, lng) {
  const coords = lat != null && lng != null ? ` [GPS: ${lat.toFixed(4)}, ${lng.toFixed(4)}]` : '';
  return `EMERGENCY SOS: ${incidentType.toUpperCase()} at ${barangay ? barangay + ', ' : ''}${municipality || 'Camarines Norte'}${coords}. Needs immediate assistance!`;
}
