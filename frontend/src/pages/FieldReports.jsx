import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cnpdrrmceoc } from '@/lib/cnpdrrmceoc';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, MapPin, Users, Camera, Upload } from 'lucide-react';
import { MUNICIPALITIES } from '@/lib/constants';
import { cn } from '@/lib/utils';
import moment from 'moment';

const incidentTypes = [
  'flood', 'landslide', 'storm_surge', 'fire', 'road_collapse',
  'structural_damage', 'evacuation', 'rescue', 'other'
];

const statusStyles = {
  reported: 'bg-blue-500/10 text-blue-600',
  verified: 'bg-yellow-500/10 text-yellow-600',
  responding: 'bg-orange-500/10 text-orange-600',
  resolved: 'bg-green-500/10 text-green-600',
};

const priorityStyles = {
  low: 'bg-green-500/10 text-green-600',
  medium: 'bg-yellow-500/10 text-yellow-600',
  high: 'bg-orange-500/10 text-orange-600',
  critical: 'bg-red-500/10 text-red-600',
};

export default function FieldReports() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({
    title: '', type: 'flood', status: 'reported', priority: 'medium',
    description: '', municipality: '', barangay: '',
    reporter_name: '', reporter_contact: '',
    affected_families: '', affected_persons: '',
    latitude: '', longitude: '', photo_urls: [],
  });

  const { data: incidents = [], isLoading } = useQuery({
    queryKey: ['incidents'],
    queryFn: () => cnpdrrmceoc.entities.IncidentReport.list('-created_date', 100),
  });

  const createMutation = useMutation({
    mutationFn: (data) => cnpdrrmceoc.entities.IncidentReport.create({
      ...data,
      affected_families: data.affected_families ? Number(data.affected_families) : undefined,
      affected_persons: data.affected_persons ? Number(data.affected_persons) : undefined,
      latitude: data.latitude ? Number(data.latitude) : undefined,
      longitude: data.longitude ? Number(data.longitude) : undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      setOpen(false);
    },
  });

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await cnpdrrmceoc.integrations.Core.UploadFile({ file });
    setForm(prev => ({ ...prev, photo_urls: [...prev.photo_urls, file_url] }));
    setUploading(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Field Reports</h1>
          <p className="text-sm text-muted-foreground mt-1">Incident reports from ground teams</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" />New Report</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Submit Field Report</DialogTitle>
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
                      {incidentTypes.map(t => <SelectItem key={t} value={t}>{t.replace(/_/g, ' ')}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Priority</Label>
                  <Select value={form.priority} onValueChange={v => setForm({ ...form, priority: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Municipality</Label>
                  <Select value={form.municipality} onValueChange={v => setForm({ ...form, municipality: v })}>
                    <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>
                      {MUNICIPALITIES.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Barangay</Label>
                  <Input value={form.barangay} onChange={e => setForm({ ...form, barangay: e.target.value })} />
                </div>
              </div>
              <div>
                <Label className="text-xs">Description</Label>
                <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Reporter Name</Label>
                  <Input value={form.reporter_name} onChange={e => setForm({ ...form, reporter_name: e.target.value })} />
                </div>
                <div>
                  <Label className="text-xs">Contact</Label>
                  <Input value={form.reporter_contact} onChange={e => setForm({ ...form, reporter_contact: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Affected Families</Label>
                  <Input type="number" value={form.affected_families} onChange={e => setForm({ ...form, affected_families: e.target.value })} />
                </div>
                <div>
                  <Label className="text-xs">Affected Persons</Label>
                  <Input type="number" value={form.affected_persons} onChange={e => setForm({ ...form, affected_persons: e.target.value })} />
                </div>
              </div>
              <div>
                <Label className="text-xs">Photos</Label>
                <div className="flex items-center gap-2 mt-1">
                  <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed cursor-pointer hover:bg-muted text-xs">
                    <Camera className="w-4 h-4" />
                    {uploading ? 'Uploading...' : 'Add Photo'}
                    <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                  </label>
                  {form.photo_urls.length > 0 && (
                    <Badge variant="secondary" className="text-[10px]">{form.photo_urls.length} photo(s)</Badge>
                  )}
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Submitting...' : 'Submit Report'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-3">
        {isLoading ? (
          <Card className="p-8 text-center"><p className="text-sm text-muted-foreground">Loading...</p></Card>
        ) : incidents.length === 0 ? (
          <Card className="p-8 text-center"><p className="text-sm text-muted-foreground">No reports yet</p></Card>
        ) : (
          incidents.map((inc) => (
            <Card key={inc.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-semibold">{inc.title}</h3>
                      <Badge className={cn("text-[10px]", statusStyles[inc.status])}>{inc.status}</Badge>
                      <Badge className={cn("text-[10px]", priorityStyles[inc.priority])}>{inc.priority}</Badge>
                    </div>
                    {inc.description && <p className="text-xs text-muted-foreground line-clamp-2">{inc.description}</p>}
                    <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
                      <span className="capitalize">{inc.type?.replace(/_/g, ' ')}</span>
                      {inc.municipality && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{inc.municipality}</span>}
                      {inc.barangay && <span>{inc.barangay}</span>}
                      <span>{moment(inc.created_date).fromNow()}</span>
                    </div>
                  </div>
                  {(inc.affected_families || inc.affected_persons) && (
                    <div className="text-right shrink-0 space-y-0.5">
                      {inc.affected_families && (
                        <div>
                          <p className="text-sm font-bold">{inc.affected_families}</p>
                          <p className="text-[10px] text-muted-foreground">families</p>
                        </div>
                      )}
                      {inc.affected_persons && (
                        <div>
                          <p className="text-sm font-bold">{inc.affected_persons}</p>
                          <p className="text-[10px] text-muted-foreground">persons</p>
                        </div>
                      )}
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
