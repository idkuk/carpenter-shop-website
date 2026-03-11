export const SERVICE_OFFERING_OPTIONS = [
  { id: 'bulk', label: 'Bulk Orders' },
  { id: 'repair', label: 'Repair & Maintenance' },
  { id: 'consultation', label: 'Consultation & Design' },
  { id: 'addons', label: 'Smart Add-ons' }
];

const OFFERING_LOOKUP = new Map(SERVICE_OFFERING_OPTIONS.map((item) => [item.id, item.label]));

export const normalizeOfferings = (value) => {
  if (!value) return [];
  const list = Array.isArray(value) ? value : [value];
  return list
    .map((item) => String(item || '').trim())
    .filter((item) => OFFERING_LOOKUP.has(item));
};

export const getOfferingLabel = (id) => OFFERING_LOOKUP.get(id) || id;
