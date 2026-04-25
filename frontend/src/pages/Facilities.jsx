import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cnpdrrmceoc } from '@/lib/cnpdrrmceoc';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, MapPin, Building2, Search } from 'lucide-react';
import { MUNICIPALITIES, FACILITY_TYPES, SEVERITY_LEVELS } from '@/lib/constants';
import { cn } from '@/lib/utils';

const statusStyles = {
  operational: 'bg-green-500/10 text-green-600',
  damaged: 'bg-yellow-500/10 text-yellow-600',
  non_operational: 'bg-red-500/10 text-red-600',
};

export default function Facilities() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterMunicipality, setFilterMunicipality] = useState('all');
  const [form, setForm] = useState({
    name: '', type: 'hospital', municipality: '', barangay: '',
    latitude: '', longitude: '', capacity: '', contact_person: '',
    contact_number: '', flood_exposure: 'none', landslide_exposure: 'none',
    storm_surge_exposure: 'none', status: 'operational',
  });

  const { data: facilities = [], isLoading } = useQuery({
    queryKey: ['facilities'],
    queryFn: () => cnpdrrmceoc.entities.Facility.list('-created_date', 500),
  });

  const createMutation = useMutation({
    mutationFn: (data) => cnpdrrmceoc.entities.Facility.create({
      ...data,
      latitude: data.latitude ? Number(data.latitude) : undefined,
      longitude: data.longitude ? Number(data.longitude) : undefined,
      capacity: data.capacity ? Number(data.capacity) : undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['facilities'] });
      setOpen(false);
    },
  });

  const filtered = facilities
    .filter(f => filterType === 'all' || f.type === filterType)
    .filter(f => filterMunicipality === 'all' || f.municipality === filterMunicipality)
    .filter(f => !search || f.name?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Critical Facilities</h1>
          <p className="text-sm text-muted-foreground mt-1">Infrastructure registry & exposure tracking</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" />Add Facility</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Register Facility</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(form); }} className="space-y-4">
              <div>
                <Label className="text-xs">Name</Label>
                <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Type</Label>
                  <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {FACILITY_TYPES.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                      <SelectItem value="road">Road</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Status</Label>
                  <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="operational">Operational</SelectItem>
                      <SelectItem value="damaged">Damaged</SelectItem>
                      <SelectItem value="non_operational">Non-Operational</SelectItem>
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
                  <Label className="text-xs">Capacity</Label>
                  <Input type="number" value={form.capacity} onChange={e => setForm({ ...form, capacity: e.target.value })} />
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
              <div className="space-y-2 border-t pt-3">
                <Label className="text-xs font-semibold">Hazard Exposure</Label>
                {['flood_exposure', 'landslide_exposure', 'storm_surge_exposure'].map(field => (
                  <div key={field} className="flex items-center justify-between">
                    <Label className="text-xs capitalize">{field.replace('_exposure', '').replace('_', ' ')}</Label>
                    <Select value={form[field]} onValueChange={v => setForm({ ...form, [field]: v })}>
                      <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {SEVERITY_LEVELS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
              <Button type="submit" className="w-full" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Adding...' : 'Add Facility'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 bg-muted rounded-lg px-3 py-1.5 flex-1 min-w-48 max-w-sm">
          <Search className="w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search facilities..." value={search} onChange={e => setSearch(e.target.value)} className="border-0 bg-transparent h-7 p-0 focus-visible:ring-0 text-sm" />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {FACILITY_TYPES.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterMunicipality} onValueChange={setFilterMunicipality}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Municipalities</SelectItem>
            {MUNICIPALITIES.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {isLoading ? (
          <Card className="p-8 text-center col-span-full"><p className="text-sm text-muted-foreground">Loading...</p></Card>
        ) : filtered.length === 0 ? (
          <Card className="p-8 text-center col-span-full"><p className="text-sm text-muted-foreground">No facilities found</p></Card>
        ) : (
          filtered.map((f) => (
            <Card key={f.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-semibold">{f.name}</h3>
                    <p className="text-[10px] text-muted-foreground capitalize">{f.type?.replace(/_/g, ' ')}</p>
                  </div>
                  <Badge className={cn("text-[10px]", statusStyles[f.status])}>
                    {f.status?.replace('_', ' ')}
                  </Badge>
                </div>
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <MapPin className="w-3 h-3" /> {f.municipality}{f.barangay && `, ${f.barangay}`}
                </div>
                {f.capacity && <p className="text-[10px] text-muted-foreground">Capacity: {f.capacity} persons</p>}
                <div className="flex gap-1.5 flex-wrap">
                  {f.flood_exposure && f.flood_exposure !== 'none' && (
                    <Badge variant="outline" className="text-[9px] border-blue-500/30 text-blue-600">Flood: {f.flood_exposure}</Badge>
                  )}
                  {f.landslide_exposure && f.landslide_exposure !== 'none' && (
                    <Badge variant="outline" className="text-[9px] border-purple-500/30 text-purple-600">Landslide: {f.landslide_exposure}</Badge>
                  )}
                  {f.storm_surge_exposure && f.storm_surge_exposure !== 'none' && (
                    <Badge variant="outline" className="text-[9px] border-cyan-500/30 text-cyan-600">Storm Surge: {f.storm_surge_exposure}</Badge>
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
