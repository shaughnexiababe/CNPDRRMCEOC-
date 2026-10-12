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
  const [form, setForm] = useState({ name: '', hazard_type: 'typhoon', start_date: '', due_at: '' });

  const { data: operations = [], isLoading, error } = useQuery({ queryKey: ['operations'], queryFn: listOperations });

  const create = useMutation({
    mutationFn: () => createOperation({ ...form, user }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['operations'] });
      setOpen(false);
      setForm({ name: '', hazard_type: 'typhoon', start_date: '', due_at: '' });
      toast({ title: 'Operation created', description: 'Report No. 1 is now open for the municipalities.' });
    },
    onError: (e) => toast({ title: 'Could not create operation', description: e.message, variant: 'destructive' }),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2"><ClipboardCheck className="w-6 h-6" />Situational Reports</h1>
          <p className="text-sm text-muted-foreground mt-1">
            NDRRMC MC 05, s. 2025 reporting templates — municipal reports and provincial consolidation
            {isMdrrmo && myMunicipality ? ` · ${myMunicipality}` : ''}
          </p>
        </div>
        {isStaff && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" />New operation</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Start a reporting operation</DialogTitle>
                <DialogDescription>One operation per event (e.g. a typhoon). Municipalities then file numbered reports under it.</DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1.5"><Label>Name *</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Typhoon (local name) — October 2026" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5"><Label>Hazard</Label>
                    <select className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm" value={form.hazard_type} onChange={(e) => setForm({ ...form, hazard_type: e.target.value })}>
                      {HAZARD_TYPES.map((h) => <option key={h.value} value={h.value}>{h.label}</option>)}
                    </select></div>
                  <div className="space-y-1.5"><Label>Start date</Label>
                    <Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></div>
                </div>
                <div className="space-y-1.5"><Label>Deadline for Report No. 1 (optional)</Label>
                  <Input type="datetime-local" value={form.due_at} onChange={(e) => setForm({ ...form, due_at: e.target.value })} /></div>
              </div>
              <DialogFooter>
                <Button disabled={!form.name.trim() || create.isPending} onClick={() => create.mutate()}>{create.isPending ? 'Creating…' : 'Create'}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {isMdrrmo && !myMunicipality && (
        <Card className="border-red-500/30 bg-red-500/5"><CardContent className="p-4 text-sm text-red-700">
          Your account is not assigned to a municipality yet. Ask the PDRRMO administrator to set it before you can file reports.
        </CardContent></Card>
      )}
      {error && <Card><CardContent className="p-4 text-sm text-red-600">Could not load operations: {error.message}</CardContent></Card>}
      {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {!isLoading && operations.length === 0 && !error && (
        <Card><CardContent className="p-10 text-center text-sm text-muted-foreground">
          No reporting operations yet.{isStaff ? ' Create one when an event begins.' : ' The Provincial EOC will open one when an event begins.'}
        </CardContent></Card>
      )}

      <div className="grid gap-3">
        {operations.map((op) => (
          <Link key={op.id} to={`/reports/${op.id}`}>
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-4 flex items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2"><p className="font-semibold">{op.name}</p><StatusBadge status={op.status} /></div>
                  <p className="text-xs text-muted-foreground capitalize">
                    {(op.hazard_type || '').replace('_', ' ')} · Report No. {op.current_report_no || 1} open
                    {op.start_date ? ` · started ${op.start_date}` : ''}
                    {fsDate(op.created_at) ? ` · created ${fsDate(op.created_at).toLocaleDateString()}` : ''}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
