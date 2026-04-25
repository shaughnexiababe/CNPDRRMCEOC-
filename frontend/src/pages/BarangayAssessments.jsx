import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cnpdrrmceoc } from '@/lib/cnpdrrmceoc';
import { MUNICIPALITIES } from '@/lib/constants';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Plus, ClipboardList, MapPin, User, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

const exposureLevels = ['none', 'low', 'moderate', 'high', 'very_high'];
const exposureColors = {
  none: 'bg-gray-500/10 text-gray-600 border-gray-500/20',
  low: 'bg-green-500/10 text-green-600 border-green-500/20',
  moderate: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
  high: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
  very_high: 'bg-red-500/10 text-red-600 border-red-500/20',
};
const statusConfig = {
  submitted: { label: 'Submitted', icon: Clock, color: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
  verified: { label: 'Verified', icon: CheckCircle, color: 'bg-green-500/10 text-green-600 border-green-500/20' },
  needs_update: { label: 'Needs Update', icon: AlertCircle, color: 'bg-orange-500/10 text-orange-600 border-orange-500/20' },
};

const emptyForm = {
  barangay: '',
  municipality: '',
  submitter_name: '',
  submitter_contact: '',
  flood_exposure: 'none',
  landslide_exposure: 'none',
  storm_surge_exposure: 'none',
  total_households: '',
  vulnerable_households: '',
  evacuation_center: '',
  evacuation_travel_time_minutes: '',
  road_accessibility: 'passable',
  notes: '',
};

export default function BarangayAssessments() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [filterMunicipality, setFilterMunicipality] = useState('all');
  const queryClient = useQueryClient();

  const { data: assessments = [] } = useQuery({
    queryKey: ['barangay_assessments'],
    queryFn: () => cnpdrrmceoc.entities.BarangayAssessment.list('-created_date', 100),
  });

  const createMutation = useMutation({
    mutationFn: (data) => cnpdrrmceoc.entities.BarangayAssessment.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['barangay_assessments'] });
      setOpen(false);
      setForm(emptyForm);
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }) => cnpdrrmceoc.entities.BarangayAssessment.update(id, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['barangay_assessments'] }),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate({
      ...form,
      total_households: form.total_households ? Number(form.total_households) : undefined,
      vulnerable_households: form.vulnerable_households ? Number(form.vulnerable_households) : undefined,
      evacuation_travel_time_minutes: form.evacuation_travel_time_minutes ? Number(form.evacuation_travel_time_minutes) : undefined,
    });
  };

  const set = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const filtered = filterMunicipality === 'all'
    ? assessments
    : assessments.filter(a => a.municipality === filterMunicipality);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Barangay Assessments</h1>
          <p className="text-sm text-muted-foreground mt-1">Community risk assessments submitted by barangay staff</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" />Submit Assessment</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Community Risk Assessment Form</DialogTitle>
              <DialogDescription>
                Submit the latest risk assessment data for your barangay. All fields marked with * are required.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-5 mt-2">
              {/* Identity */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Municipality *</Label>
                  <Select value={form.municipality} onValueChange={v => set('municipality', v)}>
                    <SelectTrigger><SelectValue placeholder="Select municipality" /></SelectTrigger>
                    <SelectContent>
                      {MUNICIPALITIES.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Barangay *</Label>
                  <Input value={form.barangay} onChange={e => set('barangay', e.target.value)} placeholder="e.g. Brgy. San Roque" required />
                </div>
                <div className="space-y-1.5">
                  <Label>Submitted By *</Label>
                  <Input value={form.submitter_name} onChange={e => set('submitter_name', e.target.value)} placeholder="Full name" required />
                </div>
                <div className="space-y-1.5">
                  <Label>Contact Number</Label>
                  <Input value={form.submitter_contact} onChange={e => set('submitter_contact', e.target.value)} placeholder="09XX-XXX-XXXX" />
                </div>
              </div>

              {/* Hazard Exposure */}
              <div>
                <p className="text-sm font-semibold mb-3">Hazard Exposure Levels</p>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { key: 'flood_exposure', label: 'Flood' },
                    { key: 'landslide_exposure', label: 'Landslide' },
                    { key: 'storm_surge_exposure', label: 'Storm Surge' },
                  ].map(({ key, label }) => (
                    <div key={key} className="space-y-1.5">
                      <Label>{label}</Label>
                      <Select value={form[key]} onValueChange={v => set(key, v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {exposureLevels.map(l => (
                            <SelectItem key={l} value={l}>{l.replace('_', ' ')}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              </div>

              {/* Population */}
              <div>
                <p className="text-sm font-semibold mb-3">Population Data</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Total Households</Label>
                    <Input type="number" value={form.total_households} onChange={e => set('total_households', e.target.value)} placeholder="0" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Vulnerable Households</Label>
                    <Input type="number" value={form.vulnerable_households} onChange={e => set('vulnerable_households', e.target.value)} placeholder="Elderly, PWD, pregnant" />
                  </div>
                </div>
              </div>

              {/* Evacuation */}
              <div>
                <p className="text-sm font-semibold mb-3">Evacuation Readiness</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Nearest Evacuation Center</Label>
                    <Input value={form.evacuation_center} onChange={e => set('evacuation_center', e.target.value)} placeholder="Name of evacuation center" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Travel Time (minutes)</Label>
                    <Input type="number" value={form.evacuation_travel_time_minutes} onChange={e => set('evacuation_travel_time_minutes', e.target.value)} placeholder="e.g. 15" />
                  </div>
                  <div className="space-y-1.5 col-span-2">
                    <Label>Road Accessibility</Label>
                    <Select value={form.road_accessibility} onValueChange={v => set('road_accessibility', v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="passable">Passable</SelectItem>
                        <SelectItem value="passable_with_restriction">Passable with Restriction</SelectItem>
                        <SelectItem value="impassable">Impassable</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Additional Notes</Label>
                <Textarea value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Any additional observations or concerns..." rows={3} />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Submitting...' : 'Submit Assessment'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Submitted</p>
            <p className="text-2xl font-bold mt-1">{assessments.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Verified</p>
            <p className="text-2xl font-bold mt-1 text-green-600">{assessments.filter(a => a.status === 'verified').length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">High/Very High Flood Risk</p>
            <p className="text-2xl font-bold mt-1 text-orange-600">
              {assessments.filter(a => a.flood_exposure === 'high' || a.flood_exposure === 'very_high').length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Vulnerable HH</p>
            <p className="text-2xl font-bold mt-1 text-red-600">
              {assessments.reduce((sum, a) => sum + (a.vulnerable_households || 0), 0).toLocaleString()}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <Select value={filterMunicipality} onValueChange={setFilterMunicipality}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by municipality" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Municipalities</SelectItem>
            {MUNICIPALITIES.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">{filtered.length} assessment{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Assessment Cards */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center text-muted-foreground">
            <ClipboardList className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>No assessments submitted yet.</p>
            <p className="text-xs mt-1">Barangay staff can use the "Submit Assessment" button above.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(a => {
            const sc = statusConfig[a.status] || statusConfig.submitted;
            const StatusIcon = sc.icon;
            return (
              <Card key={a.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-sm font-semibold">{a.barangay}</CardTitle>
                      <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                        <MapPin className="w-3 h-3" />
                        {a.municipality}
                      </div>
                    </div>
                    <Badge className={`text-[10px] shrink-0 ${sc.color}`}>
                      <StatusIcon className="w-3 h-3 mr-1" />{sc.label}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Hazard Exposure */}
                  <div className="grid grid-cols-3 gap-1.5 text-center">
                    {[
                      { label: 'Flood', val: a.flood_exposure },
                      { label: 'Landslide', val: a.landslide_exposure },
                      { label: 'Storm Surge', val: a.storm_surge_exposure },
                    ].map(({ label, val }) => (
                      <div key={label} className={`rounded-md border px-1 py-1.5 ${exposureColors[val] || exposureColors.none}`}>
                        <p className="text-[9px] uppercase tracking-wide font-medium opacity-70">{label}</p>
                        <p className="text-[11px] font-semibold capitalize">{(val || 'none').replace('_', ' ')}</p>
                      </div>
                    ))}
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {a.total_households && (
                      <div>
                        <span className="text-muted-foreground">Total HH: </span>
                        <span className="font-medium">{a.total_households.toLocaleString()}</span>
                      </div>
                    )}
                    {a.vulnerable_households && (
                      <div>
                        <span className="text-muted-foreground">Vulnerable: </span>
                        <span className="font-medium text-orange-600">{a.vulnerable_households.toLocaleString()}</span>
                      </div>
                    )}
                    {a.road_accessibility && (
                      <div className="col-span-2">
                        <span className="text-muted-foreground">Road: </span>
                        <span className={`font-medium ${a.road_accessibility === 'impassable' ? 'text-red-600' : a.road_accessibility === 'passable_with_restriction' ? 'text-yellow-600' : 'text-green-600'}`}>
                          {a.road_accessibility.replace(/_/g, ' ')}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Submitter + Date */}
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground border-t pt-2">
                    <div className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {a.submitter_name}
                    </div>
                    <span>{format(new Date(a.created_date), 'MMM d, yyyy')}</span>
                  </div>

                  {/* Admin: verify button */}
                  {a.status === 'submitted' && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full text-xs h-7"
                      onClick={() => updateStatusMutation.mutate({ id: a.id, status: 'verified' })}
                    >
                      <CheckCircle className="w-3 h-3 mr-1" /> Mark as Verified
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
