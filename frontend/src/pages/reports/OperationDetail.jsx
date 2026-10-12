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
    queryKey: ['reports', opId, scope], queryFn: () => listReports(opId, { municipality: scope }), enabled: !!op,
  });

  const N = op?.current_report_no || 1;
  const cycle = op?.cycles?.[N] || {};

  const nextCycleMut = useMutation({
    mutationFn: () => openNextCycle(opId, { current: N, due_at: due }),
    onSuccess: (nextNo) => {
      qc.invalidateQueries({ queryKey: ['operation', opId] });
      setDue('');
      toast({ title: `Report No. ${nextNo} opened for all 12 municipalities.` });
    },
    onError: (err) => toast({ title: 'Failed to open cycle', description: err.message, variant: 'destructive' }),
  });

  const dueMut = useMutation({
    mutationFn: (d) => setCycleDue(opId, N, d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['operation', opId] });
      toast({ title: 'Deadline updated' });
    },
  });

  const statusMut = useMutation({
    mutationFn: (st) => setOperationStatus(opId, st),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['operation', opId] });
      toast({ title: 'Operation status updated' });
    },
  });

  if (isLoading || !op) {
    return <p className="text-sm text-slate-500 p-8 text-center">Loading operation details…</p>;
  }

  const munisToShow = isStaff ? MUNICIPALITIES : (myMunicipality ? [myMunicipality] : []);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="sm" className="gap-1">
          <Link to="/reports"><ArrowLeft className="w-4 h-4" /> Back to Operations</Link>
        </Button>
      </div>

      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{op.name}</h1>
                <StatusBadge status={op.status} />
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Hazard: {op.hazard_type.toUpperCase()} · Started: {op.start_date || '—'}
              </p>
            </div>

            {isStaff && (
              <div className="flex items-center gap-2">
                <Button asChild variant="outline" size="sm" className="gap-1">
                  <Link to={`/reports/${opId}/consolidated`}>
                    <BarChart3 className="w-4 h-4" /> View Consolidated Report
                  </Link>
                </Button>
                {op.status === 'active' ? (
                  <Button variant="secondary" size="sm" className="gap-1" onClick={() => statusMut.mutate('closed')}>
                    <Lock className="w-4 h-4" /> Close Operation
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" className="gap-1" onClick={() => statusMut.mutate('active')}>
                    <Unlock className="w-4 h-4" /> Re-open Operation
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Reporting Cycle Control (Staff) */}
          {isStaff && (
            <div className="pt-4 border-t flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-slate-800">
                  Active Cycle: Report No. {N}
                </p>
                <p className="text-xs text-slate-500">
                  Deadline: {cycle.due_at ? formatDateTime(cycle.due_at) : 'No deadline set'}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Input
                  type="datetime-local"
                  className="h-8 text-xs w-48"
                  value={due || cycle.due_at || ''}
                  onChange={(e) => setDue(e.target.value)}
                />
                <Button size="sm" variant="outline" onClick={() => dueMut.mutate(due)} disabled={dueMut.isPending}>
                  Set Deadline
                </Button>
                <Button size="sm" className="gap-1 bg-blue-600 hover:bg-blue-700" onClick={() => nextCycleMut.mutate()} disabled={nextCycleMut.isPending}>
                  <FilePlus2 className="w-4 h-4" /> Open Report No. {N + 1}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Submissions Grid */}
      <div className="space-y-3">
        <h2 className="text-base font-bold text-slate-800 dark:text-slate-200">
          Submissions for Report No. {N}
        </h2>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {munisToShow.map((muni) => {
            const mSlug = slug(muni);
            const r = reports.find((x) => x.municipality === muni && x.report_no === N);
            const late = isLate(r, cycle);

            return (
              <Card key={muni} className="hover:border-slate-300 transition-colors">
                <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-sm font-bold">{muni}</CardTitle>
                  <StatusBadge status={r?.status || 'missing'} />
                </CardHeader>
                <CardContent className="p-4 pt-0 space-y-3">
                  <p className="text-xs text-slate-500">
                    {r?.as_of ? `As of ${formatDateTime(r.as_of)}` : 'No report submitted yet for this cycle.'}
                    {late && <span className="text-amber-600 font-semibold ml-1">(Late)</span>}
                  </p>

                  <Button asChild size="sm" variant={r?.status === 'submitted' ? 'secondary' : 'default'} className="w-full text-xs h-8">
                    <Link to={`/reports/${opId}/${mSlug}/${N}`}>
                      {r ? (r.status === 'submitted' ? 'View Submission' : 'Edit Submission') : 'Start Report'}
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
