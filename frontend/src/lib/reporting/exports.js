// Builds the Excel workbooks required by MC 05 s.2025 §7 (PDF + Excel submission).
// Pure functions: return sheet definitions for xlsx.js. No DOM access here.
import { ANNEXES, annexColumns, REGION, PROVINCE, SHORT_TITLES } from './annexes.js';
import { S } from './xlsx.js';
import { formatDateTime, fmt, fmtPHP } from './consolidate.js';

const kindStyle = (kind) => (kind === 'int' ? S.INT : kind === 'money' ? S.MONEY : kind === 'number' ? S.DEC : S.TEXT);
const headerRow = (labels) => labels.map((v) => ({ v, s: S.HEADER }));
const widthFor = (header) => Math.min(40, Math.max(12, Math.round(String(header).length * 0.9)));

function annexSheet(annex, rowsByMuni, { withMunicipality, includeLocation }) {
  const cols = annexColumns(annex);
  const hasBrgy = annex.fields.some((f) => f.key === 'barangay');
  const loc = [];
  if (includeLocation && hasBrgy) loc.push('Region', 'Province', 'City/Municipality');
  const headers = (withMunicipality && !(includeLocation && hasBrgy) ? ['City/Municipality'] : []).concat(loc, cols.map((c) => c.header));
  // Barangay column should follow the three location columns; annexColumns already lists it first.
  const data = [];
  rowsByMuni.forEach(({ municipality, rows }) => {
    rows.forEach((row) => {
      const prefix = [];
      if (includeLocation && hasBrgy) prefix.push({ v: REGION, s: S.TEXT }, { v: PROVINCE, s: S.TEXT }, { v: municipality, s: S.TEXT });
      else if (withMunicipality) prefix.push({ v: municipality, s: S.TEXT });
      data.push(prefix.concat(cols.map((c) => ({ v: c.get(row), s: kindStyle(c.kind) }))));
    });
  });
  const title = [{ v: `Annex ${annex.no}: ${annex.title}`, s: S.TITLE }];
  const note = [{ v: annex.use, s: S.NOTE }];
  const lastCol = Math.max(headers.length, 1);
  return {
    name: `Annex ${annex.no} - ${SHORT_TITLES[annex.no]}`,
    rows: [title, note, [], headerRow(headers), ...(data.length ? data : [[{ v: 'No entries / nothing to report', s: S.NOTE }]])],
    widths: headers.map(widthFor),
    freezeRows: 4,
    merges: lastCol > 1 ? [`A2:${String.fromCharCode(64 + Math.min(lastCol, 26))}2`] : [],
  };
}

/** One municipality's report -> workbook (the file a MDRRMO sends to the PDRRMO / OCD). */
export function municipalWorkbook({ operation, report, casualties = null }) {
  const sheets = [{
    name: 'Cover',
    widths: [30, 50],
    rows: [
      [{ v: 'NDRRMC Reporting Template (MC 05, s. 2025)', s: S.TITLE }],
      [],
      [{ v: 'Operation', s: S.HEADER }, { v: operation?.name || '', s: S.TEXT }],
      [{ v: 'Report No.', s: S.HEADER }, { v: report.report_no, s: S.INT }],
      [{ v: 'Region', s: S.HEADER }, { v: REGION, s: S.TEXT }],
      [{ v: 'Province', s: S.HEADER }, { v: PROVINCE, s: S.TEXT }],
      [{ v: 'City/Municipality', s: S.HEADER }, { v: report.municipality, s: S.TEXT }],
      [{ v: 'As of', s: S.HEADER }, { v: formatDateTime(report.as_of), s: S.TEXT }],
      [{ v: 'Status', s: S.HEADER }, { v: report.status, s: S.TEXT }],
      [{ v: 'Submitted', s: S.HEADER }, { v: formatDateTime(report.submitted_at), s: S.TEXT }],
    ],
  }];
  ANNEXES.forEach((annex) => {
    if (annex.no === 3 && casualties == null) {
      const c = report.casualty_counts || {};
      sheets.push({
        name: `Annex 3 - ${SHORT_TITLES[3]}`,
        widths: [26, 14],
        rows: [
          [{ v: 'Annex 3: Casualties (aggregated)', s: S.TITLE }],
          [{ v: 'Personal details are not included in this copy (MC 05 s.2025: only aggregated numbers are disclosed).', s: S.NOTE }],
          [],
          headerRow(['Category', 'Count']),
          ...['Dead', 'Injured', 'Ill', 'Missing'].map((k) => [{ v: k, s: S.TEXT }, { v: Number(c[k.toLowerCase()] || 0), s: S.INT }]),
          [{ v: 'Not yet validated', s: S.TEXT }, { v: Number(c.unvalidated || 0), s: S.INT }],
        ],
      });
      return;
    }
    const rows = annex.no === 3 ? casualties : (report.annexes?.[annex.no] || []);
    sheets.push(annexSheet(annex, [{ municipality: report.municipality, rows }], { withMunicipality: false, includeLocation: true }));
  });
  return sheets;
}

/** Province-wide consolidated workbook for submission to OCD Region V / NDRRMOC. */
export function provincialWorkbook({ operation, consolidated, casualtiesByMuni = null }) {
  const t = consolidated.totals;
  const kv = (label, value, style = S.INT) => [{ v: label, s: S.TEXT }, { v: value, s: style }];
  const sheets = [{
    name: 'Province Summary',
    widths: [48, 22],
    rows: [
      [{ v: `${PROVINCE} — Consolidated NDRRMC Report`, s: S.TITLE }],
      [{ v: `${operation?.name || ''} · Report No. ${consolidated.reportNo} · as of ${formatDateTime(consolidated.asOf)}`, s: S.NOTE }],
      [{ v: `Municipalities reporting: ${consolidated.compliance.submitted} of ${consolidated.compliance.total}${consolidated.compliance.stale ? ` (${consolidated.compliance.stale} carried forward from earlier reports)` : ''}`, s: S.NOTE }],
      [],
      headerRow(['Indicator', 'Total']),
      kv('Affected barangays', t.affected_brgys),
      kv('Affected families (cumulative)', t.affected_families_cum),
      kv('Affected persons (cumulative)', t.affected_persons_cum),
      kv('Affected families (current)', t.affected_families_cur),
      kv('Affected persons (current)', t.affected_persons_cur),
      kv('Evacuation centers', t.ec_count),
      kv('Displaced families (current)', t.displaced_families_cur),
      kv('Displaced persons (current)', t.displaced_persons_cur),
      kv('Dead', t.dead), kv('Injured', t.injured), kv('Ill', t.ill), kv('Missing', t.missing),
      kv('Houses totally damaged', t.houses_totally), kv('Houses partially damaged', t.houses_partially),
      kv('Cost of damaged houses (PHP)', t.houses_cost, S.MONEY),
      kv('Agriculture damage and losses (PHP)', t.agri_value, S.MONEY),
      kv('Infrastructure damage (PHP)', t.infra_cost, S.MONEY),
      kv('Other assets damage (PHP)', t.other_assets_cost, S.MONEY),
      [{ v: 'Total reported damage (PHP)', s: S.TOTAL }, { v: t.damage_cost_total, s: S.TOTAL }],
      kv('Families requiring assistance', t.families_requiring),
      kv('Families assisted', t.families_assisted),
      kv('% of families assisted', t.pct_assisted ?? 0, S.DEC),
      kv('Assistance to families (PHP)', t.assistance_families_amount, S.MONEY),
      kv('Assistance to LGUs and agencies (PHP)', t.assistance_lgu_amount, S.MONEY),
    ],
  }];

  // per municipality matrix
  const mHeaders = ['City/Municipality', 'Status', 'Report No. used', 'As of', 'Affected families (cum)', 'Affected persons (cum)', 'Displaced persons (cur)', 'Dead', 'Injured', 'Ill', 'Missing', 'Houses damaged', 'Damage (PHP)', 'Families requiring assistance', 'Families assisted', '% assisted', 'Lifelines still down'];
  sheets.push({
    name: 'By Municipality',
    widths: mHeaders.map(widthFor),
    freezeRows: 1,
    rows: [headerRow(mHeaders), ...consolidated.municipalities.map((r) => {
      const m = r.metrics;
      const pct = m && m.families_requiring > 0 ? Math.round((m.families_assisted / m.families_requiring) * 1000) / 10 : null;
      const state = r.state === 'submitted' ? 'Submitted' : r.stale || !r.metrics ? `${r.state}${r.metrics ? ' (carried forward)' : ''}` : r.state;
      return [
        { v: r.name, s: S.TEXT }, { v: state, s: S.TEXT }, { v: r.usedReportNo ?? '', s: S.INT }, { v: r.asOf ? formatDateTime(r.asOf) : '', s: S.TEXT },
        ...(m ? [m.affected_families_cum, m.affected_persons_cum, m.displaced_persons_cur, m.dead, m.injured, m.ill, m.missing, m.houses_total, m.damage_cost_total, m.families_requiring, m.families_assisted].map((v) => ({ v, s: S.INT })) : Array(11).fill({ v: '', s: S.TEXT })),
        { v: pct ?? '', s: S.DEC }, { v: m ? m.lifelines_open : '', s: S.INT },
      ];
    })],
  });

  // consolidated annex rows with a Municipality column
  ANNEXES.forEach((annex) => {
    if (annex.no === 3 && !casualtiesByMuni) {
      sheets.push({
        name: `Annex 3 - ${SHORT_TITLES[3]}`,
        widths: [24, 10, 10, 10, 10, 16],
        rows: [
          [{ v: 'Annex 3: Casualties (aggregated only)', s: S.TITLE }], [],
          headerRow(['City/Municipality', 'Dead', 'Injured', 'Ill', 'Missing', 'Not yet validated']),
          ...consolidated.municipalities.filter((r) => r.metrics).map((r) => [{ v: r.name, s: S.TEXT }, ...[r.metrics.dead, r.metrics.injured, r.metrics.ill, r.metrics.missing, r.metrics.casualties_unvalidated].map((v) => ({ v, s: S.INT }))]),
        ],
      });
      return;
    }
    const rowsByMuni = consolidated.municipalities.filter((r) => r.data).map((r) => ({
      municipality: r.name,
      rows: annex.no === 3 ? (casualtiesByMuni?.[r.name] || []) : (r.data.annexes?.[annex.no] || []),
    }));
    sheets.push(annexSheet(annex, rowsByMuni, { withMunicipality: true, includeLocation: false }));
  });
  return sheets;
}

export const summaryLine = (c) => `${fmt(c.totals.affected_persons_cum)} persons affected · ${fmt(c.totals.displaced_persons_cur)} displaced · ${fmtPHP(c.totals.damage_cost_total)} damage`;
