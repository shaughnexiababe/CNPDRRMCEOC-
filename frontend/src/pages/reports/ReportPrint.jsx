import React, { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ANNEXES } from '@/lib/reporting/annexes';
import { consolidate, formatDateTime, fmt, fmtPHP } from '@/lib/reporting/consolidate';
import { getOperation, listReports } from '@/lib/reporting/store';

export default function ReportPrint() {
  const { opId } = useParams();

  const { data: op } = useQuery({ queryKey: ['op', opId], queryFn: () => getOperation(opId) });
  const { data: rawReports = [] } = useQuery({
    queryKey: ['op-reports', opId],
    queryFn: () => listReports(opId),
    enabled: !!op,
  });

  const reportNo = op?.current_report_no || 1;
  const consolidated = useMemo(() => consolidate(rawReports, reportNo), [rawReports, reportNo]);

  if (!op) return <div className="p-8 text-center text-xs font-mono">Loading printable view…</div>;

  const m = consolidated.totals;

  return (
    <div className="p-8 max-w-4xl mx-auto bg-white text-slate-900 font-serif text-sm space-y-6">
      <div className="text-center space-y-1 border-b pb-4">
        <p className="text-xs uppercase tracking-wider font-sans text-slate-500">Republic of the Philippines • Province of Camarines Norte</p>
        <h1 className="text-xl font-bold uppercase tracking-tight">PROVINCIAL DISASTER RISK REDUCTION AND MANAGEMENT OFFICE</h1>
        <p className="text-sm font-semibold text-slate-700">SITUATIONAL REPORT NO. {reportNo}</p>
        <p className="text-xs text-slate-500 font-sans">Operation: {op.name} • As of {formatDateTime(consolidated.as_of_latest)}</p>
      </div>

      <div className="space-y-3">
        <h2 className="text-base font-bold uppercase border-b pb-1">I. Executive Summary</h2>
        <div className="grid grid-cols-2 gap-4 text-xs font-sans">
          <div className="p-3 border rounded bg-slate-50">
            <p className="text-slate-500 font-semibold">AFFECTED POPULATION</p>
            <p className="text-base font-bold text-slate-900">{fmt(m.affected_families_cum)} Families ({fmt(m.affected_persons_cum)} Persons)</p>
            <p className="text-slate-600">Currently Displaced: {fmt(m.displaced_families_cur)} Families ({m.ec_count} Evacuation Centers)</p>
          </div>
          <div className="p-3 border rounded bg-slate-50">
            <p className="text-slate-500 font-semibold">CASUALTIES & DAMAGE</p>
            <p className="text-base font-bold text-slate-900">{m.dead} Dead • {m.injured} Injured • {m.missing} Missing</p>
            <p className="text-slate-600">Total Damage: {fmtPHP(m.houses_cost + m.infra_cost + m.agri_value + m.other_assets_cost)}</p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-base font-bold uppercase border-b pb-1">II. Response Assistance Coverage</h2>
        <p className="text-xs font-sans text-slate-700">
          A total of <strong>{fmt(m.assisted_assisted)}</strong> out of <strong>{fmt(m.assisted_requiring)}</strong> families requiring assistance have been served across the province (<strong>{m.pct_assisted}%</strong> coverage).
        </p>
      </div>

      <div className="space-y-3">
        <h2 className="text-base font-bold uppercase border-b pb-1">III. Reporting Compliance Status</h2>
        <table className="w-full text-xs font-sans border-collapse border border-slate-300">
          <thead>
            <tr className="bg-slate-100 border-b border-slate-300">
              <th className="p-2 text-left border-r border-slate-300">Municipality</th>
              <th className="p-2 text-left border-r border-slate-300">Status</th>
              <th className="p-2 text-left">Submitted At / Notes</th>
            </tr>
          </thead>
          <tbody>
            {consolidated.reports.map((r) => (
              <tr key={r.municipality} className="border-b border-slate-200">
                <td className="p-2 border-r border-slate-200 font-semibold">{r.municipality}</td>
                <td className="p-2 border-r border-slate-200">{r.carried_forward ? `Carried Forward (Rep ${r.report_no})` : 'Submitted'}</td>
                <td className="p-2">{r.submitted_at ? formatDateTime(r.submitted_at) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="pt-8 border-t text-xs font-sans text-slate-500 flex justify-between">
        <p>CNPDRRMO EOC Situational Reporting System • MC 05 s.2025</p>
        <p>Generated on {new Date().toLocaleString()}</p>
      </div>
    </div>
  );
}
