import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cnpdrrmceoc } from '@/lib/cnpdrrmceoc';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, AlertTriangle, Clock, MapPin } from 'lucide-react';
import { MUNICIPALITIES, HAZARD_TYPES, SEVERITY_LEVELS } from '@/lib/constants';
import { cn } from '@/lib/utils';
import moment from 'moment';

const severityStyles = {
  low: 'bg-green-500/10 text-green-600 border-green-500/20',
  moderate: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
  high: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
  very_high: 'bg-red-500/10 text-red-600 border-red-500/20',
};

const statusStyles = {
  active: 'bg-red-500/10 text-red-600',
  monitoring: 'bg-yellow-500/10 text-yellow-600',
  resolved: 'bg-green-500/10 text-green-600',
  expired: 'bg-gray-500/10 text-gray-500',
};

export default function HazardAlerts() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [form, setForm] = useState({
    title: '', type: 'flood', severity: 'moderate', status: 'active',
    description: '', affected_municipality: '', source: '',
    estimated_affected_households: '', latitude: '', longitude: '',
    issued_at: new Date().toISOString().slice(0, 16),
  });

  const { data: alerts = [], isLoading } = useQuery({
    queryKey: ['alerts'],
    queryFn: () => cnpdrrmceoc.entities.HazardAlert.list('-created_date', 100),
  });

  const createMutation = useMutation({
    mutationFn: (data) => cnpdrrmceoc.entities.HazardAlert.create({
      ...data,
      estimated_affected_households: data.estimated_affected_households ? Number(data.estimated_affected_households) : undefined,
      latitude: data.latitude ? Number(data.latitude) : undefined,
      longitude: data.longitude ? Number(data.longitude) : undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      setOpen(false);
      setForm({ title: '', type: 'flood', severity: 'moderate', status: 'active', description: '', affected_municipality: '', source: '', estimated_affected_households: '', latitude: '', longitude: '', issued_at: new Date().toISOString().slice(0, 16) });
    },
  });

  const filtered = filterStatus === 'all' ? alerts : alerts.filter(a => a.status === filterStatus);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Hazard Alerts</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage and track hazard warnings</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="monitoring">Monitoring</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
            </SelectContent>
          </Select>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="w-4 h-4 mr-2" />New Alert</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Hazard Alert</DialogTitle>
              </DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(form); }} className="space-y-4">
                <div>
                  <Label className="text-xs">Title</Label>
                  <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Type</Label>
                    <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {HAZARD_TYPES.map(h => <SelectItem key={h.value} value={h.value}>{h.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Severity</Label>
                    <Select value={form.severity} onValueChange={v => setForm({ ...form, severity: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {SEVERITY_LEVELS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Municipality</Label>
                  <Select value={form.affected_municipality} onValueChange={v => setForm({ ...form, affected_municipality: v })}>
                    <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>
                      {MUNICIPALITIES.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Description</Label>
                  <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Source</Label>
                    <Input value={form.source} onChange={e => setForm({ ...form, source: e.target.value })} placeholder="e.g. PAGASA" />
                  </div>
                  <div>
                    <Label className="text-xs">Est. Households</Label>
                    <Input type="number" value={form.estimated_affected_households} onChange={e => setForm({ ...form, estimated_affected_households: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Latitude</Label>
                    <Input type="number" step="any" value={form.latitude} onChange={e => setForm({ ...form, latitude: e.target.value })} />
                  </div>
                  <div>
                    <Label className="text-xs">Longitude</Label>
                    <Input type="number" step="any" value={form.longitude} onChange={e => setForm({ ...form, longitude: e.target.value })} />
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Creating...' : 'Create Alert'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-3">
        {isLoading ? (
          <Card className="p-8 text-center"><p className="text-sm text-muted-foreground">Loading alerts...</p></Card>
        ) : filtered.length === 0 ? (
          <Card className="p-8 text-center"><p className="text-sm text-muted-foreground">No alerts found</p></Card>
        ) : (
          filtered.map((alert) => (
            <Card key={alert.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-semibold">{alert.title}</h3>
                      <Badge className={cn("text-[10px] border", severityStyles[alert.severity])}>{alert.severity?.replace('_', ' ')}</Badge>
                      <Badge className={cn("text-[10px]", statusStyles[alert.status])}>{alert.status}</Badge>
                    </div>
                    {alert.description && <p className="text-xs text-muted-foreground line-clamp-2">{alert.description}</p>}
                    <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
                      <span className="capitalize">{alert.type}</span>
                      {alert.affected_municipality && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{alert.affected_municipality}</span>}
                      {alert.source && <span>Source: {alert.source}</span>}
                      {alert.issued_at && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{moment(alert.issued_at).format('MMM D, HH:mm')}</span>}
                    </div>
                  </div>
                  {alert.estimated_affected_households && (
                    <div className="text-right shrink-0">
                      <p className="text-lg font-bold">{alert.estimated_affected_households.toLocaleString()}</p>
                      <p className="text-[10px] text-muted-foreground">households</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
