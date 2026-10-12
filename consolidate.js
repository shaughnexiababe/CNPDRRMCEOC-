// Provincial consolidation + analysis for municipal NDRRMC reports.
// Dependency-free so it can be unit-tested with plain Node.
import { gridKey, num } from './annexes.js';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export function toDate(v) {
  if (v == null || v === '') return null;
  if (v instanceof Date) return v;
  if (typeof v.toDate === 'function') return v.toDate();
  if (typeof v === 'object' && typeof v.seconds === 'number') return new Date(v.seconds * 1000);
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatDateTime(v) {
  const d = toDate(v);
  if (!d) return '—';
  let h = d.getHours();
  const ap = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}, ${h}:${mm} ${ap}`;
}

export const fmt = (n) => Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 0 });
export const fmtPHP = (n) => `PHP ${Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;

export function countBarangays(textValue) {
  return String(textValue || '').split(/[,;\n]/).map((s) => s.trim()).filter(Boolean).length;
}

// ---- casualties --------------------------------------------------------------
export function casualtySummary(rows) {
  const s = { dead: 0, injured: 0, ill: 0, missing: 0, validated: 0, unvalidated: 0, total: 0 };
  (rows || []).forEach((r) => {
    const k = String(r.category || '').toLowerCase();
    if (k in s) s[k] += 1;
    s.total += 1;
    if (r.validated === 'Yes') s.validated += 1; else s.unvalidated += 1;
  });
  return s;
}

// ---- per-report metrics -----------------------------------------------------------
const sumRows = (rows, key) => (rows || []).reduce((s, r) => s + num(r[key]), 0);

export function reportMetrics(report) {
  const a = report?.annexes || {};
  const rows = (n) => a[n] || [];
  const one = (n) => (a[n] && a[n][0]) || {};
  const p = one(2);
  const g = (row, r, c) => num(row[gridKey(r, c)]);
  const cas = report?.casualty_counts || { dead: 0, injured: 0, ill: 0, missing: 0, unvalidated: 0 };
  const ev = one(17);
  const fa = one(19);

  const agriByClass = {};
  rows(5).forEach((r) => { agriByClass[r.classification || 'Others'] = (agriByClass[r.classification || 'Others'] || 0) + num(r.value); });
  const infraByType = {};
  rows(6).forEach((r) => { infraByType[r.type || 'Others'] = (infraByType[r.type || 'Others'] || 0) + num(r.cost); });

  const isOpen = (annexNo, endKey) => rows(annexNo).filter((r) => !r[endKey]).length;
  const roadsNotPassable = rows(8).filter((r) => r.status === 'Not Passable').length;
  const roadsLimited = rows(8).filter((r) => r.status && r.status !== 'Passable' && r.status !== 'Not Passable').length;

  const m = {
    affected_brgys: countBarangays(p.affected_brgys),
    affected_families_cum: g(p, 'affected', 'fam_cum'),
    affected_families_cur: g(p, 'affected', 'fam_cur'),
    affected_persons_cum: g(p, 'affected', 'per_cum'),
    affected_persons_cur: g(p, 'affected', 'per_cur'),
    ec_count: num(p.ec_count),
    inside_families_cur: g(p, 'inside', 'fam_cur'),
    inside_persons_cur: g(p, 'inside', 'per_cur'),
    outside_families_cur: g(p, 'outside', 'fam_cur'),
    outside_persons_cur: g(p, 'outside', 'per_cur'),
    displaced_families_cur: g(p, 'displaced', 'fam_cur'),
    displaced_persons_cur: g(p, 'displaced', 'per_cur'),
    displaced_families_cum: g(p, 'displaced', 'fam_cum'),
    displaced_persons_cum: g(p, 'displaced', 'per_cum'),

    dead: num(cas.dead), injured: num(cas.injured), ill: num(cas.ill), missing: num(cas.missing),
    casualties_unvalidated: num(cas.unvalidated),

    houses_totally: sumRows(rows(4), 'totally'),
    houses_partially: sumRows(rows(4), 'partially'),
    houses_cost: sumRows(rows(4), 'cost'),
    agri_value: sumRows(rows(5), 'value'),
    agri_farmers: sumRows(rows(5), 'affected_count'),
    agri_area_ha: sumRows(rows(5), 'area_total'),
    infra_units: sumRows(rows(6), 'total'),
    infra_cost: sumRows(rows(6), 'cost'),
    other_assets_cost: sumRows(rows(7), 'cost'),

    roads_not_passable: roadsNotPassable,
    roads_limited: roadsLimited,
    power_open: isOpen(9, 'restored_at'),
    water_open: isOpen(10, 'restored_at'),
    comms_open: isOpen(11, 'restored_at'),
    airports_closed: isOpen(12, 'operational_at'),
    seaports_closed: isOpen(13, 'operational_at'),
    stranded_passengers: sumRows(rows(13), 'stranded_passengers'),
    stranded_vessels: sumRows(rows(13), 'stranded_pax_vessels') + sumRows(rows(13), 'stranded_cargo_vessels') + sumRows(rows(13), 'stranded_bancas'),
    work_suspensions_open: rows(14).filter((r) => !r.resumed_at).length,
    class_suspensions_open: rows(15).filter((r) => !r.resumed_at).length,
    soc_declared: rows(16).length,
    related_incidents: rows(1).length,

    evac_persons_cur: g(ev, 'total', 'm_cur') + g(ev, 'total', 'f_cur'),
    evac_persons_cum: g(ev, 'total', 'm_cum') + g(ev, 'total', 'f_cum'),
    evac_vulnerable_cur: ['pregnant', 'lactating', 'child_headed', 'single_headed', 'solo_parent', 'pwd', 'ip', 'fourps']
      .reduce((s, k) => s + g(ev, k, 'm_cur') + g(ev, k, 'f_cur'), 0),
    evac_children_cur: ['infant', 'toddler', 'preschool', 'school', 'teen'].reduce((s, k) => s + g(ev, k, 'm_cur') + g(ev, k, 'f_cur'), 0),
    evac_elderly_cur: g(ev, 'elderly', 'm_cur') + g(ev, 'elderly', 'f_cur'),
    evac_animals: sumRows(rows(18), 'quantity'),

    families_requiring: num(fa.requiring),
    families_assisted: num(fa.assisted),
    assistance_families_amount: sumRows(rows(20), 'amount'),
    assistance_lgu_amount: sumRows(rows(21), 'amount'),
  };
  m.houses_total = m.houses_totally + m.houses_partially;
  m.damage_cost_total = m.houses_cost + m.agri_value + m.infra_cost + m.other_assets_cost;
  m.lifelines_open = m.power_open + m.water_open + m.comms_open + m.airports_closed + m.seaports_closed;
  m.casualties_total = m.dead + m.injured + m.ill + m.missing;
  return { ...m, agri_by_class: agriByClass, infra_by_type: infraByType };
}

const SUM_KEYS = [
  'affected_brgys', 'affected_families_cum', 'affected_families_cur', 'affected_persons_cum', 'affected_persons_cur', 'ec_count',
  'inside_families_cur', 'inside_persons_cur', 'outside_families_cur', 'outside_persons_cur',
  'displaced_families_cur', 'displaced_persons_cur', 'displaced_families_cum', 'displaced_persons_cum',
  'dead', 'injured', 'ill', 'missing', 'casualties_unvalidated', 'casualties_total',
  'houses_totally', 'houses_partially', 'houses_total', 'houses_cost', 'agri_value', 'agri_farmers', 'agri_area_ha',
  'infra_units', 'infra_cost', 'other_assets_cost', 'damage_cost_total',
  'roads_not_passable', 'roads_limited', 'power_open', 'water_open', 'comms_open', 'airports_closed', 'seaports_closed', 'lifelines_open',
  'stranded_passengers', 'stranded_vessels', 'work_suspensions_open', 'class_suspensions_open', 'soc_declared', 'related_incidents',
  'evac_persons_cur', 'evac_persons_cum', 'evac_vulnerable_cur', 'evac_children_cur', 'evac_elderly_cur', 'evac_animals',
  'families_requiring', 'families_assisted', 'assistance_families_amount', 'assistance_lgu_amount',
];

const mergeMaps = (list) => list.reduce((acc, m) => { Object.entries(m || {}).forEach(([k, v]) => { acc[k] = (acc[k] || 0) + v; }); return acc; }, {});

// ---- selecting which report counts for each municipality ----------------------------
function latestSubmitted(reports, upTo) {
  return reports
    .filter((r) => r.status === 'submitted' && r.report_no <= upTo)
    .sort((x, y) => y.report_no - x.report_no)[0] || null;
}

/**
 * @param {object[]} reports  all report docs of an operation (every municipality, every report no.)
 * @param {string[]} municipalities
 * @param {number} reportNo   the reporting cycle being consolidated
 */
export function consolidate(reports, municipalities, reportNo) {
  const byMuni = {};
  reports.forEach((r) => { (byMuni[r.municipality] = byMuni[r.municipality] || []).push(r); });

  const rows = municipalities.map((name) => {
    const list = byMuni[name] || [];
    const data = latestSubmitted(list, reportNo);
    const current = list.find((r) => r.report_no === reportNo) || null;
    let state;
    if (current && current.status === 'submitted') state = 'submitted';
    else if (current && current.status === 'returned') state = 'returned';
    else if (current && current.status === 'draft') state = 'draft';
    else state = 'missing';
    const stale = !!data && data.report_no < reportNo;
    return {
      name, state, stale, data, current,
      usedReportNo: data ? data.report_no : null,
      submittedAt: data ? toDate(data.submitted_at) : null,
      asOf: data ? toDate(data.as_of) : null,
      metrics: data ? reportMetrics(data) : null,
    };
  });

  const included = rows.filter((r) => r.metrics);
  const totals = {};
  SUM_KEYS.forEach((k) => { totals[k] = included.reduce((s, r) => s + num(r.metrics[k]), 0); });
  totals.agri_by_class = mergeMaps(included.map((r) => r.metrics.agri_by_class));
  totals.infra_by_type = mergeMaps(included.map((r) => r.metrics.infra_by_type));
  totals.pct_assisted = totals.families_requiring > 0 ? Math.round((totals.families_assisted / totals.families_requiring) * 1000) / 10 : null;
  totals.families_unserved = Math.max(0, totals.families_requiring - totals.families_assisted);

  const compliance = { submitted: 0, stale: 0, draft: 0, returned: 0, missing: 0, total: municipalities.length };
  rows.forEach((r) => {
    if (r.state === 'submitted') compliance.submitted += 1;
    else if (r.state === 'returned') compliance.returned += 1;
    else if (r.state === 'draft') compliance.draft += 1;
    else compliance.missing += 1;
    if (r.stale) compliance.stale += 1;
  });

  const asOfDates = included.map((r) => r.asOf).filter(Boolean).map((d) => d.getTime());
  const asOf = asOfDates.length ? new Date(Math.max(...asOfDates)) : null;

  const lifelines = lifelineOutages(rows);
  const flags = qualityFlags(rows, reports, reportNo);
  const attention = attentionRanking(rows);

  return { reportNo, asOf, totals, municipalities: rows, compliance, lifelines, flags, attention };
}

// ---- lifelines: open outages, with how long they've run ---------------------------------
const LIFELINE_ANNEXES = [
  [9, 'Power', 'restored_at', 'interrupted_at', 'provider'],
  [10, 'Water', 'restored_at', 'interrupted_at', 'provider'],
  [11, 'Communications', 'restored_at', 'interrupted_at', 'telecom'],
  [12, 'Airport', 'operational_at', 'non_operational_at', 'name'],
  [13, 'Seaport', 'operational_at', 'non_operational_at', 'name'],
];

export function lifelineOutages(muniRows) {
  const out = [];
  muniRows.forEach((r) => {
    if (!r.data) return;
    const ref = toDate(r.data.as_of) || new Date();
    LIFELINE_ANNEXES.forEach(([no, label, endKey, startKey, nameKey]) => {
      (r.data.annexes?.[no] || []).filter((row) => !row[endKey]).forEach((row) => {
        const start = toDate(row[startKey]);
        const hours = start ? Math.max(0, Math.round((ref - start) / 36e5)) : null;
        out.push({ municipality: r.name, sector: label, provider: row[nameKey] || '', since: start, hours, remarks: row.remarks || '' });
      });
    });
    (r.data.annexes?.[8] || []).filter((row) => row.status === 'Not Passable').forEach((row) => {
      const start = toDate(row.not_passable_at);
      out.push({
        municipality: r.name, sector: row.type || 'Road', provider: row.name || '', since: start,
        hours: start ? Math.max(0, Math.round((ref - start) / 36e5)) : null, remarks: row.remarks || '',
      });
    });
  });
  return out.sort((a, b) => (b.hours ?? -1) - (a.hours ?? -1));
}

// ---- data quality / compliance flags ------------------------------------------------
export function qualityFlags(muniRows, allReports, reportNo) {
  const flags = [];
  const add = (municipality, severity, message) => flags.push({ municipality, severity, message });
  muniRows.forEach((r) => {
    if (r.state === 'missing' && !r.data) add(r.name, 'error', `No report received yet for Report No. ${reportNo}.`);
    else if (r.state === 'missing') add(r.name, 'warning', `Report No. ${reportNo} not yet submitted — figures shown are from Report No. ${r.usedReportNo}.`);
    else if (r.state === 'draft') add(r.name, 'warning', `Report No. ${reportNo} is still a draft${r.data ? ` — figures shown are from Report No. ${r.usedReportNo}` : ''}.`);
    else if (r.state === 'returned') add(r.name, 'warning', `Report No. ${reportNo} was returned for correction${r.current?.return_reason ? `: ${r.current.return_reason}` : ''}.`);
    const m = r.metrics;
    if (!m) return;
    if (m.affected_persons_cur < m.affected_families_cur) add(r.name, 'warning', 'Affected persons are fewer than affected families (current).');
    if (m.displaced_persons_cur > m.affected_persons_cur) add(r.name, 'warning', 'Displaced persons exceed affected persons (current).');
    if (m.families_assisted > m.families_requiring) add(r.name, 'error', 'Families assisted exceed families requiring assistance.');
    if (m.casualties_unvalidated > 0) add(r.name, 'warning', `${m.casualties_unvalidated} casualty record(s) not yet validated.`);
    if (m.inside_persons_cur > 0 && m.ec_count === 0) add(r.name, 'warning', 'Evacuees are inside ECs but the number of ECs is 0.');

    // Cumulative figures must never go down between submitted reports of the same municipality.
    const prev = allReports
      .filter((x) => x.municipality === r.name && x.status === 'submitted' && x.report_no < r.usedReportNo)
      .sort((a, b) => b.report_no - a.report_no)[0];
    if (prev) {
      const pm = reportMetrics(prev);
      [['affected_persons_cum', 'Cumulative affected persons'], ['affected_families_cum', 'Cumulative affected families'], ['dead', 'Reported deaths']].forEach(([k, label]) => {
        if (m[k] < pm[k]) add(r.name, 'warning', `${label} decreased from ${fmt(pm[k])} (Report ${prev.report_no}) to ${fmt(m[k])} (Report ${r.usedReportNo}). Confirm or explain in the remarks.`);
      });
    }
  });
  return flags.sort((a, b) => (a.severity === b.severity ? 0 : a.severity === 'error' ? -1 : 1));
}

// ---- which municipalities need attention first ---------------------------------------
export function attentionRanking(muniRows) {
  return muniRows.filter((r) => r.metrics).map((r) => {
    const m = r.metrics;
    const reasons = [];
    let score = 0;
    if (m.dead + m.missing > 0) { score += (m.dead + m.missing) * 10; reasons.push(`${m.dead} dead, ${m.missing} missing`); }
    if (m.displaced_persons_cur > 0) { score += m.displaced_persons_cur / 100; reasons.push(`${fmt(m.displaced_persons_cur)} displaced`); }
    const gap = Math.max(0, m.families_requiring - m.families_assisted);
    if (gap > 0) { score += gap / 25; reasons.push(`${fmt(gap)} families not yet assisted`); }
    if (m.lifelines_open > 0) { score += m.lifelines_open * 3; reasons.push(`${m.lifelines_open} lifeline(s) still down`); }
    if (m.roads_not_passable > 0) { score += m.roads_not_passable * 2; reasons.push(`${m.roads_not_passable} road/bridge not passable`); }
    if (m.injured + m.ill > 0) { score += (m.injured + m.ill) * 2; reasons.push(`${m.injured + m.ill} injured/ill`); }
    return { municipality: r.name, score: Math.round(score * 10) / 10, reasons };
  }).filter((x) => x.reasons.length).sort((a, b) => b.score - a.score);
}

// ---- trend across report numbers --------------------------------------------------------
export function trendSeries(reports, municipalities) {
  const max = reports.reduce((m, r) => Math.max(m, r.report_no || 0), 0);
  const series = [];
  for (let n = 1; n <= max; n += 1) {
    const c = consolidate(reports, municipalities, n);
    if (c.compliance.submitted === 0) continue;
    series.push({
      reportNo: n, label: `Report ${n}`, asOf: c.asOf,
      affected_persons: c.totals.affected_persons_cum,
      displaced_persons: c.totals.displaced_persons_cur,
      casualties: c.totals.dead + c.totals.missing,
      houses_damaged: c.totals.houses_total,
      damage_cost: c.totals.damage_cost_total,
      pct_assisted: c.totals.pct_assisted,
      reporting: c.compliance.submitted,
    });
  }
  return series;
}

// ---- draft situational narrative (deterministic; staff review before use) ---------------
export function buildNarrative(operation, c) {
  if (!c || c.compliance.submitted + c.compliance.stale === 0) return [];
  const t = c.totals;
  const name = operation?.name || 'the current operation';
  const paras = [];
  const reporting = `${c.compliance.submitted} of ${c.compliance.total} municipalities have submitted Report No. ${c.reportNo}`;
  paras.push(`SITUATIONAL REPORT NO. ${c.reportNo} — ${name}. As of ${formatDateTime(c.asOf)}, ${reporting}${c.compliance.stale ? ` (figures for ${c.compliance.stale} municipality(ies) are carried forward from earlier reports)` : ''}.`);

  if (t.affected_persons_cum > 0 || t.affected_families_cum > 0) {
    const top = [...c.municipalities].filter((r) => r.metrics && r.metrics.affected_persons_cum > 0)
      .sort((a, b) => b.metrics.affected_persons_cum - a.metrics.affected_persons_cum).slice(0, 3).map((r) => r.name);
    paras.push(`A cumulative ${fmt(t.affected_families_cum)} families (${fmt(t.affected_persons_cum)} persons) in ${fmt(t.affected_brgys)} barangays have been affected${top.length ? `, most heavily in ${top.join(', ')}` : ''}. Currently, ${fmt(t.displaced_families_cur)} families (${fmt(t.displaced_persons_cur)} persons) remain displaced — ${fmt(t.inside_persons_cur)} persons in ${fmt(t.ec_count)} evacuation center(s) and ${fmt(t.outside_persons_cur)} outside.`);
  }
  if (t.casualties_total > 0) {
    paras.push(`Reported casualties: ${fmt(t.dead)} dead, ${fmt(t.injured)} injured, ${fmt(t.ill)} ill and ${fmt(t.missing)} missing${t.casualties_unvalidated ? `; ${fmt(t.casualties_unvalidated)} record(s) are still pending validation` : ''}.`);
  }
  if (t.houses_total > 0 || t.damage_cost_total > 0) {
    const dmg = [];
    if (t.houses_total > 0) dmg.push(`${fmt(t.houses_totally)} houses totally and ${fmt(t.houses_partially)} partially damaged`);
    if (t.agri_value > 0) dmg.push(`agriculture damage and losses of ${fmtPHP(t.agri_value)}`);
    if (t.infra_cost > 0) dmg.push(`infrastructure damage of ${fmtPHP(t.infra_cost)}`);
    if (t.other_assets_cost > 0) dmg.push(`damage to other assets of ${fmtPHP(t.other_assets_cost)}`);
    paras.push(`Damage: ${dmg.length ? dmg.join('; ') : 'cost estimates are not yet available'}.${t.damage_cost_total > 0 ? ` Total reported damage is ${fmtPHP(t.damage_cost_total)}.` : ''}`);
  }
  const lifelineBits = [];
  if (t.roads_not_passable) lifelineBits.push(`${t.roads_not_passable} road/bridge section(s) not passable`);
  if (t.power_open) lifelineBits.push(`${t.power_open} power interruption(s) unresolved`);
  if (t.water_open) lifelineBits.push(`${t.water_open} water service interruption(s) unresolved`);
  if (t.comms_open) lifelineBits.push(`${t.comms_open} communication outage(s) unresolved`);
  if (t.seaports_closed) lifelineBits.push(`${t.seaports_closed} seaport(s) non-operational (${fmt(t.stranded_passengers)} stranded passengers)`);
  if (t.airports_closed) lifelineBits.push(`${t.airports_closed} airport(s) non-operational`);
  if (lifelineBits.length) paras.push(`Lifelines and access: ${lifelineBits.join('; ')}.`);

  const supBits = [];
  if (t.work_suspensions_open) supBits.push(`work suspension in effect in ${t.work_suspensions_open} instance(s)`);
  if (t.class_suspensions_open) supBits.push(`class suspension in effect in ${t.class_suspensions_open} instance(s)`);
  if (t.soc_declared) supBits.push(`${t.soc_declared} State of Calamity declaration(s) recorded`);
  if (supBits.length) paras.push(`Declarations and suspensions: ${supBits.join('; ')}.`);

  if (t.families_requiring > 0) {
    const given = [];
    if (t.assistance_families_amount > 0) given.push(`assistance provided to families totals ${fmtPHP(t.assistance_families_amount)}`);
    if (t.assistance_lgu_amount > 0) given.push(`assistance to LGUs and agencies totals ${fmtPHP(t.assistance_lgu_amount)}`);
    paras.push(`Response: ${fmt(t.families_assisted)} of ${fmt(t.families_requiring)} families requiring assistance have been served (${t.pct_assisted}%), leaving ${fmt(t.families_unserved)} families to be reached${given.length ? `; ${given.join('; ')}` : ''}.`);
  }
  if (c.attention.length) {
    paras.push(`Priority attention: ${c.attention.slice(0, 3).map((a) => `${a.municipality} (${a.reasons.slice(0, 2).join('; ')})`).join('; ')}.`);
  }
  return paras;
}

/** Was the report submitted after the cycle deadline? Returns null when there is no deadline/submission. */
export function isLate(report, cycle) {
  const due = toDate(cycle?.due_at);
  const at = toDate(report?.submitted_at);
  if (!due || !at) return null;
  return at.getTime() > due.getTime();
}
