import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
const L = './frontend/';
const A = await import(L + 'annexes.js');
const V = await import(L + 'validation.js');
const C = await import(L + 'consolidate.js');
const X = await import(L + 'xlsx.js');
const E = await import(L + 'exports.js');
const I = await import(L + 'ids.js');
console.log('modules load OK; annexes =', A.ANNEXES.length);
assert.equal(A.ANNEXES.length, 21);
assert.deepEqual(A.ANNEXES.map(a => a.no), Array.from({length: 21}, (_, i) => i + 1));
assert.equal(I.reportId('San Lorenzo Ruiz', 3), 'san-lorenzo-ruiz_3');
console.log('PASS schema + ids');

// ---------- helpers to build synthetic reports ----------
const { gridKey: gk } = A;
const mk = (annexNo, patch) => A.computeRow(A.ANNEX_BY_NO[annexNo], { ...A.emptyRow(A.ANNEX_BY_NO[annexNo]), ...patch });
const pop = (aF, aP, inF, inP, outF, outP, cumMult = 1) => ({
  affected_brgys: 'Poblacion, San Isidro, Mabini',
  ec_count: inF > 0 ? 2 : 0,
  [gk('affected', 'fam_cum')]: aF * cumMult, [gk('affected', 'fam_cur')]: aF, [gk('affected', 'per_cum')]: aP * cumMult, [gk('affected', 'per_cur')]: aP,
  [gk('inside', 'fam_cum')]: inF, [gk('inside', 'fam_cur')]: inF, [gk('inside', 'per_cum')]: inP, [gk('inside', 'per_cur')]: inP,
  [gk('outside', 'fam_cum')]: outF, [gk('outside', 'fam_cur')]: outF, [gk('outside', 'per_cum')]: outP, [gk('outside', 'per_cur')]: outP,
});
function report(muni, no, status, annexes, cas = {}) {
  return { municipality: muni, report_no: no, status, as_of: `2026-10-1${no}T18:00`, submitted_at: status === 'submitted' ? new Date(`2026-10-1${no}T18:30`) : null,
    annexes, casualty_counts: { dead: 0, injured: 0, ill: 0, missing: 0, unvalidated: 0, ...cas } };
}
const daetR1 = report('Daet', 1, 'submitted', {
  2: [mk(2, pop(100, 450, 40, 180, 10, 40))],
  4: [mk(4, { barangay: 'Bagasbas', totally: 3, partially: 10, cost: 500000 })],
  9: [mk(9, { provider: 'Coop', interrupted_at: '2026-10-11T02:00' })],
  8: [mk(8, { type: 'Road', classification: 'National', name: 'Daet-Mercedes', status: 'Not Passable', not_passable_at: '2026-10-11T04:00' })],
  19: [mk(19, { requiring: 100, assisted: 60 })],
  20: [mk(20, { cluster: 'Food', type: 'Food packs', qty: 200, unit: 'pack', cost_per_unit: 500 })],
}, { dead: 1, injured: 2, unvalidated: 1 });
const daetR2 = report('Daet', 2, 'submitted', {
  2: [mk(2, pop(150, 700, 60, 250, 10, 40, 1))],
  4: [mk(4, { barangay: 'Bagasbas', totally: 5, partially: 20, cost: 900000 })],
  19: [mk(19, { requiring: 150, assisted: 140 })],
}, { dead: 1, injured: 3, unvalidated: 0 });
const laboR1 = report('Labo', 1, 'submitted', { 2: [mk(2, pop(50, 200, 0, 0, 5, 20))], 5: [mk(5, { classification: 'Crops', type: 'Rice', area_no_recovery: 10, area_recovery: 5.5, value: 250000 })] });
const mercR2draft = report('Mercedes', 2, 'draft', { 2: [mk(2, pop(10, 40, 0, 0, 0, 0))] });
// Labo's cumulative persons DROP in report 2 -> should be flagged
const laboR2 = report('Labo', 2, 'submitted', { 2: [mk(2, pop(40, 150, 0, 0, 5, 20))] });
const MUNIS = ['Daet', 'Labo', 'Mercedes', 'Basud'];

// ---------- computed fields ----------
assert.equal(daetR1.annexes[4][0].total, 13);
assert.equal(daetR1.annexes[2][0][gk('displaced', 'per_cur')], 220);   // inside 180 + outside 40
assert.equal(laboR1.annexes[5][0].area_total, 15.5);
assert.equal(daetR1.annexes[19][0].pct, 60);
assert.equal(daetR1.annexes[20][0].amount, 100000);
console.log('PASS computed fields');

// ---------- validation ----------
const iss = (no, rows) => V.validateAnnex(A.ANNEX_BY_NO[no], rows);
assert.equal(iss(4, [mk(4, { barangay: 'X', totally: 1 })]).filter(i => i.severity === 'error').length, 0);
assert.ok(iss(4, [mk(4, { totally: 1 })]).some(i => i.field === 'barangay' && i.severity === 'error'), 'barangay required');
assert.ok(iss(4, [mk(4, { barangay: 'X', totally: -2 })]).some(i => /negative/.test(i.message)));
assert.ok(iss(4, [mk(4, { barangay: 'X', totally: 1.5 })]).some(i => /whole number/.test(i.message)));
assert.ok(iss(9, [mk(9, { provider: 'P', interrupted_at: '2026-10-11T10:00', restored_at: '2026-10-11T08:00' })]).some(i => /earlier/.test(i.message)));
assert.ok(iss(19, [mk(19, { requiring: 10, assisted: 12 })]).some(i => i.severity === 'error'));
// conditional fields: Crop-only fields must not be required/validated for livestock
assert.equal(iss(5, [mk(5, { classification: 'Livestock and Poultry', type: 'Pigs', heads: 30, value: 1 })]).filter(i => i.severity === 'error').length, 0);
// Annex 2: current > cumulative is an error
const bad2 = mk(2, { ...pop(10, 40, 0, 0, 0, 0), [gk('affected', 'per_cur')]: 99 });
assert.ok(iss(2, [bad2]).some(i => i.severity === 'error' && /Cumulative/.test(i.message)));
// persons < families is only a warning
const w2 = mk(2, pop(10, 5, 0, 0, 0, 0));
assert.ok(iss(2, [w2]).some(i => i.severity === 'warning'));
assert.ok(!iss(2, [w2]).some(i => i.severity === 'error'));
// blank rows ignored
assert.equal(iss(4, [A.emptyRow(A.ANNEX_BY_NO[4])]).length, 0);
console.log('PASS validation rules');

// ---------- whole-report validation: every annex needs content OR "nothing to report" ----------
let vr = V.validateReport({ 2: daetR1.annexes[2] }, {}, { casualties: [] });
assert.equal(vr.unresolved.length, 20, 'all but annex 2 unresolved');
const allNa = Object.fromEntries(A.ANNEXES.filter(a => a.no !== 2).map(a => [a.no, true]));
vr = V.validateReport({ 2: daetR1.annexes[2] }, allNa, { casualties: [] });
assert.equal(vr.unresolved.length, 0);
assert.equal(vr.errors, 0);
vr = V.validateReport({ 2: daetR1.annexes[2], 4: daetR1.annexes[4] }, { ...allNa }, { casualties: [] });
assert.ok(vr.issues.some(i => i.annex === 4 && /nothing to report/.test(i.message)), 'N/A + rows conflict');
vr = V.validateReport({ 2: daetR1.annexes[2] }, allNa, { casualties: [{ category: 'Dead', surname: 'Cruz', first_name: 'J', age: 70, sex: 'Male', address: 'B', cause: 'Drowning', source: 'MDRRMO', validated: 'No' }] });
assert.ok(vr.issues.some(i => i.annex === 3 && /not yet validated/.test(i.message)));
console.log('PASS report-level validation');

// ---------- cleanRows ----------
const cleaned = A.cleanRows(A.ANNEX_BY_NO[4], [{ ...A.emptyRow(A.ANNEX_BY_NO[4]) }, { ...A.emptyRow(A.ANNEX_BY_NO[4]), barangay: 'B', totally: '2', partially: '3' }]);
assert.equal(cleaned.length, 1);
assert.strictEqual(cleaned[0].total, 5);
assert.strictEqual(cleaned[0].totally, 2);
assert.equal(A.cleanRows(A.ANNEX_BY_NO[2], []).length, 1, 'single annex always has a row');
console.log('PASS cleanRows');

// ---------- consolidation ----------
const reports = [daetR1, daetR2, laboR1, laboR2, mercR2draft];
const c2 = C.consolidate(reports, MUNIS, 2);
assert.equal(c2.compliance.submitted, 2);        // Daet, Labo
assert.equal(c2.compliance.draft, 1);            // Mercedes
assert.equal(c2.compliance.missing, 1);          // Basud
assert.equal(c2.totals.affected_persons_cum, 700 + 150);
assert.equal(c2.totals.displaced_persons_cur, 290 + 20);
assert.equal(c2.totals.houses_total, 25 + 0);
assert.equal(c2.totals.dead, 1);
assert.equal(c2.totals.injured, 3);
assert.equal(c2.totals.families_requiring, 150);
assert.equal(c2.totals.pct_assisted, 93.3);
// carry-forward: ask for report 3 -> uses report 2 data, marked stale
const c3 = C.consolidate(reports, MUNIS, 3);
assert.equal(c3.compliance.submitted, 0);
assert.equal(c3.compliance.stale, 2);
assert.equal(c3.totals.affected_persons_cum, 850, 'carried forward');
// report 1 view: Daet + Labo only, Daet's R1 numbers
const c1 = C.consolidate(reports, MUNIS, 1);
assert.equal(c1.totals.affected_persons_cum, 450 + 200);
assert.equal(c1.totals.damage_cost_total, 500000 + 250000);
assert.equal(c1.totals.assistance_families_amount, 100000);
console.log('PASS consolidation + carry-forward');

// ---------- analysis ----------
const msgs = c2.flags.map(f => `${f.municipality}: ${f.message}`);
assert.ok(msgs.some(m => /^Basud: No report received/.test(m)), 'missing muni flagged');
assert.ok(msgs.some(m => /^Mercedes: .*draft/.test(m)), 'draft flagged');
assert.ok(msgs.some(m => /^Labo: Cumulative affected persons decreased from 200 \(Report 1\) to 150/.test(m)), 'cumulative drop flagged: ' + msgs.join(' | '));
assert.ok(!msgs.some(m => /^Daet: .*decreased/.test(m)), 'Daet increased, not flagged');
assert.equal(c2.flags[0].severity, 'error', 'errors sorted first');
// lifelines: Daet has open power outage + impassable road, hours counted to as_of
const ll = C.lifelineOutages(c1.municipalities);
assert.equal(ll.length, 2);
assert.equal(ll[0].sector, 'Power');
assert.equal(ll[0].hours, 16, 'power out 02:00 -> report as-of 18:00 = 16h');
assert.equal(ll[1].hours, 14, 'road closed 04:00 -> 14h');
console.log('PASS analysis flags + lifelines');

// ---------- narrative + attention + trend ----------
const para = C.buildNarrative({ name: 'Typhoon TEST' }, c2);
assert.ok(para.length >= 4);
assert.ok(/SITUATIONAL REPORT NO\. 2 — Typhoon TEST/.test(para[0]));
assert.ok(para.join(' ').includes('850 persons') || para.join(' ').includes('(850 persons)'), para.join('\n'));
assert.ok(c2.attention[0].municipality === 'Daet');
const tr = C.trendSeries(reports, MUNIS);
assert.deepEqual(tr.map(t => t.reportNo), [1, 2]);
assert.equal(tr[0].affected_persons, 650);
assert.equal(tr[1].affected_persons, 850);
console.log('PASS narrative, attention, trend');
console.log(para.join('\n\n'));

// ---------- Excel export ----------
import fs from 'node:fs';
const op = { name: 'Typhoon TEST' };
const sheetsM = E.municipalWorkbook({ operation: op, report: { ...daetR2, annexes: { ...daetR1.annexes, ...daetR2.annexes } } });
assert.equal(sheetsM.length, 22, 'cover + 21 annexes');
const bytesM = X.buildXlsx(sheetsM);
fs.writeFileSync('/tmp/municipal.xlsx', bytesM);
const casRows = [{ category: 'Dead', surname: 'Dela Cruz', first_name: 'Juan', middle_name: '', age: 70, sex: 'Male', address: 'Brgy X', cause: 'Drowning <flood> & "debris"', source: 'MDRRMO', validated: 'Yes', remarks: '' }];
const sheetsP = E.provincialWorkbook({ operation: op, consolidated: c2, casualtiesByMuni: { Daet: casRows } });
fs.writeFileSync('/tmp/provincial.xlsx', X.buildXlsx(sheetsP));
const sheetsP2 = E.provincialWorkbook({ operation: op, consolidated: c2 });
fs.writeFileSync('/tmp/provincial_aggregate.xlsx', X.buildXlsx(sheetsP2));
// sheet-name sanitising / dedupe
const names = new Set(); assert.equal(X.safeSheetName('Annex 6 - A/B:C?', names), 'Annex 6 - A B C'); assert.equal(X.safeSheetName('annex 6 - a b c', names), 'annex 6 - a b c (2)');
assert.equal(X.colName(0), 'A'); assert.equal(X.colName(25), 'Z'); assert.equal(X.colName(26), 'AA'); assert.equal(X.colName(701), 'ZZ'); assert.equal(X.colName(702), 'AAA');
console.log('PASS xlsx written:', bytesM.length, 'bytes');

// ---------- timeliness ----------
assert.equal(C.isLate({ submitted_at: new Date('2026-10-11T19:00') }, { due_at: '2026-10-11T18:00' }), true);
assert.equal(C.isLate({ submitted_at: new Date('2026-10-11T17:00') }, { due_at: '2026-10-11T18:00' }), false);
assert.equal(C.isLate({ submitted_at: null }, { due_at: '2026-10-11T18:00' }), null);
assert.equal(C.isLate({ submitted_at: new Date() }, { due_at: '' }), null);
console.log('PASS timeliness');
