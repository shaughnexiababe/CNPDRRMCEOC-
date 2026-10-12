import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ClipboardCheck, Plus, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { HAZARD_TYPES } from '@/lib/constants';
import { fsDate } from '@/lib/utils';
import { listOperations, createOperation } from '@/lib/reporting/store';
import StatusBadge from '@/components/reporting/StatusBadge';
import { useReportingAccess } from '@/components/reporting/useReportingAccess';

export default function SituationalReports() {
  const { user, isStaff, isMdrrmo, myMunicipality } = useReportingAccess();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [hazard, setHazard] = useState('typhoon');
  const [start, setStart] = useState('');
  const [due, setDue] = useState('');

  const { data: ops = [], isLoading } = useQuery({ queryKey: ['operations'], queryFn: listOperations });

  const createMut = useMutation({
    mutationFn: () => createOperation({ name, hazard_type: hazard, start_date: start, due_at: due, user }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['operations'] });
      setOpen(false); setName(''); setStart(''); setDue('');
      toast({ title: 'Operation created' });
    },
    onError: (err) => toast({ title: 'Failed to create operation', description: err.message, variant: 'destructive' }),
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <ClipboardCheck className="w-6 h-6 text-blue-600" />
            NDRRMC Situational Reporting
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            MC No. 05, s. 2025 reporting templates (Annexes 1-21) for disaster response operations.
          </p>
        </div>

        {isStaff && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4" /> New Operation
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Create Response Operation</DialogTitle>
                <DialogDescription>
                  Group all municipal report submissions for an incident under one operation name.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-1.5">
                  <Label>Operation Name</Label>
                  <Input placeholder="e.g. Typhoon Kristine (2026)" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Hazard Type</Label>
                    <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={hazard} onChange={(e) => setHazard(e.target.value)}>
                      {HAZARD_TYPES.map((h) => <option key={h} value={h}>{h.toUpperCase()}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Start Date</Label>
                    <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>First Report Deadline (optional)</Label>
                  <Input type="datetime-local" value={due} onChange={(e) => setDue(e.target.value)} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button disabled={!name.trim() || createMut.isPending} onClick={() => createMut.mutate()}>
                  {createMut.isPending ? 'Creating…' : 'Create Operation'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {isLoading ? (
        <p className="text-sm text-slate-500 py-12 text-center">Loading operations…</p>
      ) : ops.length === 0 ? (
        <Card className="border-dashed p-12 text-center">
          <p className="text-slate-500 font-medium">No active or archived operations.</p>
          <p className="text-xs text-slate-400 mt-1">
            {isStaff ? 'Click “New Operation” to start a reporting cycle for a typhoon, flood or earthquake.' : 'Contact the Provincial EOC to open an operation for reporting.'}
          </p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {ops.map((op) => (
            <Card key={op.id} className="hover:border-slate-300 transition-colors">
              <CardContent className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">{op.name}</h2>
                    <StatusBadge status={op.status} />
                  </div>
                  <p className="text-xs text-slate-500">
                    Started {op.start_date || fsDate(op.created_at)} · Current cycle: <span className="font-semibold text-slate-700">Report No. {op.current_report_no || 1}</span>
                  </p>
                </div>

                <div className="flex items-center gap-2 pt-2 sm:pt-0">
                  {isMdrrmo && (
                    <Button asChild variant="outline" size="sm" className="gap-1">
                      <Link to={`/reports/${op.id}`}>
                        Submit Report ({myMunicipality}) <ChevronRight className="w-4 h-4" />
                      </Link>
                    </Button>
                  )}
                  {isStaff && (
                    <>
                      <Button asChild variant="outline" size="sm" className="gap-1">
                        <Link to={`/reports/${op.id}`}>
                          Submissions <ChevronRight className="w-4 h-4" />
                        </Link>
                      </Button>
                      <Button asChild size="sm" className="gap-1 bg-blue-600 hover:bg-blue-700">
                        <Link to={`/reports/${op.id}/consolidated`}>
                          Consolidated View <ChevronRight className="w-4 h-4" />
                        </Link>
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
