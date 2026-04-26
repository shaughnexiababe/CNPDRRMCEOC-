import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cnpdrrmceoc } from '@/lib/cnpdrrmceoc';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Layers, Upload, Database, FileText } from 'lucide-react';
import { MUNICIPALITIES, HAZARD_TYPES } from '@/lib/constants';

const typeColors = {
  flood: 'bg-blue-500/10 text-blue-600',
  landslide: 'bg-purple-500/10 text-purple-600',
  storm_surge: 'bg-cyan-500/10 text-cyan-600',
  infrastructure: 'bg-green-500/10 text-green-600',
  liquefaction: 'bg-orange-500/10 text-orange-600',
  fault_line: 'bg-red-500/10 text-red-600',
  custom: 'bg-gray-500/10 text-gray-600',
};

export default function DataLayers() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({
    name: '', type: 'flood', format: 'geojson', description: '',
    source: '', municipality: '', file_url: '', is_active: true,
  });

  const { data: layers = [], isLoading } = useQuery({
    queryKey: ['layers'],
    queryFn: () => cnpdrrmceoc.entities.HazardLayer.list('-created_date', 100),
  });

  const createMutation = useMutation({
    mutationFn: (data) => cnpdrrmceoc.entities.HazardLayer.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['layers'] });
      // If uploading infrastructure, also invalidate facilities cache
      if (form.type === 'infrastructure') {
        queryClient.invalidateQueries({ queryKey: ['facilities'] });
      }
      setOpen(false);
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, is_active }) => cnpdrrmceoc.entities.HazardLayer.update(id, { is_active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['layers'] }),
  });

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await cnpdrrmceoc.integrations.Core.UploadFile({ file });
    setForm(prev => ({ ...prev, file_url }));
    setUploading(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Data Layers</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage GIS hazard layers (GeoJSON, KML)</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" />Upload Layer</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Upload Hazard Layer</DialogTitle>
              <DialogDescription>
                Add a new GeoJSON or KML layer to the GIS map. This data will be available for situational awareness.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(form); }} className="space-y-4">
              <div>
                <Label className="text-xs">Layer Name</Label>
                <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Hazard Type</Label>
                  <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="flood">Flood</SelectItem>
                      <SelectItem value="landslide">Landslide</SelectItem>
                      <SelectItem value="storm_surge">Storm Surge</SelectItem>
                      <SelectItem value="infrastructure">Critical Infrastructure</SelectItem>
                      <SelectItem value="liquefaction">Liquefaction</SelectItem>
                      <SelectItem value="fault_line">Fault Line</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Format</Label>
                  <Select value={form.format} onValueChange={v => setForm({ ...form, format: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="geojson">GeoJSON</SelectItem>
                      <SelectItem value="kml">KML</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label className="text-xs">Municipality (optional)</Label>
                <Select value={form.municipality || 'none'} onValueChange={v => setForm({ ...form, municipality: v === 'none' ? '' : v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Province-wide</SelectItem>
                    {MUNICIPALITIES.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Source</Label>
                <Input value={form.source} onChange={e => setForm({ ...form, source: e.target.value })} placeholder="e.g. DENR-MGB, HazardHunterPH" />
              </div>
              <div>
                <Label className="text-xs">Description</Label>
                <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} />
              </div>
              <div>
                <Label className="text-xs">Upload File</Label>
                <label className="flex items-center justify-center gap-2 p-6 rounded-lg border-2 border-dashed cursor-pointer hover:bg-muted/50 transition-colors mt-1">
                  <Upload className="w-5 h-5 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {uploading ? 'Uploading...' : form.file_url ? 'File uploaded ✓' : 'Click to upload GeoJSON or KML'}
                  </span>
                  <input type="file" accept=".geojson,.json,.kml" onChange={handleFileUpload} className="hidden" />
                </label>
              </div>
              <Button type="submit" className="w-full" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Saving...' : 'Save Layer'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Supported Formats Info */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-4 flex items-center gap-3">
          <Database className="w-5 h-5 text-primary shrink-0" />
          <div>
            <p className="text-sm font-medium">Interoperable Data Formats</p>
            <p className="text-xs text-muted-foreground">Supports GeoJSON and KML files. Compatible with HazardHunterPH, DENR-MGB, and NAMRIA datasets.</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3">
        {isLoading ? (
          <Card className="p-8 text-center"><p className="text-sm text-muted-foreground">Loading...</p></Card>
        ) : layers.length === 0 ? (
          <Card className="p-12 text-center space-y-3">
            <Layers className="w-10 h-10 text-muted-foreground mx-auto" />
            <p className="text-sm text-muted-foreground">No layers uploaded yet</p>
            <p className="text-xs text-muted-foreground">Upload GeoJSON or KML files to add hazard layers</p>
          </Card>
        ) : (
          layers.map((layer) => (
            <Card key={layer.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold truncate">{layer.name}</h3>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <Badge className={typeColors[layer.type] || typeColors.custom} variant="secondary">
                        {layer.type?.replace('_', ' ')}
                      </Badge>
                      <Badge variant="outline" className="text-[10px]">{layer.format?.toUpperCase()}</Badge>
                      {layer.municipality && <span className="text-[10px] text-muted-foreground">{layer.municipality}</span>}
                      {layer.source && <span className="text-[10px] text-muted-foreground">via {layer.source}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Label className="text-[10px] text-muted-foreground">{layer.is_active ? 'Active' : 'Inactive'}</Label>
                  <Switch
                    checked={layer.is_active !== false}
                    onCheckedChange={(checked) => toggleMutation.mutate({ id: layer.id, is_active: checked })}
                  />
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
