import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, BarChart3, FilePlus2, Lock, Unlock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { MUNICIPALITIES } from '@/lib/constants';
import { slug } from '@/lib/reporting/ids';
import { isLate, formatDateTime } from '@/lib/reporting/consolidate';
import { getOperation, listReports, openNextCycle, setCycleDue, setOperationStatus } from '@/lib/reporting/store';
import StatusBadge from '@/components/reporting/StatusBadge';
import { useReportingAccess } from '@/components/reporting/useReportingAccess';

export default function OperationDetail() {
  const { opId } = useParams();
  const { isStaff, isMdrrmo, myMunicipality } = useReportingAccess();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [due, setDue] = useState('');

  const { data: op, isLoading } = useQuery({ queryKey: ['operation', opId], queryFn: () => getOperation(opId) });
  const scope = isStaff ? undefined : myMunicipality;
  const { data: reports = [] } = useQuery({
    queryKey: ['reports', opId, scope || 'all'],
    queryFn: () => listReports(opId, scope ? { municipality: scope } : {}),
    enabled: !!op && (isStaff || !!scope),
  });

  const refresh = () => { qc.invalidateQueries({ queryKey: ['operation', opId] }); qc.invalidateQueries({ queryKey: ['reports', opId] }); qc.invalidateQueries({ queryKey: ['operations'] }); };
  const next = useMutation({
    mutationFn: () => openNextCycle(opId, { current: op.current_report_no || 1, due_at: due }),
    onSuccess: (n) => { refresh(); setDue(''); toast({ title: `Report No. ${n} is now open` }); },
    onError: (e) => toast({ title: 'Failed', description: e.message, variant: 'destructive' }),
  });
  const toggle = useMutation({
    mutationFn: () => setOperationStatus(opId, op.status === 'active' ? 'closed' : 'active'),
    onSuccess: refresh,
  });
  const changeDue = useMutation({
    mutationFn: (v) => setCycleDue(opId, op.current_report_no || 1, v),
    onSuccess: refresh,
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!op) return <p className="text-sm">Operation not found.</p>;

  const current = op.current_report_no || 1;
  const nos = Array.from({ length: current }, (_, i) => i + 1);
  const munis = isStaff ? MUNICIPALITIES : (myMunicipality ? [myMunicipality] : []);
  const find = (m, n) => reports.find((r) => r.municipality === m && r.report_no === n);
  const cycleDue = op.cycles?.[current]?.due_at;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <Link to="/reports" className="text-xs text-muted-foreground inline-flex items-center gap-1 hover:text-foreground"><ArrowLeft className="w-3 h-3" />All operations</Link>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">{op.name} <StatusBadge status={op.status} /></h1>
          <p className="text-sm text-muted-foreground">
            Report No. {current} is open{cycleDue ? ` · deadline ${formatDateTime(cycleDue)}` : ' · no deadline set'}
          </p>
        </div>
        {isStaff && (
          <div className="flex flex-wrap gap-2">
            <Button asChild><Link to={`/reports/${opId}/consolidated`}><BarChart3 className="w-4 h-4 mr-2" />Consolidated report</Link></Button>
            <Button variant="outline" onClick={() => toggle.mutate()}>
              {op.status === 'active' ? <><Lock className="w-4 h-4 mr-2" />Close operation</> : <><Unlock className="w-4 h-4 mr-2" />Reopen</>}
            </Button>
          </div>
        )}
      </div>

      {isStaff && op.status === 'active' && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Reporting cycles</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5"><Label className="text-xs">Deadline for Report No. {current}</Label>
              <Input type="datetime-local" defaultValue={cycleDue || ''} key={`${current}-${cycleDue}`} className="h-9 w-56"
                onBlur={(e) => { if (e.target.value !== (cycleDue || '')) changeDue.mutate(e.target.value); }} /></div>
            <div className="space-y-1.5"><Label className="text-xs">Deadline for the next report (optional)</Label>
              <Input type="datetime-local" value={due} onChange={(e) => setDue(e.target.value)} className="h-9 w-56" /></div>
            <Button variant="secondary" disabled={next.isPending} onClick={() => next.mutate()}>
              <FilePlus2 className="w-4 h-4 mr-2" />Open Report No. {current + 1}
            </Button>
          </CardContent>
        </Card>
      )}

      {isMdrrmo && !myMunicipality && <p className="text-sm text-red-600">Your account has no municipality assigned.</p>}

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">{isStaff ? 'Municipal submissions' : `${myMunicipality} reports`}</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="py-2 pr-3 font-medium">Municipality</th>
                {nos.map((n) => <th key={n} className="py-2 px-2 font-medium">Report No. {n}</th>)}
              </tr>
            </thead>
            <tbody>
              {munis.map((m) => (
                <tr key={m} className="border-b last:border-0">
                  <td className="py-2 pr-3 font-medium">{m}</td>
                  {nos.map((n) => {
                    const r = find(m, n);
                    const late = r?.status === 'submitted' ? isLate(r, op.cycles?.[n]) : null;
                    const canOpen = r || (op.status === 'active' && n === current);
                    return (
                      <td key={n} className="py-2 px-2">
                        {canOpen ? (
                          <Link to={`/reports/${opId}/${slug(m)}/${n}`} className="inline-flex items-center gap-1.5">
                            <StatusBadge status={r ? r.status : 'missing'}>{r ? undefined : (isStaff ? 'Not started' : 'Start')}</StatusBadge>
                            {late && <StatusBadge status="late" />}
                          </Link>
                        ) : <span className="text-muted-foreground">—</span>}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          {isStaff && <p className="text-[11px] text-muted-foreground mt-3">Staff may open any municipality’s report to encode data on its behalf (for example when it has lost connectivity).</p>}
        </CardContent>
      </Card>
    </div>
  );
}
