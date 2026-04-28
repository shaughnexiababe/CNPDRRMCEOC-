import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cnpdrrmceoc } from '@/lib/cnpdrrmceoc';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, MapPin, Building2, Search, Upload, FileJson, Loader2, Trash2, RefreshCw, Zap } from 'lucide-react';
import { MUNICIPALITIES, FACILITY_TYPES, SEVERITY_LEVELS } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { getSpatialExposure, fetchGeoJSON } from '@/lib/spatial';
import axios from 'axios';

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
  const [importing, setImporting] = useState(false);
  const [displayLimit, setDisplayLimit] = useState(50);
  const [form, setForm] = useState({
    name: '', type: 'hospital', municipality: '', barangay: '',
    latitude: '', longitude: '', capacity: '', contact_person: '',
    contact_number: '', flood_exposure: 'none', landslide_exposure: 'none',
    storm_surge_exposure: 'none', status: 'operational',
  });

  const { data: facilities = [], isLoading: isLoadingRegistry } = useQuery({
    queryKey: ['facilities-registry'],
    queryFn: () => cnpdrrmceoc.entities.Facility.list('-created_date', 1000),
  });

  const { data: layers = [], isLoading: isLoadingLayers } = useQuery({
    queryKey: ['layers'],
    queryFn: () => cnpdrrmceoc.entities.HazardLayer.list('-created_date', 100),
  });

  const handleAutoTagging = async (lat, lng) => {
    if (!lat || !lng) return {};

    // Find active hazard layers
    const hazardLayers = layers.filter(l => l.is_active !== false && ['flood', 'landslide', 'storm_surge'].includes(l.type));

    const results = {
      flood_exposure: 'none',
      landslide_exposure: 'none',
      storm_surge_exposure: 'none'
    };

    for (const layer of hazardLayers) {
      const geojson = await fetchGeoJSON(layer.file_url);
      if (geojson) {
        const exposure = getSpatialExposure(Number(lat), Number(lng), geojson);
        if (layer.type === 'flood') results.flood_exposure = exposure;
        if (layer.type === 'landslide') results.landslide_exposure = exposure;
        if (layer.type === 'storm_surge') results.storm_surge_exposure = exposure;
      }
    }

    return results;
  };

  // Combine manual registry with uploaded infrastructure layers
  const allFacilities = useMemo(() => [
    ...facilities,
    ...layers
      .filter(l => l.type === 'infrastructure' && l.is_active !== false)
      .map(l => ({
        id: l.id,
        name: l.name,
        type: 'infrastructure_layer',
        municipality: l.municipality || 'Province-wide',
        status: 'operational',
        is_layer: true
      }))
  ], [facilities, layers]);

  const isLoading = isLoadingRegistry || isLoadingLayers;

  const createMutation = useMutation({
    mutationFn: async (data) => {
      // Auto-tag before creating if coordinates are present
      let finalData = { ...data };
      if (data.latitude && data.longitude) {
        const exposure = await handleAutoTagging(data.latitude, data.longitude);
        finalData = { ...finalData, ...exposure };
      }

      return cnpdrrmceoc.entities.Facility.create({
        ...finalData,
        latitude: finalData.latitude ? Number(finalData.latitude) : undefined,
        longitude: finalData.longitude ? Number(finalData.longitude) : undefined,
        capacity: finalData.capacity ? Number(finalData.capacity) : undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['facilities-registry'] });
      setOpen(false);
    },
  });

  const importBulkMutation = useMutation({
    mutationFn: (dataArray) => cnpdrrmceoc.entities.Facility.createMany(dataArray),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['facilities-registry'] });
      setOpen(false);
    },
  });

  const deleteManyMutation = useMutation({
    mutationFn: () => {
      // Logic to clear all facilities - in mock mode we just clear the cache
      localStorage.removeItem('pdrrmo_cache_Facility');
      return Promise.resolve();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['facilities-registry'] });
      alert('Registry cleared.');
    },
  });

  const handleBulkImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setImporting(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        let text = (event.target.result || "").trim();
        if (!text) throw new Error("The uploaded file is empty.");

        let rawData;
        try {
          rawData = JSON.parse(text);
        } catch (jsonErr) {
          console.warn("Standard JSON parse failed, attempting cleanup...", jsonErr);

          // REPAIR ENGINE: Automatically fix common manual editing errors
          let cleanedText = text
            .replace(/,\s*([\]}])/g, '$1') // remove trailing commas
            .replace(/'/g, '"')            // convert single quotes
            .replace(/\}\s*\{/g, '}, {')   // add missing commas between objects
            .replace(/\]\s*\[/g, '], [');  // add missing commas between arrays

          // FIX: "operator": "type": "public" -> "operator": "", "type": "public"
          // We look for : followed by a string key and another :
          cleanedText = cleanedText.replace(/:\s*("[^"]*")\s*:/g, ': "", $1:');

          // FIX: Missing commas between adjacent properties: "key": "val" "key2": "val2"
          cleanedText = cleanedText.replace(/("[^"]*"\s*:\s*(?:true|false|null|-?\d+(?:\.\d+)?|"[^"]*"))\s+("[^"]*"\s*:)/g, '$1, $2');

          try {
            rawData = JSON.parse(cleanedText);
            console.log("Auto-repair successful!");
          } catch (retryErr) {
            // Provide exact context of why it still failed after repair
            const match = retryErr.message.match(/at position (\d+)/);
            let context = "";
            if (match) {
              const pos = parseInt(match[1], 10);
              context = `\n\nContext after repair:\n"...${cleanedText.substring(Math.max(0, pos - 40), Math.min(cleanedText.length, pos + 40))}..."`;
            }
            throw new Error(`Parse failed even after repair attempt: ${retryErr.message}${context}`);
          }
        }
        const toImport = [];

        // Normalize different formats (GeoJSON vs OSM JSON)
        let normalizedFeatures = [];

        if (rawData.type === 'FeatureCollection' && rawData.features) {
          // Standard GeoJSON
          normalizedFeatures = rawData.features.map(f => ({
            props: f.properties || {},
            geometry: f.geometry
          }));
        } else if (rawData.elements) {
          // OSM JSON (Overpass API)
          normalizedFeatures = rawData.elements.map(e => {
            let lat = e.lat, lng = e.lon;
            // For ways/polygons, use the center of bounds
            if (e.type === 'way' && e.bounds) {
              lat = (e.bounds.minlat + e.bounds.maxlat) / 2;
              lng = (e.bounds.minlon + e.bounds.maxlon) / 2;
            } else if (e.type === 'way' && e.geometry) {
              lat = e.geometry.reduce((acc, g) => acc + g.lat, 0) / e.geometry.length;
              lng = e.geometry.reduce((acc, g) => acc + g.lon, 0) / e.geometry.length;
            }
            return {
              props: e.tags || {},
              geometry: lat && lng ? { type: 'Point', coordinates: [lng, lat] } : null
            };
          });
        }

        // Pre-load hazard layers for faster bulk intersection
        const hazardGeoJSONs = {};
        const activeHazardLayers = layers.filter(l => l.is_active !== false && ['flood', 'landslide', 'storm_surge'].includes(l.type));
        for (const layer of activeHazardLayers) {
          hazardGeoJSONs[layer.type] = await fetchGeoJSON(layer.file_url);
        }

        for (const feature of normalizedFeatures) {
          const { props, geometry } = feature;
          if (!geometry) continue;

          let lat, lng;
          if (geometry.type === 'Point') {
            [lng, lat] = geometry.coordinates;
          } else if (geometry.type === 'Polygon' || geometry.type === 'MultiPolygon') {
            // Estimate center for polygons
            const coords = geometry.type === 'Polygon' ? geometry.coordinates[0] : geometry.coordinates[0][0];
            lng = coords.reduce((acc, c) => acc + c[0], 0) / coords.length;
            lat = coords.reduce((acc, c) => acc + c[1], 0) / coords.length;
          }

          if (!lat || !lng) continue;

          // Filter for Camarines Norte only (Agency standard check)
          const province = props['addr:province'] || props.province || "";
          const ref = String(props.ref || "");
          const isCamNorte = province.includes('Camarines Norte') || ref.startsWith('05016');

          if (!isCamNorte) continue;

          // Automated exposure tagging using spatial intersection
          const flood_exposure = hazardGeoJSONs.flood ? getSpatialExposure(lat, lng, hazardGeoJSONs.flood) : (props.flood_exposure || 'none');
          const landslide_exposure = hazardGeoJSONs.landslide ? getSpatialExposure(lat, lng, hazardGeoJSONs.landslide) : (props.landslide_exposure || 'none');
          const storm_surge_exposure = hazardGeoJSONs.storm_surge ? getSpatialExposure(lat, lng, hazardGeoJSONs.storm_surge) : (props.storm_surge_exposure || 'none');

          toImport.push({
            name: props.name || props.Name || `Imported ${props.amenity || 'Facility'}`,
            type: props.type || props.amenity || 'other',
            municipality: props.municipality || props['addr:town'] || props['addr:city'] || '',
            barangay: props.barangay || props['addr:village'] || '',
            latitude: Number(lat),
            longitude: Number(lng),
            status: 'operational',
            flood_exposure,
            landslide_exposure,
            storm_surge_exposure,
          });
        }

        if (toImport.length > 0) {
          await importBulkMutation.mutateAsync(toImport);
          alert(`Successfully imported ${toImport.length} facilities with automated hazard tagging.`);
        } else {
          alert("No valid facilities found in file for Camarines Norte.");
        }
      } catch (err) {
        console.error("Import Error:", err);
        const posMatch = err.message.match(/at position (\d+)/);
        let context = "";
        if (posMatch) {
          const pos = parseInt(posMatch[1], 10);
          const text = (reader.result || "");
          const start = Math.max(0, pos - 50);
          const end = Math.min(text.length, pos + 50);
          context = `\n\nContext around error:\n"...${text.substring(start, end)}..."`;
        }
        alert(`JSON Syntax Error: ${err.message}${context}\n\nTip: Check for missing commas between tags.`);
      } finally {
        setImporting(false);
      }
    };
    reader.readAsText(file);
  };

  const filtered = useMemo(() => allFacilities
    .filter(f => filterType === 'all' || f.type === filterType || (f.type === 'infrastructure_layer' && filterType === 'other'))
    .filter(f => filterMunicipality === 'all' || f.municipality === filterMunicipality)
    .filter(f => !search || f.name?.toLowerCase().includes(search.toLowerCase())), [allFacilities, filterType, filterMunicipality, search]);

  const displayed = useMemo(() => filtered.slice(0, displayLimit), [filtered, displayLimit]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Critical Facilities</h1>
          <p className="text-sm text-muted-foreground mt-1">Infrastructure registry & exposure tracking</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={() => { if(confirm('Clear all facilities?')) deleteManyMutation.mutate(); }}
          >
            <Trash2 className="w-4 h-4 mr-2" /> Clear All
          </Button>
          <label className="cursor-pointer">
            <Button variant="outline" disabled={importing} asChild>
              <span>
                {importing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileJson className="w-4 h-4 mr-2" />}
                Bulk Import
              </span>
            </Button>
            <input type="file" accept=".geojson,.json" className="hidden" onChange={handleBulkImport} />
          </label>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="w-4 h-4 mr-2" />Add Facility</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Register Facility</DialogTitle>
              <DialogDescription>
                Register a new critical facility like an evacuation center, hospital, or government building.
              </DialogDescription>
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
        ) : displayed.length === 0 ? (
          <Card className="p-8 text-center col-span-full"><p className="text-sm text-muted-foreground">No facilities found</p></Card>
        ) : (
          displayed.map((f) => (
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

      {filtered.length > displayLimit && (
        <div className="flex justify-center pt-4">
          <Button variant="ghost" size="sm" onClick={() => setDisplayLimit(prev => prev + 50)}>
            Load More ({filtered.length - displayLimit} remaining)
          </Button>
        </div>
      )}
    </div>
  );
}
