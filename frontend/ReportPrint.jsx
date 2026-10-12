import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { MUNICIPALITIES } from '@/lib/constants';
import { slug } from '@/lib/reporting/ids';
import { ANNEXES, annexColumns, cleanRows, ANNEX_BY_NO, REGION, PROVINCE } from '@/lib/reporting/annexes';
import { consolidate, buildNarrative, formatDateTime, fmt, fmtPHP } from '@/lib/reporting/consolidate';
import { getCasualties, getOperation, getReport, listReports } from '@/lib/reporting/store';
import { useReportingAccess } from '@/components/reporting/useReportingAccess';

function AnnexTable({ annex, rowsByMuni, showMuni }) {
  const cols = annexColumns(annex);
  const all = rowsByMuni.flatMap(({ municipality, rows }) => rows.map((r) => ({ municipality, r })));
  return (
    <section className="break-inside-avoid-page mb-6">
      <h3 className="font-bold text-sm">Annex {annex.no}: {annex.title}</h3>
      {all.length === 0 ? <p className="text-xs italic text-gray-500">No entries / nothing to report.</p> : (
        <table className="w-full border-collapse text-[9px] mt-1">
          <thead><tr>{showMuni && <th className="border px-1 py-0.5 bg-gray-100 text-left">City/Municipality</th>}
            {cols.map((c, i) => <th key={i} className="border px-1 py-0.5 bg-gray-100 text-left">{c.header}</th>)}</tr></thead>
          <tbody>{all.map(({ municipality, r }, i) => (
            <tr key={i}>{showMuni && <td className="border px-1 py-0.5">{municipality}</td>}
              {cols.map((c, j) => { const v = c.get(r); return <td key={j} className={`border px-1 py-0.5 align-top ${c.kind !== 'text' ? 'text-right tabular-nums' : ''}`}>{v == null ? '' : c.kind === 'money' || c.kind === 'int' ? Number(v).toLocaleString('en-US') : String(v)}</td>; })}</tr>
          ))}</tbody>
        </table>
      )}
    </section>
  );
}

function CasualtyCounts({ counts }) {
  const c = counts || {};
  return (
    <section className="mb-6"><h3 className="font-bold text-sm">Annex 3: Casualties (aggregated)</h3>
      <p className="text-[10px] italic text-gray-500">Personal details are not included in this copy.</p>
      <table className="border-collapse text-[10px] mt-1"><tbody>
        {['dead', 'injured', 'ill', 'missing', 'unvalidated'].map((k) => <tr key={k}><td className="border px-2 py-0.5 capitalize">{k === 'unvalidated' ? 'Not yet validated' : k}</td><td className="border px-2 py-0.5 text-right">{Number(c[k] || 0)}</td></tr>)}
      </tbody></table></section>
  );
}

/** Clean white page designed for "Print → Save as PDF". Municipal or provincial depending on the route. */
export default function ReportPrint() {
  const { opId, muniSlug, reportNo } = useParams();
  const [sp] = useSearchParams();
  const pii = sp.get('pii') === '1';
  const { isStaff, isMdrrmo, myMunicipality } = useReportingAccess();
  const provincial = !muniSlug;
  const [state, setState] = useState({ loading: true });

  useEffect(() => {
    (async () => {
      try {
        const op = await getOperation(opId);
        if (provincial) {
          if (!isStaff) throw new Error('Provincial report is for EOC staff only.');
          const reports = await listReports(opId);
          const N = Number(sp.get('report')) || op.current_report_no || 1;
          const c = consolidate(reports, MUNICIPALITIES, N);
          let cas = null;
          if (pii) {
            cas = {};
            for (const r of c.municipalities.filter((x) => x.data)) cas[r.name] = cleanRows(ANNEX_BY_NO[3], await getCasualties(opId, r.data.id).catch(() => []));
          }
          setState({ loading: false, op, c, cas });
        } else {
          const municipality = MUNICIPALITIES.find((m) => slug(m) === muniSlug);
          if (!municipality || !(isStaff || (isMdrrmo && myMunicipality === municipality))) throw new Error('Not allowed.');
          const report = await getReport(opId, municipality, Number(reportNo));
          if (!report) throw new Error('Report not found.');
          const cas = pii ? await getCasualties(opId, report.id).catch(() => []) : null;
          setState({ loading: false, op, report, cas });
        }
      } catch (e) { setState({ loading: false, error: e.message }); }
    })();
  }, [opId, muniSlug, reportNo, provincial, pii, isStaff, isMdrrmo, myMunicipality, sp]);

  if (state.loading) return <p className="p-6 text-sm">Preparing report…</p>;
  if (state.error) return <p className="p-6 text-sm text-red-600">{state.error}</p>;
  const { op } = state;

  return (
    <div className="bg-white text-black min-h-screen p-6 max-w-[1100px] mx-auto">
      <style>{'@page { size: A4 landscape; margin: 10mm; } @media print { .no-print { display: none !important; } body { background: white; } }'}</style>
      <div className="no-print flex justify-end gap-2 mb-4">
        <button type="button" className="px-3 py-1.5 text-sm rounded bg-blue-600 text-white" onClick={() => window.print()}>Print / Save as PDF</button>
      </div>
      <header className="mb-4 border-b pb-2">
        <p className="text-[10px] uppercase tracking-widest text-gray-500">NDRRMC MC 05, s. 2025 · Situational Report</p>
        <h1 className="text-xl font-bold">{provincial ? `Province of ${PROVINCE} — Consolidated Report` : `${MUNICIPALITIES.find((m) => slug(m) === muniSlug)} — Report No. ${reportNo}`}</h1>
        <p className="text-xs">{op?.name} · {REGION} · {PROVINCE}{provincial ? ` · Report No. ${state.c.reportNo} · as of ${formatDateTime(state.c.asOf)}` : ` · as of ${formatDateTime(state.report.as_of)} · status: ${state.report.status}`}</p>
      </header>

      {provincial ? <ProvincialBody op={op} c={state.c} cas={state.cas} /> : <MunicipalBody report={state.report} cas={state.cas} />}
    </div>
  );
}

function MunicipalBody({ report, cas }) {
  return (
    <>
      {ANNEXES.map((annex) => {
        if (annex.no === 3) {
          return cas ? <AnnexTable key={3} annex={annex} showMuni={false} rowsByMuni={[{ municipality: report.municipality, rows: cleanRows(annex, cas) }]} /> : <CasualtyCounts key={3} counts={report.casualty_counts} />;
        }
        return <AnnexTable key={annex.no} annex={annex} showMuni={false} rowsByMuni={[{ municipality: report.municipality, rows: report.na?.[annex.no] ? [] : report.annexes?.[annex.no] || [] }]} />;
      })}
    </>
  );
}

function ProvincialBody({ op, c, cas }) {
  const t = c.totals;
  const para = buildNarrative(op, c);
  const kv = [
    ['Affected families / persons (cumulative)', `${fmt(t.affected_families_cum)} / ${fmt(t.affected_persons_cum)}`],
    ['Displaced families / persons (current)', `${fmt(t.displaced_families_cur)} / ${fmt(t.displaced_persons_cur)}`],
    ['Dead / Injured / Ill / Missing', `${fmt(t.dead)} / ${fmt(t.injured)} / ${fmt(t.ill)} / ${fmt(t.missing)}`],
    ['Houses totally / partially damaged', `${fmt(t.houses_totally)} / ${fmt(t.houses_partially)}`],
    ['Total reported damage', fmtPHP(t.damage_cost_total)],
    ['Families requiring / assisted', `${fmt(t.families_requiring)} / ${fmt(t.families_assisted)}${t.pct_assisted != null ? ` (${t.pct_assisted}%)` : ''}`],
  ];
  return (
    <>
      <section className="mb-5">
        <h2 className="font-bold text-sm mb-1">Summary</h2>
        <table className="border-collapse text-[11px]"><tbody>{kv.map(([k, v]) => <tr key={k}><td className="border px-2 py-0.5">{k}</td><td className="border px-2 py-0.5 text-right font-semibold">{v}</td></tr>)}</tbody></table>
        <div className="mt-3 space-y-1.5 text-[11px] leading-snug">{para.map((p, i) => <p key={i}>{p}</p>)}</div>
        <p className="text-[10px] mt-2 text-gray-600">Municipalities reporting: {c.compliance.submitted} of {c.compliance.total}.
          {c.municipalities.filter((r) => r.stale).length > 0 && ` Carried forward from earlier reports: ${c.municipalities.filter((r) => r.stale).map((r) => r.name).join(', ')}.`}
          {c.municipalities.filter((r) => !r.data).length > 0 && ` No data: ${c.municipalities.filter((r) => !r.data).map((r) => r.name).join(', ')}.`}</p>
      </section>
      {ANNEXES.map((annex) => {
        if (annex.no === 3 && !cas) {
          return (
            <section key={3} className="mb-6"><h3 className="font-bold text-sm">Annex 3: Casualties (aggregated)</h3>
              <table className="border-collapse text-[10px] mt-1"><thead><tr>{['City/Municipality', 'Dead', 'Injured', 'Ill', 'Missing', 'Not yet validated'].map((h) => <th key={h} className="border px-2 py-0.5 bg-gray-100 text-left">{h}</th>)}</tr></thead>
                <tbody>{c.municipalities.filter((r) => r.metrics).map((r) => <tr key={r.name}><td className="border px-2 py-0.5">{r.name}</td>{[r.metrics.dead, r.metrics.injured, r.metrics.ill, r.metrics.missing, r.metrics.casualties_unvalidated].map((v, i) => <td key={i} className="border px-2 py-0.5 text-right">{v}</td>)}</tr>)}</tbody></table></section>
          );
        }
        const rowsByMuni = c.municipalities.filter((r) => r.data).map((r) => ({ municipality: r.name, rows: annex.no === 3 ? (cas?.[r.name] || []) : (r.data.annexes?.[annex.no] || []) }));
        return <AnnexTable key={annex.no} annex={annex} showMuni rowsByMuni={rowsByMuni} />;
      })}
    </>
  );
}
