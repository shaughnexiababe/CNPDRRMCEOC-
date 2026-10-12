import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft, Download, Printer, Users, Home, HeartPulse, Banknote, HandHelping, Skull, Copy, Sparkles, AlertTriangle, AlertCircle,
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid, LineChart, Line,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import StatCard from '@/components/StatCard';
import { MUNICIPALITIES } from '@/lib/constants';
import { apiPost } from '@/lib/api';
import { slug } from '@/lib/reporting/ids';
import { cleanRows, ANNEX_BY_NO } from '@/lib/reporting/annexes';
import {
  consolidate, trendSeries, buildNarrative, isLate, fmt, fmtPHP, formatDateTime,
} from '@/lib/reporting/consolidate';
import { provincialWorkbook } from '@/lib/reporting/exports';
import { downloadXlsx } from '@/lib/reporting/xlsx';
import { getOperation, listReports, getCasualties } from '@/lib/reporting/store';
import StatusBadge from '@/components/reporting/StatusBadge';
import { useReportingAccess } from '@/components/reporting/useReportingAccess';

const COLORS = { affected: '#3B82F6', displaced: '#F97316', requiring: '#EF4444', assisted: '#22C55E', damage: '#8B5CF6' };

export default function ConsolidatedReport() {
  const { opId } = useParams();
  const { isStaff } = useReportingAccess();
  const { toast } = useToast();
  const [reportNo, setReportNo] = useState(null);
  const [includePII, setIncludePII] = useState(false);
  const [text, setText] = useState('');
  const [edited, setEdited] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);

  const { data: op } = useQuery({ queryKey: ['operation', opId], queryFn: () => getOperation(opId) });
  const { data: reports = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ['reports', opId, 'all'], queryFn: () => listReports(opId), enabled: isStaff, refetchInterval: 60000,
  });

  const current = op?.current_report_no || 1;
  const N = reportNo || current;
  const c = useMemo(() => consolidate(reports, MUNICIPALITIES, N), [reports, N]);
  const trend = useMemo(() => trendSeries(reports, MUNICIPALITIES), [reports]);
  const narrative = useMemo(() => buildNarrative(op, c), [op, c]);

  useEffect(() => { if (!edited) setText(narrative.join('\n\n')); }, [narrative, edited]);

  if (!isStaff) return <p className="text-sm">The consolidated report is available to Provincial EOC staff only.</p>;
  if (isLoading || !op) return <p className="text-sm text-muted-foreground">Loading…</p>;

  const t = c.totals;
  const muniData = c.municipalities.filter((r) => r.metrics);
  const chartMuni = muniData.map((r) => ({ name: r.name, Affected: r.metrics.affected_persons_cum, Displaced: r.metrics.displaced_persons_cur }));
  const chartResp = muniData.filter((r) => r.metrics.families_requiring > 0).map((r) => ({ name: r.name, Requiring: r.metrics.families_requiring, Assisted: r.metrics.families_assisted }));
  const chartDamage = [
    { name: 'Houses', PHP: t.houses_cost }, { name: 'Agriculture', PHP: t.agri_value },
    { name: 'Infrastructure', PHP: t.infra_cost }, { name: 'Other assets', PHP: t.other_assets_cost },
  ].filter((d) => d.PHP > 0);

  const exportExcel = async () => {
    let byMuni = null;
    if (includePII) {
      byMuni = {};
      for (const r of muniData) {
        const rows = await getCasualties(opId, r.data.id).catch(() => []);
        byMuni[r.name] = cleanRows(ANNEX_BY_NO[3], rows);
      }
    }
    downloadXlsx(`NDRRMC_Consolidated_Report${N}_CamarinesNorte.xlsx`, provincialWorkbook({ operation: op, consolidated: c, casualtiesByMuni: byMuni }));
  };

  const copy = async () => { await navigator.clipboard.writeText(text); toast({ title: 'Copied to clipboard' }); };
  const polish = async () => {
    setAiBusy(true);
    try {
      const res = await apiPost('/api/summarize-sitrep', { operation: op.name, reportNo: N, asOf: formatDateTime(c.asOf), draft: text });
      setText(res.text); setEdited(true);
      toast({ title: 'AI draft ready', description: 'Check every figure against the tables before releasing.' });
    } catch (e) { toast({ title: 'AI draft unavailable', description: e.message, variant: 'destructive' }); }
    finally { setAiBusy(false); }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <Link to={`/reports/${opId}`} className="text-xs text-muted-foreground inline-flex items-center gap-1 hover:text-foreground"><ArrowLeft className="w-3 h-3" />{op.name}</Link>
          <h1 className="text-2xl font-bold tracking-tight">Provincial Consolidated Report</h1>
          <p className="text-sm text-muted-foreground">As of {formatDateTime(c.asOf)} · {c.compliance.submitted} of {c.compliance.total} municipalities submitted Report No. {N}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select className="h-9 rounded-md border border-input bg-background px-2 text-sm" value={N} onChange={(e) => setReportNo(Number(e.target.value))}>
            {Array.from({ length: current }, (_, i) => i + 1).map((n) => <option key={n} value={n}>Report No. {n}</option>)}
          </select>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>{isFetching ? 'Refreshing…' : 'Refresh'}</Button>
          <Button variant="outline" size="sm" onClick={exportExcel}><Download className="w-3.5 h-3.5 mr-1.5" />Excel</Button>
          <Button variant="outline" size="sm" onClick={() => window.open(`/reports/${opId}/print/consolidated?report=${N}&pii=${includePII ? 1 : 0}`, '_blank')}><Printer className="w-3.5 h-3.5 mr-1.5" />PDF / Print</Button>
        </div>
      </div>
      <label className="flex items-center gap-2 text-xs cursor-pointer w-fit">
        <input type="checkbox" checked={includePII} onChange={(e) => setIncludePII(e.target.checked)} />
        Include casualty personal details in the files (official submission to the higher DRRM council only — never for public release)
      </label>

      {/* Compliance */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Reporting compliance — Report No. {N}</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3"><Progress value={(c.compliance.submitted / c.compliance.total) * 100} className="h-2" />
            <span className="text-xs whitespace-nowrap text-muted-foreground">{c.compliance.submitted}/{c.compliance.total}</span></div>
          <div className="overflow-x-auto"><table className="w-full text-xs">
            <thead><tr className="text-left text-muted-foreground border-b">
              <th className="py-1.5 pr-3 font-medium">Municipality</th><th className="px-2 font-medium">Status</th><th className="px-2 font-medium">Figures from</th><th className="px-2 font-medium">As of</th><th className="px-2 font-medium">Submitted</th><th />
            </tr></thead>
            <tbody>{c.municipalities.map((r) => {
              const late = r.current?.status === 'submitted' ? isLate(r.current, op.cycles?.[N]) : null;
              return (
                <tr key={r.name} className="border-b last:border-0">
                  <td className="py-1.5 pr-3 font-medium">{r.name}</td>
                  <td className="px-2"><span className="inline-flex gap-1"><StatusBadge status={r.state} />{late && <StatusBadge status="late" />}</span></td>
                  <td className="px-2">{r.usedReportNo ? `Report No. ${r.usedReportNo}${r.stale ? ' (carried forward)' : ''}` : '—'}</td>
                  <td className="px-2">{r.asOf ? formatDateTime(r.asOf) : '—'}</td>
                  <td className="px-2">{r.submittedAt ? formatDateTime(r.submittedAt) : '—'}</td>
                  <td className="px-2 text-right"><Link className="underline" to={`/reports/${opId}/${slug(r.name)}/${N}`}>Open</Link></td>
                </tr>
              );
            })}</tbody>
          </table></div>
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard title="Affected persons" value={fmt(t.affected_persons_cum)} icon={Users} subtitle={`${fmt(t.affected_families_cum)} families · ${fmt(t.affected_brgys)} brgys`} />
        <StatCard title="Displaced now" value={fmt(t.displaced_persons_cur)} icon={Home} subtitle={`${fmt(t.inside_persons_cur)} in ${fmt(t.ec_count)} ECs`} />
        <StatCard title="Dead / Missing" value={`${fmt(t.dead)} / ${fmt(t.missing)}`} icon={Skull} subtitle={`${fmt(t.injured)} injured · ${fmt(t.ill)} ill`} />
        <StatCard title="Houses damaged" value={fmt(t.houses_total)} icon={HeartPulse} subtitle={`${fmt(t.houses_totally)} totally`} />
        <StatCard title="Reported damage" value={fmtPHP(t.damage_cost_total)} icon={Banknote} subtitle="Houses, agri, infra, assets" />
        <StatCard title="Families assisted" value={t.pct_assisted == null ? '—' : `${t.pct_assisted}%`} icon={HandHelping} subtitle={`${fmt(t.families_unserved)} families not yet reached`} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Affected vs displaced, by municipality</CardTitle></CardHeader>
          <CardContent className="h-72">
            {chartMuni.length ? <ResponsiveContainer width="100%" height="100%"><BarChart data={chartMuni}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-30} textAnchor="end" height={60} /><YAxis tick={{ fontSize: 10 }} /><Tooltip /><Legend />
              <Bar dataKey="Affected" fill={COLORS.affected} /><Bar dataKey="Displaced" fill={COLORS.displaced} /></BarChart></ResponsiveContainer> : <Empty />}
          </CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Trend across reports</CardTitle></CardHeader>
          <CardContent className="h-72">
            {trend.length > 1 ? <ResponsiveContainer width="100%" height="100%"><LineChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="label" tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 10 }} /><Tooltip /><Legend />
              <Line type="monotone" dataKey="affected_persons" name="Affected (cum.)" stroke={COLORS.affected} strokeWidth={2} />
              <Line type="monotone" dataKey="displaced_persons" name="Displaced (current)" stroke={COLORS.displaced} strokeWidth={2} /></LineChart></ResponsiveContainer> : <Empty text="Trend appears once two reports have been submitted." />}
          </CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Response gap — families requiring vs assisted</CardTitle></CardHeader>
          <CardContent className="h-72">
            {chartResp.length ? <ResponsiveContainer width="100%" height="100%"><BarChart data={chartResp}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-30} textAnchor="end" height={60} /><YAxis tick={{ fontSize: 10 }} /><Tooltip /><Legend />
              <Bar dataKey="Requiring" fill={COLORS.requiring} /><Bar dataKey="Assisted" fill={COLORS.assisted} /></BarChart></ResponsiveContainer> : <Empty />}
          </CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Reported damage by sector (PHP)</CardTitle></CardHeader>
          <CardContent className="h-72">
            {chartDamage.length ? <ResponsiveContainer width="100%" height="100%"><BarChart data={chartDamage} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} /><XAxis type="number" tick={{ fontSize: 10 }} /><YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={90} /><Tooltip formatter={(v) => fmtPHP(v)} />
              <Bar dataKey="PHP" fill={COLORS.damage} /></BarChart></ResponsiveContainer> : <Empty text="No cost estimates reported yet." />}
          </CardContent></Card>
      </div>

      {/* Attention + lifelines */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Where attention is needed first</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {c.attention.length === 0 && <p className="text-xs text-muted-foreground">No pressing indicators in submitted reports.</p>}
            {c.attention.slice(0, 6).map((a, i) => (
              <div key={a.municipality} className="text-xs"><span className="font-semibold">{i + 1}. {a.municipality}</span> — {a.reasons.join(' · ')}</div>
            ))}
            <p className="text-[10px] text-muted-foreground pt-1">Ordering is a simple indicator-based heuristic (casualties, displacement, response gap, lifelines); it supports, not replaces, EOC judgement.</p>
          </CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Lifelines and roads still down</CardTitle></CardHeader>
          <CardContent>
            {c.lifelines.length === 0 ? <p className="text-xs text-muted-foreground">None reported.</p> : (
              <div className="overflow-x-auto max-h-64 overflow-y-auto"><table className="w-full text-xs">
                <thead><tr className="text-left text-muted-foreground border-b"><th className="py-1 pr-2 font-medium">Municipality</th><th className="px-2 font-medium">Sector</th><th className="px-2 font-medium">Item</th><th className="px-2 font-medium">Down for</th></tr></thead>
                <tbody>{c.lifelines.map((l, i) => (
                  <tr key={i} className="border-b last:border-0"><td className="py-1 pr-2">{l.municipality}</td><td className="px-2">{l.sector}</td><td className="px-2">{l.provider}</td>
                    <td className="px-2 tabular-nums">{l.hours == null ? '—' : l.hours >= 24 ? `${Math.floor(l.hours / 24)}d ${l.hours % 24}h` : `${l.hours}h`}</td></tr>
                ))}</tbody></table></div>
            )}
          </CardContent></Card>
      </div>

      {/* Data quality */}
      <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Data checks ({c.flags.length})</CardTitle></CardHeader>
        <CardContent className="space-y-1.5">
          {c.flags.length === 0 && <p className="text-xs text-muted-foreground">No issues found.</p>}
          {c.flags.map((f, i) => (
            <p key={i} className={`text-xs flex items-start gap-1.5 ${f.severity === 'error' ? 'text-red-600' : 'text-amber-700'}`}>
              {f.severity === 'error' ? <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" /> : <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />}
              <span><span className="font-semibold">{f.municipality}:</span> {f.message}</span>
            </p>
          ))}
        </CardContent></Card>

      {/* Narrative */}
      <Card><CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm">Draft situational report (for staff review)</CardTitle>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={polish} disabled={aiBusy || !text}><Sparkles className="w-3.5 h-3.5 mr-1.5" />{aiBusy ? 'Drafting…' : 'Refine with AI'}</Button>
          <Button variant="outline" size="sm" onClick={copy}><Copy className="w-3.5 h-3.5 mr-1.5" />Copy</Button>
        </div></CardHeader>
        <CardContent>
          <Textarea rows={14} value={text} onChange={(e) => { setText(e.target.value); setEdited(true); }} className="text-sm leading-relaxed" />
          <p className="text-[10px] text-muted-foreground mt-2">Generated from the submitted figures. Review before release; AI refinement may reword but must not change numbers — verify them against the tables.
            {edited && <button type="button" className="underline ml-2" onClick={() => { setEdited(false); }}>Reset to generated text</button>}</p>
        </CardContent></Card>
    </div>
  );
}

function Empty({ text = 'No data yet.' }) {
  return <div className="h-full flex items-center justify-center text-xs text-muted-foreground">{text}</div>;
}
