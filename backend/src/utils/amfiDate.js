const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// Convert ISO date (YYYY-MM-DD) to AMFI format (DD-Mon-YYYY)
function isoToAMFI(iso) {
  const [y, m, d] = iso.split('-');
  return `${d}-${MONTHS[parseInt(m) - 1]}-${y}`;
}

// Convert AMFI date (DD-Mon-YYYY) to ISO
function amfiToISO(amfi) {
  const [d, mon, y] = amfi.split('-');
  const m = String(MONTHS.indexOf(mon) + 1).padStart(2, '0');
  return `${y}-${m}-${d.padStart(2, '0')}`;
}

module.exports = { isoToAMFI, amfiToISO };
