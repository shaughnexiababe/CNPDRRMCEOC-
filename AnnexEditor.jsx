import React, { useMemo } from 'react';
import { Plus, Trash2, Copy, ShieldAlert, AlertCircle, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BARANGAYS_BY_MUNICIPALITY } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { emptyRow, computeRow, isShown, optionsFor, gridKey } from '@/lib/reporting/annexes';

const inputCls = 'h-8 w-full rounded-md border border-input bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-60 disabled:cursor-not-allowed';

/** One input, rendered from a field definition. */
function FieldInput({ field, row, onChange, readOnly, municipality, invalid }) {
  const value = row[field.key] ?? '';
  const cls = cn(inputCls, invalid && 'border-red-500 bg-red-500/5');
  const set = (v) => onChange(field.key, v);

  if (field.computed) {
    return (
      <div className="h-8 flex items-center px-2 rounded-md bg-muted text-xs font-semibold tabular-nums" title="Calculated automatically">
        {value === '' ? '—' : Number(value).toLocaleString('en-US')}{field.suffix || ''}
      </div>
    );
  }
  if (field.type === 'select') {
    const options = optionsFor(field, row);
    return (
      <select className={cls} value={value} disabled={readOnly} onChange={(e) => set(e.target.value)} aria-label={field.label}>
        <option value="">Select…</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    );
  }
  if (field.type === 'barangay') {
    const list = BARANGAYS_BY_MUNICIPALITY[municipality] || [];
    return (
      <select className={cls} value={value} disabled={readOnly} onChange={(e) => set(e.target.value)} aria-label={field.label}>
        <option value="">Select barangay…</option>
        {list.map((b) => <option key={b} value={b}>{b}</option>)}
      </select>
    );
  }
  if (field.type === 'number') {
    return (
      <input
        type="number" inputMode={field.int ? 'numeric' : 'decimal'} min={field.min ?? 0} max={field.max} step={field.int ? 1 : 'any'}
        className={cn(cls, 'tabular-nums')} value={value} disabled={readOnly} aria-label={field.label}
        onChange={(e) => set(e.target.value === '' ? '' : e.target.value)}
      />
    );
  }
  if (field.type === 'datetime' || field.type === 'date') {
    return (
      <input type={field.type === 'date' ? 'date' : 'datetime-local'} className={cls} value={value} disabled={readOnly}
        aria-label={field.label} onChange={(e) => set(e.target.value)} />
    );
  }
  return (
    <input type="text" className={cls} value={value} disabled={readOnly} placeholder={field.hint || ''} aria-label={field.label}
      onChange={(e) => set(e.target.value)} />
  );
}

function IssueList({ issues }) {
  if (!issues.length) return null;
  return (
    <div className="space-y-1">
      {issues.slice(0, 8).map((i, idx) => (
        <p key={idx} className={cn('text-xs flex items-start gap-1.5', i.severity === 'error' ? 'text-red-600' : 'text-amber-600')}>
          {i.severity === 'error' ? <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" /> : <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />}
          <span>{i.row != null && i.row >= 0 && !(i.annex === 2 || i.annex === 17 || i.annex === 19) ? `Row ${i.row + 1}: ` : ''}{i.message}</span>
        </p>
      ))}
      {issues.length > 8 && <p className="text-xs text-muted-foreground">…and {issues.length - 8} more.</p>}
    </div>
  );
}

function RowsTable({ annex, rows, onRows, readOnly, municipality, issues }) {
  const bad = useMemo(() => {
    const s = new Set();
    issues.filter((i) => i.severity === 'error' && i.row != null).forEach((i) => s.add(`${i.row}:${i.field}`));
    return s;
  }, [issues]);

  const setCell = (ri, key, value) => {
    onRows(rows.map((r, i) => {
      if (i !== ri) return r;
      const next = { ...r, [key]: value };
      // changing a parent select resets dependent selects (e.g. Classification -> Type in Annex 18)
      annex.fields.forEach((f) => { if (f.optionsBy && f.optionsBy.field === key) next[f.key] = ''; });
      return computeRow(annex, next);
    }));
  };

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-xs">
          <thead className="bg-muted/60">
            <tr>
              <th className="px-2 py-2 text-left w-8">#</th>
              {annex.fields.map((f) => (
                <th key={f.key} className={cn('px-2 py-2 text-left font-semibold align-bottom', f.wide ? 'min-w-[230px]' : 'min-w-[130px]')}>
                  {f.label}{f.required && <span className="text-red-500"> *</span>}
                </th>
              ))}
              {!readOnly && <th className="px-2 py-2 w-16" />}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={annex.fields.length + 2} className="px-3 py-6 text-center text-muted-foreground">
                No rows yet. {readOnly ? '' : 'Click “Add row”, or tick “Nothing to report” above.'}
              </td></tr>
            )}
            {rows.map((row, ri) => (
              <tr key={ri} className="border-t align-top">
                <td className="px-2 py-1.5 text-muted-foreground">{ri + 1}</td>
                {annex.fields.map((f) => (
                  <td key={f.key} className="px-1.5 py-1.5">
                    {isShown(f, row)
                      ? <FieldInput field={f} row={row} readOnly={readOnly} municipality={municipality} invalid={bad.has(`${ri}:${f.key}`)} onChange={(k, v) => setCell(ri, k, v)} />
                      : <div className="h-8 rounded-md bg-muted/40" title="Not applicable for this classification" />}
                  </td>
                ))}
                {!readOnly && (
                  <td className="px-1.5 py-1.5 whitespace-nowrap">
                    <button type="button" className="p-1 text-muted-foreground hover:text-foreground" title="Duplicate row"
                      onClick={() => onRows([...rows.slice(0, ri + 1), { ...row }, ...rows.slice(ri + 1)])}><Copy className="w-3.5 h-3.5" /></button>
                    <button type="button" className="p-1 text-muted-foreground hover:text-red-600" title="Delete row"
                      onClick={() => onRows(rows.filter((_, i) => i !== ri))}><Trash2 className="w-3.5 h-3.5" /></button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!readOnly && (
        <Button type="button" variant="outline" size="sm" onClick={() => onRows([...rows, emptyRow(annex)])}>
          <Plus className="w-3.5 h-3.5 mr-1.5" />Add row
        </Button>
      )}
    </div>
  );
}

function GridTable({ annex, grid, row, onRow, readOnly, issues }) {
  const bad = new Set(issues.filter((i) => i.severity === 'error').map((i) => i.field));
  const set = (key, value) => onRow(computeRow(annex, { ...row, [key]: value }));
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-semibold">{grid.title}</p>
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-xs">
          <thead className="bg-muted/60">
            <tr>
              <th className="px-2 py-2 text-left min-w-[190px]" />
              {grid.cols.map((c) => <th key={c.key} className="px-2 py-2 text-left font-semibold min-w-[110px]">{c.label}</th>)}
            </tr>
          </thead>
          <tbody>
            {grid.rows.map((r) => (
              <tr key={r.key} className={cn('border-t', r.sumOf && 'bg-muted/40 font-semibold')}>
                <td className="px-2 py-1.5">{r.label}</td>
                {grid.cols.map((c) => {
                  const k = gridKey(r.key, c.key);
                  return (
                    <td key={c.key} className="px-1.5 py-1">
                      {r.sumOf
                        ? <div className="h-8 flex items-center px-2 tabular-nums">{Number(row[k] || 0).toLocaleString('en-US')}</div>
                        : <input type="number" min={0} step={1} inputMode="numeric" disabled={readOnly} aria-label={`${r.label} ${c.label}`}
                            className={cn(inputCls, 'tabular-nums', bad.has(k) && 'border-red-500 bg-red-500/5')}
                            value={row[k] ?? ''} onChange={(e) => set(k, e.target.value)} />}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SingleForm({ annex, rows, onRows, readOnly, municipality, issues }) {
  const row = rows[0] || emptyRow(annex);
  const bad = new Set(issues.filter((i) => i.severity === 'error').map((i) => i.field));
  const setField = (k, v) => onRows([computeRow(annex, { ...row, [k]: v })]);
  const plain = annex.fields.filter((f) => f.key !== 'remarks' || !annex.grids);
  const remarksField = annex.fields.find((f) => f.key === 'remarks');
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {plain.filter((f) => !(annex.grids && f.key === 'remarks')).map((f) => (
          <div key={f.key} className={cn('space-y-1', f.wide && 'md:col-span-2')}>
            <label className="text-xs font-medium">{f.label}{f.required && <span className="text-red-500"> *</span>}</label>
            <FieldInput field={f} row={row} readOnly={readOnly} municipality={municipality} invalid={bad.has(f.key)} onChange={setField} />
          </div>
        ))}
      </div>
      {(annex.grids || []).map((g) => (
        <GridTable key={g.key} annex={annex} grid={g} row={row} onRow={(r) => onRows([r])} readOnly={readOnly} issues={issues} />
      ))}
      {annex.grids && remarksField && (
        <div className="space-y-1">
          <label className="text-xs font-medium">{remarksField.label}</label>
          <textarea className={cn(inputCls, 'h-20 py-2')} value={row.remarks ?? ''} disabled={readOnly} onChange={(e) => setField('remarks', e.target.value)} />
        </div>
      )}
    </div>
  );
}

/**
 * Editor for one annex.
 * @param {object} p
 * @param {object} p.annex            definition from lib/reporting/annexes
 * @param {object[]} p.rows
 * @param {(rows:object[])=>void} p.onRows
 * @param {boolean} p.na               "nothing to report" flag
 * @param {(v:boolean)=>void} p.onNa
 */
export default function AnnexEditor({ annex, rows, onRows, na, onNa, readOnly, municipality, issues = [] }) {
  return (
    <Card>
      <CardHeader className="pb-3 space-y-2">
        <CardTitle className="text-base">Annex {annex.no}: {annex.title}</CardTitle>
        <p className="text-xs text-muted-foreground">{annex.use}</p>
        {annex.restricted && (
          <p className="text-xs flex items-start gap-1.5 rounded-md border border-amber-500/30 bg-amber-500/10 text-amber-800 px-2.5 py-2">
            <ShieldAlert className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            Contains personal data. It is stored in a restricted record visible only to your municipality and the Provincial EOC; the public dashboard shows counts only.
          </p>
        )}
        <label className={cn('flex items-center gap-2 text-xs w-fit', readOnly ? 'opacity-60' : 'cursor-pointer')}>
          <input type="checkbox" checked={!!na} disabled={readOnly} onChange={(e) => onNa(e.target.checked)} />
          Nothing to report for this annex (so it is not mistaken for “not yet encoded”)
        </label>
      </CardHeader>
      <CardContent className="space-y-3">
        <IssueList issues={issues} />
        {na ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Marked as “nothing to report”.</p>
        ) : annex.mode === 'single' ? (
          <SingleForm annex={annex} rows={rows} onRows={onRows} readOnly={readOnly} municipality={municipality} issues={issues} />
        ) : (
          <RowsTable annex={annex} rows={rows} onRows={onRows} readOnly={readOnly} municipality={municipality} issues={issues} />
        )}
      </CardContent>
    </Card>
  );
}
