// NDRRMC Memorandum Circular No. 05, s. 2025 — Reporting Templates (Annexes 1-21)
//
// This file is the single source of truth for the reporting module. The entry
// forms, validation, Excel/PDF exports and provincial consolidation are all
// generated from the definitions below, so a change in the NDRRMC template
// only needs to be made here.
//
// Every annex is stored as an array of rows: `annexes[<no>] = [row, ...]`.
// "single" annexes (2, 17, 19) always hold exactly one row.
//
// This module is intentionally dependency-free (no React, no Firebase).

export const REGION = 'Region V (Bicol Region)';
export const PROVINCE = 'Camarines Norte';

export const MODULES = [
  { id: 'impact', label: 'Impact' },
  { id: 'lifelines', label: 'Lifelines & Access' },
  { id: 'declarations', label: 'Declarations & Suspensions' },
  { id: 'evacuation', label: 'Evacuation' },
  { id: 'response', label: 'Response' },
];

const CLUSTERS = ['Food', 'Non-Food Items', 'WASH', 'Shelter', 'Health', 'Protection', 'Education', 'Logistics', 'Others'];
const UNITS = ['piece', 'pack', 'kit', 'liter', 'kilogram', 'set', 'unit', 'box', 'meter', 'building'];
const SOURCES = ['DSWD', 'DOH', 'LGU', 'NGO', 'Private sector', 'Foreign aid', 'Others'];

// ---- field helpers ---------------------------------------------------------
const text = (key, label, extra = {}) => ({ key, label, type: 'text', ...extra });
const area = (key, label, extra = {}) => ({ key, label, type: 'text', wide: true, ...extra });
const int = (key, label, extra = {}) => ({ key, label, type: 'number', int: true, min: 0, ...extra });
const money = (key, label, extra = {}) => ({ key, label, type: 'number', money: true, min: 0, ...extra });
const dec = (key, label, extra = {}) => ({ key, label, type: 'number', min: 0, ...extra });
const select = (key, label, options, extra = {}) => ({ key, label, type: 'select', options, ...extra });
const when = (key, label, extra = {}) => ({ key, label, type: 'datetime', ...extra });
const barangay = (extra = {}) => ({ key: 'barangay', label: 'Barangay', type: 'barangay', required: true, ...extra });
const remarks = (extra = {}) => area('remarks', 'Remarks', extra);

export const num = (v) => {
  if (v === '' || v == null) return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

// ---- grids (matrix inputs used by Annex 2 and 17) ---------------------------
const POP_COLS = [
  { key: 'fam_cum', label: 'Families — Cumulative' },
  { key: 'fam_cur', label: 'Families — Current' },
  { key: 'per_cum', label: 'Persons — Cumulative' },
  { key: 'per_cur', label: 'Persons — Current' },
];

const SEX_COLS = [
  { key: 'm_cum', label: 'Male — Cumulative' },
  { key: 'm_cur', label: 'Male — Current' },
  { key: 'f_cum', label: 'Female — Cumulative' },
  { key: 'f_cur', label: 'Female — Current' },
];

const AGE_ROWS = [
  { key: 'infant', label: 'Infant (0-6 mos)' },
  { key: 'toddler', label: 'Toddler (7 mos-2 y/o)' },
  { key: 'preschool', label: 'Preschooler (3-5 y/o)' },
  { key: 'school', label: 'School age (6-12 y/o)' },
  { key: 'teen', label: 'Teenage (13-17 y/o)' },
  { key: 'adult', label: 'Adult (18-59 y/o)' },
  { key: 'elderly', label: 'Elderly (60 and above)' },
];

const VULN_ROWS = [
  { key: 'pregnant', label: 'Pregnant women' },
  { key: 'lactating', label: 'Lactating mothers' },
  { key: 'child_headed', label: 'Child-headed family' },
  { key: 'single_headed', label: 'Single-headed family' },
  { key: 'solo_parent', label: 'Solo parent' },
  { key: 'pwd', label: 'Persons with disability (PWDs)' },
  { key: 'ip', label: 'Indigenous Peoples (IPs)' },
  { key: 'fourps', label: "4P's beneficiaries" },
];

export const gridKey = (row, col) => `${row}__${col}`;

// ---- the 21 annexes -----------------------------------------------------------
export const ANNEXES = [
  {
    no: 1, key: 'related_incidents', title: 'Related Incidents', module: 'impact', mode: 'rows',
    use: 'Secondary events caused by the primary hazard (e.g. fire after an earthquake). Do not list the primary hazard itself.',
    location: true,
    fields: [
      barangay(),
      select('incident_type', 'Type of incident', ['Landslide', 'Flooding', 'Fire', 'Storm surge', 'Tree/pole fall', 'Others'], { required: true }),
      when('occurred_at', 'Date/time of occurrence', { required: true }),
      area('description', 'Description', { required: true, hint: 'e.g. The landslide affected four residential houses' }),
      area('actions_taken', 'Actions taken'),
      remarks(),
    ],
  },
  {
    no: 2, key: 'affected_population', title: 'Affected Population', module: 'impact', mode: 'single',
    use: 'Affected and displaced families/persons. Cumulative = total since the start of the incident; Current = latest figures for the reporting period.',
    fields: [
      area('affected_brgys', 'Affected barangays (names, separated by commas)', { required: true }),
      int('ec_count', 'No. of evacuation centers opened / operational'),
      remarks(),
    ],
    grids: [{
      key: 'pop', title: 'Population figures', cols: POP_COLS,
      rows: [
        { key: 'affected', label: 'Affected' },
        { key: 'inside', label: 'Displaced — inside ECs' },
        { key: 'outside', label: 'Displaced — outside ECs' },
        { key: 'displaced', label: 'Total displaced', sumOf: ['inside', 'outside'] },
      ],
      cumCur: [['fam_cum', 'fam_cur'], ['per_cum', 'per_cur']],
    }],
  },
  {
    no: 3, key: 'casualties', title: 'Casualties', module: 'impact', mode: 'rows', restricted: true,
    use: 'Dead, injured, ill and missing (known identity only). Personal data must not be released to the public or media without next-of-kin consent; only aggregated numbers are disclosed.',
    fields: [
      select('category', 'Category', ['Dead', 'Injured', 'Ill', 'Missing'], { required: true }),
      text('surname', 'Surname', { required: true }),
      text('first_name', 'First name', { required: true }),
      text('middle_name', 'Middle name'),
      int('age', 'Age', { required: true, max: 120 }),
      select('sex', 'Sex', ['Male', 'Female'], { required: true }),
      text('address', 'Address (barangay)', { required: true }),
      area('cause', 'Cause (death / injury / illness / how missing)', { required: true }),
      text('source', 'Source of data', { required: true, hint: 'e.g. MDRRMO, LGU, DOH' }),
      select('validated', 'Validated?', ['Yes', 'No'], { required: true }),
      remarks(),
    ],
  },
  {
    no: 4, key: 'damaged_houses', title: 'Damaged Houses', module: 'impact', mode: 'rows', location: true,
    use: 'Totally and partially damaged houses, with cost estimate if available.',
    fields: [
      barangay(),
      int('totally', 'Totally damaged'),
      int('partially', 'Partially damaged'),
      { key: 'total', label: 'Total', type: 'number', int: true, computed: (r) => num(r.totally) + num(r.partially) },
      money('cost', 'Cost of damage (PHP)'),
      remarks(),
    ],
    atLeastOne: ['totally', 'partially'],
  },
  {
    no: 5, key: 'agriculture', title: 'Damage and Losses to Agriculture', module: 'impact', mode: 'rows',
    use: 'Disaggregate by sub-sector. Estimates support livelihood and recovery planning.',
    fields: [
      select('classification', 'Classification', ['Crops', 'Livestock and Poultry', 'Fisheries', 'Agricultural Infrastructure', 'Machineries and Equipment'], { required: true }),
      text('type', 'Type', { required: true, hint: 'e.g. Rice, Corn, Fishing, Irrigation System' }),
      int('affected_count', 'No. of farmers / fisherfolk affected'),
      dec('area_no_recovery', 'Crop area, no chance of recovery (ha)', { showIf: { field: 'classification', in: ['Crops'] } }),
      dec('area_recovery', 'Crop area, with chance of recovery (ha)', { showIf: { field: 'classification', in: ['Crops'] } }),
      { key: 'area_total', label: 'Total affected crop area (ha)', type: 'number', min: 0, computed: (r) => num(r.area_no_recovery) + num(r.area_recovery), showIf: { field: 'classification', in: ['Crops'] } },
      dec('production_loss_mt', 'Production loss (MT)', { showIf: { field: 'classification', in: ['Crops'] } }),
      int('heads', 'No. of heads (livestock / poultry)', { showIf: { field: 'classification', in: ['Livestock and Poultry'] } }),
      int('units_totally', 'Totally damaged (units)', { showIf: { field: 'classification', in: ['Agricultural Infrastructure', 'Machineries and Equipment'] } }),
      int('units_partially', 'Partially damaged (units)', { showIf: { field: 'classification', in: ['Agricultural Infrastructure', 'Machineries and Equipment'] } }),
      { key: 'units_total', label: 'Total damaged (units)', type: 'number', int: true, computed: (r) => num(r.units_totally) + num(r.units_partially), showIf: { field: 'classification', in: ['Agricultural Infrastructure', 'Machineries and Equipment'] } },
      money('value', 'Production loss / cost of damage (PHP)'),
    ],
  },
  {
    no: 6, key: 'infrastructure', title: 'Damage to Infrastructure', module: 'impact', mode: 'rows',
    use: 'Affected public/private assets, with estimated cost and functional impact.',
    fields: [
      select('type', 'Type', ['Road', 'Bridge', 'Flood Control', 'Government Facilities', 'Health Facilities', 'Schools', 'Cultural Heritage', 'Utility Service Facilities', 'Private'], { required: true }),
      select('classification', 'Classification', ['National', 'Local'], { required: true }),
      text('name', 'Name of infrastructure', { hint: 'e.g. Municipal Building' }),
      int('totally', 'Totally damaged'),
      int('partially', 'Partially damaged'),
      { key: 'total', label: 'Total', type: 'number', int: true, computed: (r) => num(r.totally) + num(r.partially) },
      select('unit', 'Unit', ['piece', 'building', 'meter', 'unit', 'Others']),
      dec('quantity', 'Quantity'),
      money('cost', 'Estimated cost (PHP)'),
      remarks(),
    ],
    atLeastOne: ['totally', 'partially'],
  },
  {
    no: 7, key: 'other_assets', title: 'Damage to Other Assets', module: 'impact', mode: 'rows',
    use: 'Assets not covered by housing, infrastructure or agriculture (vehicles, equipment, furniture, ICT, etc.).',
    fields: [
      select('classification', 'Classification', ['Vehicles', 'Aircraft', 'Weapons/Ammunition', 'Medicines', 'Hospital Equipment', 'IEC Materials', 'Furniture', 'Educational Materials', 'Electronics/ICT Equipment', 'Others'], { required: true }),
      text('particulars', 'Particulars / name of asset', { required: true }),
      select('unit', 'Unit', UNITS.concat('Others')),
      dec('quantity', 'Quantity'),
      money('cost', 'Estimated cost (PHP)'),
      remarks(),
    ],
  },
  {
    no: 8, key: 'roads_bridges', title: 'Status of Roads and Bridges', module: 'lifelines', mode: 'rows',
    use: 'Passability, restoration timeline, cause of disruption and alternate routes.',
    fields: [
      select('type', 'Type', ['Road', 'Bridge'], { required: true }),
      select('classification', 'Classification', ['National', 'Provincial', 'City/Municipal', 'Barangay'], { required: true }),
      text('name', 'Road section / bridge name', { required: true }),
      select('status', 'Status', ['Passable', 'Not Passable', 'Passable to Heavy Vehicles Only', 'Passable to Light Vehicles Only'], { required: true }),
      when('not_passable_at', 'Date/time not passable'),
      when('passable_at', 'Date/time passable'),
      area('remarks', 'Remarks (cause, clearing operations, detour)'),
    ],
    sequences: [['not_passable_at', 'passable_at']],
  },
  {
    no: 9, key: 'power', title: 'Status of Power Supply', module: 'lifelines', mode: 'rows',
    use: 'Interruptions, service provider and causes (toppled poles, damaged transformers, etc.).',
    fields: [
      text('provider', 'Service provider', { required: true, hint: 'electric cooperative / utility' }),
      when('interrupted_at', 'Date/time of interruption', { required: true }),
      when('restored_at', 'Date/time restored'),
      area('remarks', 'Remarks (cause, areas still affected, actions)'),
    ],
    sequences: [['interrupted_at', 'restored_at']],
    outage: { start: 'interrupted_at', end: 'restored_at' },
  },
  {
    no: 10, key: 'water', title: 'Status of Water Supply', module: 'lifelines', mode: 'rows',
    use: 'Service loss and restoration, utility responsible, rationing or contamination remarks.',
    fields: [
      text('provider', 'Service provider', { required: true, hint: 'water district / utility' }),
      when('interrupted_at', 'Date/time of interruption', { required: true }),
      when('restored_at', 'Date/time restored'),
      area('remarks', 'Remarks (cause, alternative sources, water trucks)'),
    ],
    sequences: [['interrupted_at', 'restored_at']],
    outage: { start: 'interrupted_at', end: 'restored_at' },
  },
  {
    no: 11, key: 'communications', title: 'Status of Communication Lines', module: 'lifelines', mode: 'rows',
    use: 'Affected telecom providers and restoration dates.',
    fields: [
      select('telecom', 'Telecom', ['PLDT', 'Globe', 'Smart', 'DITO', 'Others'], { required: true }),
      when('interrupted_at', 'Date/time of interruption', { required: true }),
      when('restored_at', 'Date/time restored'),
      area('remarks', 'Remarks (cause, scope: SMS/internet/all, alternatives)'),
    ],
    sequences: [['interrupted_at', 'restored_at']],
    outage: { start: 'interrupted_at', end: 'restored_at' },
  },
  {
    no: 12, key: 'airports', title: 'Status of Airports', module: 'lifelines', mode: 'rows',
    use: 'Closures and flight disruptions (coordination with CAAP).',
    fields: [
      text('name', 'Name of airport', { required: true }),
      when('non_operational_at', 'Date/time non-operational', { required: true }),
      when('operational_at', 'Date/time operational'),
      area('remarks', 'Remarks (reason, full/partial, cancelled flights)'),
    ],
    sequences: [['non_operational_at', 'operational_at']],
    outage: { start: 'non_operational_at', end: 'operational_at' },
  },
  {
    no: 13, key: 'seaports', title: 'Status of Seaports', module: 'lifelines', mode: 'rows',
    use: 'Stranded passengers/vessels and reasons for suspension (PCG, MARINA, LGUs).',
    fields: [
      text('name', 'Name of port', { required: true }),
      when('non_operational_at', 'Date/time non-operational / trips cancelled', { required: true }),
      when('operational_at', 'Date/time operational / trips resumed'),
      int('stranded_passengers', 'Stranded passengers'),
      int('stranded_pax_vessels', 'Passenger vessels'),
      int('stranded_cargo_vessels', 'Cargo vessels'),
      int('stranded_bancas', 'Motor bancas'),
      area('remarks', 'Remarks (cause, facilities, PCG/MARINA coordination)'),
    ],
    sequences: [['non_operational_at', 'operational_at']],
    outage: { start: 'non_operational_at', end: 'operational_at' },
  },
  {
    no: 14, key: 'work_suspension', title: 'Suspension of Work', module: 'declarations', mode: 'rows',
    use: 'Scope (government / private / all), issuing authority and modified work arrangements.',
    fields: [
      select('type', 'Type', ['Government', 'Private', 'All'], { required: true }),
      when('suspended_at', 'Date/time of suspension', { required: true }),
      when('resumed_at', 'Date/time of resumption'),
      area('remarks', 'Remarks (reason, issuing authority, coverage, conditions)'),
    ],
    sequences: [['suspended_at', 'resumed_at']],
  },
  {
    no: 15, key: 'class_suspension', title: 'Suspension of Classes', module: 'declarations', mode: 'rows',
    use: 'Suspensions, duration, resumption, remote learning and legal basis.',
    fields: [
      select('level', 'Level', ['Preschool/Kindergarten', 'Elementary', 'Secondary/High School', 'Senior High School', 'Tertiary/College/University', 'All Levels'], { required: true }),
      select('type', 'Type', ['Public', 'Private', 'All'], { required: true }),
      when('suspended_at', 'Date/time of suspension', { required: true }),
      when('resumed_at', 'Date/time of resumption'),
      area('remarks', 'Remarks (reason, issuing authority, scope, modality)'),
    ],
    sequences: [['suspended_at', 'resumed_at']],
  },
  {
    no: 16, key: 'state_of_calamity', title: 'Declaration of State of Calamity', module: 'declarations', mode: 'rows',
    use: 'Official declarations. A copy of the resolution must be submitted to the next higher DRRM Council.',
    fields: [
      select('type', 'Type', ['National', 'Regional', 'Provincial', 'City/Municipal'], { required: true }),
      text('resolution_no', 'Resolution number', { required: true }),
      { key: 'resolution_date', label: 'Resolution date', type: 'date', required: true },
      select('copy_sent', 'Copy sent to higher council?', ['Yes', 'No']),
      area('remarks', 'Remarks (reason, duration/coverage)'),
    ],
  },
  {
    no: 17, key: 'evac_people', title: 'Pre-emptive Evacuation (People)', module: 'evacuation', mode: 'single',
    use: 'Sex- and age-disaggregated evacuees and vulnerable groups, for targeted assistance and protection.',
    fields: [remarks({ label: 'Remarks (areas with highest displacement, EC conditions, medical needs, assistance needed)' })],
    grids: [
      {
        key: 'age', title: 'Sex and age distribution', cols: SEX_COLS,
        rows: AGE_ROWS.concat([{ key: 'total', label: 'Total', sumOf: AGE_ROWS.map((r) => r.key) }]),
        cumCur: [['m_cum', 'm_cur'], ['f_cum', 'f_cur']],
      },
      {
        key: 'vuln', title: 'Vulnerable groups', cols: SEX_COLS, rows: VULN_ROWS,
        cumCur: [['m_cum', 'm_cur'], ['f_cum', 'f_cur']],
      },
    ],
  },
  {
    no: 18, key: 'evac_animals', title: 'Pre-emptive Evacuation (Animals)', module: 'evacuation', mode: 'rows',
    use: 'Livestock and poultry evacuated, shelter sites and support needs.',
    fields: [
      select('classification', 'Classification', ['Livestock', 'Poultry'], { required: true }),
      select('type', 'Type', [], { required: true, optionsBy: { field: 'classification', map: { Livestock: ['Pig', 'Cow', 'Goat', 'Horse'], Poultry: ['Chicken', 'Duck'] } } }),
      int('quantity', 'No. of heads', { required: true }),
      area('remarks', 'Remarks (reason, shelter location, condition, gaps: feed/medicine/transport)'),
    ],
  },
  {
    no: 19, key: 'families_assisted', title: 'Families Assisted', module: 'response', mode: 'single',
    use: 'Families requiring assistance versus actually served; shows response gaps.',
    fields: [
      int('requiring', 'No. of families requiring assistance', { required: true }),
      int('assisted', 'No. of families assisted', { required: true }),
      {
        key: 'pct', label: '% of families assisted', type: 'number', suffix: '%',
        computed: (r) => (num(r.requiring) > 0 ? Math.round((num(r.assisted) / num(r.requiring)) * 1000) / 10 : 0),
      },
      remarks({ label: 'Remarks (type of assistance, reasons for gaps, source, target timeline)' }),
    ],
    custom: 'assistedNotAboveRequiring',
  },
  {
    no: 20, key: 'assistance_families', title: 'Assistance Provided to Families', module: 'response', mode: 'rows',
    use: 'Food and non-food items distributed directly to families.',
    fields: [
      select('cluster', 'Cluster', CLUSTERS, { required: true }),
      text('type', 'Type of item / service', { required: true, hint: 'e.g. Food packs, Hygiene kits' }),
      dec('qty', 'Qty', { required: true }),
      select('unit', 'Unit', UNITS, { required: true }),
      money('cost_per_unit', 'Cost per unit (PHP)'),
      { key: 'amount', label: 'Amount (PHP)', type: 'number', money: true, computed: (r) => num(r.qty) * num(r.cost_per_unit) },
      area('remarks', 'Remarks (source, priority recipients, delivery date, challenges)'),
    ],
    amountField: 'amount',
  },
  {
    no: 21, key: 'assistance_lgus', title: 'Assistance Provided to LGUs and Agencies', module: 'response', mode: 'rows',
    use: 'Support given to LGUs, national agencies or local responders.',
    fields: [
      text('recipient', 'Recipient (LGU / agency)', { required: true }),
      select('cluster', 'Cluster', CLUSTERS, { required: true }),
      text('type', 'Type of item / service', { required: true }),
      dec('qty', 'Qty', { required: true }),
      select('unit', 'Unit', UNITS, { required: true }),
      money('cost_per_unit', 'Cost per unit (PHP)'),
      { key: 'amount', label: 'Amount (PHP)', type: 'number', money: true, computed: (r) => num(r.qty) * num(r.cost_per_unit) },
      select('source', 'Source', SOURCES, { required: true }),
      remarks(),
    ],
    amountField: 'amount',
  },
];

export const ANNEX_BY_NO = Object.fromEntries(ANNEXES.map((a) => [a.no, a]));

// ---- field / row utilities ----------------------------------------------------
export function isShown(field, row) {
  if (!field.showIf) return true;
  return field.showIf.in.includes(row[field.showIf.field]);
}

export function optionsFor(field, row) {
  if (field.optionsBy) return field.optionsBy.map[row[field.optionsBy.field]] || [];
  return field.options || [];
}

export function emptyRow(annex) {
  const row = {};
  annex.fields.forEach((f) => { row[f.key] = ''; });
  (annex.grids || []).forEach((g) => {
    g.rows.forEach((r) => g.cols.forEach((c) => { row[gridKey(r.key, c.key)] = r.sumOf ? 0 : ''; }));
  });
  return annex.mode === 'single' ? computeRow(annex, row) : row;
}

/** Fill computed fields and grid totals. Returns a NEW row. */
export function computeRow(annex, input) {
  const row = { ...input };
  annex.fields.forEach((f) => {
    if (f.computed) row[f.key] = isShown(f, row) ? f.computed(row) : '';
  });
  (annex.grids || []).forEach((g) => {
    g.rows.filter((r) => r.sumOf).forEach((r) => {
      g.cols.forEach((c) => {
        row[gridKey(r.key, c.key)] = r.sumOf.reduce((s, k) => s + num(row[gridKey(k, c.key)]), 0);
      });
    });
  });
  return row;
}

/** A row is blank when no user-entered (non-computed) value is present. */
export function isBlankRow(annex, row) {
  const fieldVals = annex.fields.filter((f) => !f.computed).some((f) => row[f.key] !== '' && row[f.key] != null);
  if (fieldVals) return false;
  const gridVals = (annex.grids || []).some((g) =>
    g.rows.filter((r) => !r.sumOf).some((r) => g.cols.some((c) => {
      const v = row[gridKey(r.key, c.key)];
      return v !== '' && v != null && num(v) !== 0;
    }))
  );
  return !gridVals;
}

/** Normalise rows before saving: compute derived values, drop blank rows, coerce numbers. */
export function cleanRows(annex, rows) {
  const out = [];
  (rows || []).forEach((raw) => {
    const row = computeRow(annex, raw);
    annex.fields.forEach((f) => {
      if (!isShown(f, row)) { row[f.key] = ''; return; }
      if (f.type === 'number' && row[f.key] !== '' && row[f.key] != null) row[f.key] = num(row[f.key]);
    });
    (annex.grids || []).forEach((g) => g.rows.forEach((r) => g.cols.forEach((c) => {
      const k = gridKey(r.key, c.key);
      if (row[k] !== '' && row[k] != null) row[k] = num(row[k]);
    })));
    if (annex.mode === 'single' || !isBlankRow(annex, row)) out.push(row);
  });
  return annex.mode === 'single' ? (out.length ? [out[0]] : [emptyRow(annex)]) : out;
}

/** True when a "single" annex has any user-entered content. */
export function hasContent(annex, rows) {
  if (!rows || rows.length === 0) return false;
  return rows.some((r) => !isBlankRow(annex, r));
}

// ---- flattened columns for Excel/PDF -------------------------------------------
export function annexColumns(annex) {
  const ordered = annex.fields.filter((f) => f.key !== 'remarks').concat(annex.fields.filter((f) => f.key === 'remarks'));
  const flat = ordered.map((f) => ({
    header: f.label,
    kind: f.type === 'number' ? (f.money ? 'money' : f.int ? 'int' : 'number') : 'text',
    get: (row) => (row[f.key] === '' || row[f.key] == null ? null : row[f.key]),
  }));
  const grid = [];
  (annex.grids || []).forEach((g) => {
    g.rows.forEach((r) => g.cols.forEach((c) => {
      grid.push({
        header: `${r.label} — ${c.label}`,
        kind: 'int',
        get: (row) => (row[gridKey(r.key, c.key)] === '' || row[gridKey(r.key, c.key)] == null ? null : num(row[gridKey(r.key, c.key)])),
      });
    }));
  });
  const rem = flat.filter((c, i) => ordered[i].key === 'remarks');
  const rest = flat.filter((c, i) => ordered[i].key !== 'remarks');
  return rest.concat(grid, rem);
}

export const SHORT_TITLES = {
  1: 'Related Incidents', 2: 'Affected Population', 3: 'Casualties', 4: 'Damaged Houses', 5: 'Agriculture',
  6: 'Infrastructure', 7: 'Other Assets', 8: 'Roads and Bridges', 9: 'Power Supply', 10: 'Water Supply',
  11: 'Communications', 12: 'Airports', 13: 'Seaports', 14: 'Work Suspension', 15: 'Class Suspension',
  16: 'State of Calamity', 17: 'Evacuation (People)', 18: 'Evacuation (Animals)', 19: 'Families Assisted',
  20: 'Assistance to Families', 21: 'Assistance to LGUs',
};
