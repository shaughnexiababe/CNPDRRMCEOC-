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
  const { toast } = useToast();
  const { isStaff } = useReportingAccess();
  const [incCasualties, setIncCasualties] = useState(false);
  const [sitrepText, setSitrepText] = useState('');
  const [refining, setRefining] = useState(false);

  const { data: op } = useQuery({ queryKey: ['op', opId], queryFn: () => getOperation(opId) });
  const { data: rawReports = [] } = useQuery({
    queryKey: ['op-reports', opId],
    queryFn: () => listReports(opId),
    enabled: !!op,
  });

  const reportNo = op?.current_report_no || 1;
  const cycleInfo = op?.cycles?.[reportNo] || {};

  const consolidated = useMemo(() => consolidate(rawReports, reportNo), [rawReports, reportNo]);
  const trends = useMemo(() => trendSeries(rawReports, reportNo), [rawReports, reportNo]);

  useEffect(() => {
    if (op) setSitrepText(buildNarrative(op, consolidated, reportNo));
  }, [op, consolidated, reportNo]);

  const handleExportXlsx = async () => {
    try {
      const casualtyRows = {};
      if (incCasualties) {
        for (const r of consolidated.reports) {
          if (!r.carried_forward) {
            casualtyRows[r.municipality] = cleanRows(ANNEX_BY_NO[3], await getCasualties(opId, r.id));
          }
        }
      }
      const wb = provincialWorkbook(op, consolidated, reportNo, casualtyRows);
      await downloadXlsx(wb, `${slug(op.name)}_ReportNo${reportNo}_Consolidated.xlsx`);
      toast({ title: 'Export complete', description: 'Excel file downloaded successfully.' });
    } catch (e) {
      toast({ title: 'Export failed', description: e.message, variant: 'destructive' });
    }
  };

  const handleRefineAi = async () => {
    setRefining(true);
    try {
      const res = await apiPost('/api/summarize-sitrep', {
        operation: op?.name, reportNo, asOf: formatDateTime(consolidated.as_of_latest), draft: sitrepText,
      });
      if (res?.text) setSitrepText(res.text);
    } catch (e) {
      toast({ title: 'AI refinement unavailable', description: e.message, variant: 'destructive' });
    } finally {
      setRefining(false);
    }
  };

  if (!op) return <div className="p-8 text-center text-muted-foreground">Loading operational data…</div>;

  const m = consolidated.totals;
  const pctSubmitted = Math.round((consolidated.submitted.length / MUNICIPALITIES.length) * 100);

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link to={`/reports/${opId}`} className="text-xs text-muted-foreground hover:underline flex items-center gap-1 mb-1">
            <ArrowLeft className="w-3.5 h-3.5" />Back to Operation
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">Provincial Consolidated Report No. {reportNo}</h1>
          <p className="text-xs text-muted-foreground mt-0.5">{op.name} • As of {formatDateTime(consolidated.as_of_latest)}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExportXlsx}><Download className="w-4 h-4 mr-1.5" />Export Excel</Button>
          <Link to={`/reports/${opId}/print/consolidated`} target="_blank">
            <Button size="sm"><Printer className="w-4 h-4 mr-1.5" />Print / Save PDF</Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Affected Population" value={`${fmt(m.affected_families_cum)} fam`} subtitle={`${fmt(m.affected_persons_cum)} persons`} icon={Users} color="blue" />
        <StatCard title="Currently Displaced" value={`${fmt(m.displaced_families_cur)} fam`} subtitle={`${fmt(m.displaced_persons_cur)} persons (${m.ec_count} ECs)`} icon={Home} color="orange" />
        <StatCard title="Casualties" value={`${m.dead} Dead`} subtitle={`${m.injured} Injured • ${m.missing} Missing (${m.casualties_unvalidated} unvalidated)`} icon={m.dead ? Skull : HeartPulse} color={m.dead ? 'red' : 'green'} />
        <StatCard title="Total Damage" value={fmtPHP(m.houses_cost + m.infra_cost + m.agri_value + m.other_assets_cost)} subtitle={`Houses: ${fmtPHP(m.houses_cost)} • Infra: ${fmtPHP(m.infra_cost)}`} icon={Banknote} color="purple" />
      </div>

      {consolidated.flags.length > 0 && (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold flex items-center gap-2 text-amber-800"><AlertTriangle className="w-4 h-4" />Data Quality Flags ({consolidated.flags.length})</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-xs text-amber-900">
            {consolidated.flags.map((f, i) => (
              <p key={i}>• <strong>{f.municipality}:</strong> {f.message}</p>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Municipal Reporting Status ({consolidated.submitted.length} of {MUNICIPALITIES.length} submitted)</CardTitle>
            <span className="text-xs font-medium text-muted-foreground">{pctSubmitted}% complete</span>
          </div>
          <Progress value={pctSubmitted} className="h-2" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 text-xs">
            {MUNICIPALITIES.map((muni) => {
              const rep = consolidated.reports.find((r) => r.municipality === muni);
              const submitted = rep && !rep.carried_forward;
              const late = submitted && isLate(rep.submitted_at, cycleInfo.due_at);
              return (
                <div key={muni} className={`p-2.5 rounded-lg border ${submitted ? 'bg-card' : 'bg-amber-500/5 border-amber-500/30'}`}>
                  <p className="font-semibold">{muni}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {submitted ? (late ? 'Submitted (LATE)' : 'Submitted') : (rep ? `Carried fwd (Rep ${rep.report_no})` : 'Not submitted')}
                  </p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Trend Across Reports (Displaced Persons)</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="report_no" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="displaced_persons_cur" name="Currently Displaced" stroke={COLORS.displaced} strokeWidth={2} />
                <Line type="monotone" dataKey="affected_persons_cum" name="Cumulative Affected" stroke={COLORS.affected} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Response Assistance Gap</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Assistance Coverage</span>
              <span className="font-bold tabular-nums">{m.pct_assisted}%</span>
            </div>
            <Progress value={m.pct_assisted} className="h-3" />
            <div className="grid grid-cols-2 gap-4 text-xs pt-2">
              <div className="p-3 rounded-lg bg-blue-50 border border-blue-100">
                <p className="text-muted-foreground">Families Requiring Assistance</p>
                <p className="text-lg font-bold text-blue-900 tabular-nums">{fmt(m.assisted_requiring)}</p>
              </div>
              <div className="p-3 rounded-lg bg-green-50 border border-green-100">
                <p className="text-muted-foreground">Families Served</p>
                <p className="text-lg font-bold text-green-900 tabular-nums">{fmt(m.assisted_assisted)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Draft Situational Report Narrative</CardTitle>
            {isStaff && (
              <Button size="sm" variant="outline" onClick={handleRefineAi} disabled={refining}>
                <Sparkles className="w-3.5 h-3.5 mr-1.5 text-purple-600" />
                {refining ? 'Refining…' : 'Refine with AI'}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea className="min-h-[160px] text-xs font-mono leading-relaxed" value={sitrepText} onChange={(e) => setSitrepText(e.target.value)} />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={incCasualties} onChange={(e) => setIncCasualties(e.target.checked)} />
              Include casualty personal details in Excel export (restricted access)
            </label>
            <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard.writeText(sitrepText); toast({ title: 'Copied to clipboard' }); }}>
              <Copy className="w-3.5 h-3.5 mr-1" />Copy narrative
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
