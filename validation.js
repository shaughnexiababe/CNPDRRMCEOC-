// Validation for NDRRMC reporting annexes. Dependency-free.
import { ANNEXES, ANNEX_BY_NO, gridKey, isShown, num, hasContent, isBlankRow } from './annexes.js';

/**
 * @typedef {{ annex:number, row:number|null, field:string|null, severity:'error'|'warning', message:string }} Issue
 */

const issue = (annex, row, field, severity, message) => ({ annex, row, field, severity, message });
const filled = (v) => v !== '' && v != null;

/** Validate the rows of ONE annex. Returns Issue[]. */
export function validateAnnex(annex, rows) {
  const out = [];
  const A = annex.no;
  (rows || []).forEach((row, i) => {
    if (annex.mode === 'rows' && isBlankRow(annex, row)) return; // blank rows are dropped on save
    annex.fields.forEach((f) => {
      if (f.computed || !isShown(f, row)) return;
      const v = row[f.key];
      if (f.required && !filled(v)) {
        out.push(issue(A, i, f.key, 'error', `${f.label} is required.`));
        return;
      }
      if (!filled(v)) return;
      if (f.type === 'number') {
        const n = Number(v);
        if (!Number.isFinite(n)) out.push(issue(A, i, f.key, 'error', `${f.label} must be a number.`));
        else {
          if (f.min != null && n < f.min) out.push(issue(A, i, f.key, 'error', `${f.label} cannot be negative.`));
          if (f.max != null && n > f.max) out.push(issue(A, i, f.key, 'error', `${f.label} cannot exceed ${f.max}.`));
          if (f.int && !Number.isInteger(n)) out.push(issue(A, i, f.key, 'error', `${f.label} must be a whole number.`));
        }
      }
    });

    (annex.sequences || []).forEach(([a, b]) => {
      if (filled(row[a]) && filled(row[b]) && new Date(row[b]) < new Date(row[a])) {
        const la = annex.fields.find((f) => f.key === a)?.label || a;
        const lb = annex.fields.find((f) => f.key === b)?.label || b;
        out.push(issue(A, i, b, 'error', `${lb} cannot be earlier than ${la}.`));
      }
    });

    if (annex.atLeastOne && annex.atLeastOne.every((k) => num(row[k]) === 0)) {
      out.push(issue(A, i, annex.atLeastOne[0], 'warning', 'Row has no damaged units entered.'));
    }

    // Grids: negative / non-integer and current <= cumulative
    (annex.grids || []).forEach((g) => {
      g.rows.filter((r) => !r.sumOf).forEach((r) => {
        g.cols.forEach((c) => {
          const v = row[gridKey(r.key, c.key)];
          if (!filled(v)) return;
          const n = Number(v);
          if (!Number.isFinite(n) || n < 0 || !Number.isInteger(n)) {
            out.push(issue(A, i, gridKey(r.key, c.key), 'error', `${r.label} / ${c.label} must be a whole number of 0 or more.`));
          }
        });
        (g.cumCur || []).forEach(([cum, cur]) => {
          if (num(row[gridKey(r.key, cur)]) > num(row[gridKey(r.key, cum)])) {
            const colLabel = g.cols.find((c) => c.key === cur)?.label || cur;
            out.push(issue(A, i, gridKey(r.key, cur), 'error', `${r.label}: ${colLabel} is higher than its Cumulative figure.`));
          }
        });
      });
    });

    // Annex-specific checks
    if (A === 2) {
      const g = (r, c) => num(row[gridKey(r, c)]);
      ['affected', 'inside', 'outside'].forEach((r) => {
        ['cum', 'cur'].forEach((t) => {
          if (g(r, `per_${t}`) < g(r, `fam_${t}`)) {
            out.push(issue(A, i, gridKey(r, `per_${t}`), 'warning', `Persons are fewer than families in "${r}" (${t === 'cum' ? 'cumulative' : 'current'}).`));
          }
        });
      });
      if (g('displaced', 'per_cur') > g('affected', 'per_cur')) {
        out.push(issue(A, i, gridKey('displaced', 'per_cur'), 'warning', 'Displaced persons exceed affected persons (current).'));
      }
      if ((g('inside', 'per_cur') > 0 || g('inside', 'fam_cur') > 0) && num(row.ec_count) === 0) {
        out.push(issue(A, i, 'ec_count', 'warning', 'Families are inside evacuation centers but the number of ECs is 0.'));
      }
    }
    if (A === 19 && num(row.assisted) > num(row.requiring)) {
      out.push(issue(A, i, 'assisted', 'error', 'Families assisted cannot exceed families requiring assistance.'));
    }
    if (A === 8 && row.status === 'Not Passable' && !filled(row.not_passable_at)) {
      out.push(issue(A, i, 'not_passable_at', 'warning', 'Add the date/time the road or bridge became not passable.'));
    }
    if (A === 8 && row.status && row.status !== 'Not Passable' && filled(row.not_passable_at) && !filled(row.passable_at)) {
      out.push(issue(A, i, 'passable_at', 'warning', 'Status is passable/limited but no restoration time was entered.'));
    }
  });
  return out;
}

/**
 * Validate a whole report.
 * @param {Record<number, object[]>} annexes   rows per annex number
 * @param {Record<number, boolean>} na         annexes marked "nothing to report"
 * @param {{ casualties?: object[] }} extra    casualty rows (stored separately)
 * @returns {{ issues: Issue[], unresolved: number[], errors: number, warnings: number }}
 */
export function validateReport(annexes, na = {}, extra = {}) {
  const issues = [];
  const unresolved = [];
  ANNEXES.forEach((annex) => {
    const rows = annex.no === 3 ? (extra.casualties || []) : (annexes?.[annex.no] || []);
    const content = hasContent(annex, rows);
    if (na[annex.no] && content) {
      issues.push(issue(annex.no, null, null, 'error', 'Marked "nothing to report" but rows were entered. Unmark it or clear the rows.'));
    }
    if (!na[annex.no] && !content) {
      unresolved.push(annex.no);
      return;
    }
    if (content) issues.push(...validateAnnex(annex, rows));
  });
  // Every Annex 3 row that is "Dead" but not validated is worth a warning at submission time.
  const cas = extra.casualties || [];
  const unvalidatedDead = cas.filter((r) => r.category === 'Dead' && r.validated !== 'Yes').length;
  if (unvalidatedDead > 0) {
    issues.push(issue(3, null, 'validated', 'warning', `${unvalidatedDead} reported death(s) are not yet validated (e.g. death certificate).`));
  }
  const errors = issues.filter((x) => x.severity === 'error').length;
  const warnings = issues.filter((x) => x.severity === 'warning').length;
  return { issues, unresolved, errors, warnings };
}

export const annexTitle = (no) => `Annex ${no}: ${ANNEX_BY_NO[no]?.title || ''}`;
