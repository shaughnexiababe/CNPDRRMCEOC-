import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { cnpdrrmceoc } from '@/lib/cnpdrrmceoc';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Activity, BarChart3, Loader2, ShieldAlert, CheckCircle2, Users, Map as MapIcon, Package } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, PieChart, Pie, Cell } from 'recharts';
import { MUNICIPALITIES, SEVERITY_LEVELS, MUNICIPALITY_DATA, MUNICIPALITY_COORDINATES, MUNICIPALITY_BBOXES, HAZARD_TYPES } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { fetchGeoJSON, getSpatialExposure, estimateReliefRequirements, generateHazardDensityPoints } from '@/lib/spatial';
import * as turf from '@turf/turf';

export default function RiskAnalytics() {
  const [selectedMunicipality, setSelectedMunicipality] = useState('Whole Province');
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResults, setAnalysisResults] = useState(null);

  // Colors for charts
  const COLORS = ['#3B82F6', '#A855F7', '#06B6D4', '#EF4444', '#F59E0B', '#6366F1', '#22C55E', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316', '#64748B'];

  const { data: facilities = [] } = useQuery({
    queryKey: ['facilities'],
    queryFn: () => cnpdrrmceoc.entities.Facility.list('-created_date', 1000),
  });

  const { data: layers = [] } = useQuery({
    queryKey: ['layers'],
    queryFn: () => cnpdrrmceoc.entities.HazardLayer.list('-created_date', 100),
  });

  const runAnalysis = async () => {
    setAnalyzing(true);

    try {
      // 1. Identify active hazard layers from agencies
      const activeHazardLayers = layers.filter(l =>
        l.is_active !== false &&
        ['flood', 'landslide', 'storm_surge', 'fault_line', 'liquefaction'].includes(l.type)
      );

      if (activeHazardLayers.length === 0) {
        alert("No active hazard layers found. Please upload and activate layers (Flood, Landslide, etc.) in the Data Layers page first.");
        setAnalyzing(false);
        return;
      }

      const layersWithGeoJSON = await Promise.all(activeHazardLayers.map(async (l) => {
        try {
          let finalUrl = l.file_url.trim();

          // Standardize local paths
          if (finalUrl.startsWith('/data/')) {
            finalUrl = window.location.origin + finalUrl;
          }

          // Handle ArcGIS Query logic for live agency URLs
          if (finalUrl.includes('georisk.gov.ph') && !finalUrl.includes('.json')) {
            let baseUrl = finalUrl.split('?')[0].replace(/\/+$/, '');
            if (!baseUrl.endsWith('/query')) {
              baseUrl += '/query';
            }

            const params = new URLSearchParams();
            params.set('f', 'json');
            params.set('outFields', '*');
            params.set('where', "PROVINCE = 'CAMARINES NORTE'");
            params.set('returnGeometry', 'true');
            params.set('outSR', '4326');

            finalUrl = `${baseUrl}?${params.toString()}`;
          }

          let geoJson = null;
          try {
             geoJson = await fetchGeoJSON(finalUrl);
          } catch (e) {
             if (finalUrl.includes('georisk.gov.ph')) {
                console.warn(`Province query failed for ${l.name}, trying spatial BBOX fallback...`, e.message);
                const baseUrl = finalUrl.split('?')[0];
                const fallbackUrl = `${baseUrl}?f=json&outFields=*&geometry=122.3,13.8,123.1,14.5&geometryType=esriGeometryEnvelope&spatialRel=esriSpatialRelIntersects&inSR=4326&outSR=4326`;
                geoJson = await fetchGeoJSON(fallbackUrl);
             } else {
                throw new Error(`Could not load local file: ${l.name}. Please ensure the data file exists in public/data/hazards/`);
             }
          }

          if (!geoJson || (!geoJson.features && !geoJson.elements)) {
            throw new Error("Invalid format received from agency server.");
          }
          return { ...l, geoJson };
        } catch (e) {
          console.warn(`Layer Load Error (${l.name}):`, e.message);
          return { error: e.message, name: l.name };
        }
      }));

      const validLayers = layersWithGeoJSON.filter(l => !l.error);
      const failedLayers = layersWithGeoJSON.filter(l => l.error);

      if (validLayers.length === 0) {
        const errorList = failedLayers.map(f => `• ${f.name}: ${f.error}`).join('\n');
        alert(`Could not load hazard data from agency servers:\n\n${errorList}\n\nTip: Copy the URL directly into a new tab. If it works there but not here, the agency server may be blocking the application (CORS).`);
        setAnalyzing(false);
        return;
      }

      // 2. Population & Exposure Analysis
      const targetMunicipalities = selectedMunicipality === 'Whole Province'
        ? MUNICIPALITIES
        : [selectedMunicipality];

      let allAnalyzedFacilities = [];
      let allExposedFacilities = [];
      let totalProvincialPopulation = 0;
      let provincialExposedHH = { flood: 0, landslide: 0, storm_surge: 0 };
      let muniBreakdown = [];

      const getRatingMultiplier = (r) => ({ 'very_high': 0.45, 'high': 0.30, 'medium': 0.15, 'low': 0.05, 'none': 0 }[r] || 0);

      targetMunicipalities.forEach(muniName => {
        const muniStats = MUNICIPALITY_DATA[muniName];
        if (!muniStats) return;

        totalProvincialPopulation += muniStats.population;

        // Intersection with Critical Infrastructure Registry for this municipality
        const muniFacilities = facilities.filter(f => f.municipality === muniName);
        const analyzedMuniFacilities = muniFacilities.map(f => {
          const exposures = {};
          validLayers.forEach(layer => {
            exposures[`${layer.type}_exposure`] = getSpatialExposure(f.latitude, f.longitude, layer.geoJson);
          });
          return { ...f, exposures };
        });

        allAnalyzedFacilities.push(...analyzedMuniFacilities);
        const exposedMuniCount = analyzedMuniFacilities.filter(f =>
          Object.values(f.exposures).some(exp => exp !== 'none' && exp !== 'low')
        );
        allExposedFacilities.push(...exposedMuniCount);

        // Demographic Exposure
        const muniExposedHH = {
          flood: Math.round(muniStats.population / 4.5 * getRatingMultiplier(muniStats.hazards.flood)),
          landslide: Math.round(muniStats.population / 4.5 * getRatingMultiplier(muniStats.hazards.landslide)),
          storm_surge: Math.round(muniStats.population / 4.5 * getRatingMultiplier(muniStats.hazards.storm_surge)),
        };

        const totalMuniExposed = Object.values(muniExposedHH).reduce((a, b) => a + b, 0);

        provincialExposedHH.flood += muniExposedHH.flood;
        provincialExposedHH.landslide += muniExposedHH.landslide;
        provincialExposedHH.storm_surge += muniExposedHH.storm_surge;

        muniBreakdown.push({
          name: muniName,
          exposedHH: totalMuniExposed,
          exposedInfrastructure: exposedMuniCount.length,
          population: muniStats.population
        });
      });

      const totalExposedHH = Object.values(provincialExposedHH).reduce((a, b) => a + b, 0);

      setAnalysisResults({
        exposedFacilities: allExposedFacilities,
        analyzedFacilities: allAnalyzedFacilities,
        exposedIds: allExposedFacilities.map(f => f.id),
        hhExposure: provincialExposedHH,
        population: totalProvincialPopulation,
        hazards: selectedMunicipality === 'Whole Province' ? { flood: 'high', landslide: 'high', storm_surge: 'high' } : MUNICIPALITY_DATA[selectedMunicipality].hazards,
        muniBreakdown: muniBreakdown.sort((a, b) => b.exposedHH - a.exposedHH),
        relief: estimateReliefRequirements(totalExposedHH),
      });
    } catch (error) {
      console.error("Spatial analysis failed", error);
    } finally {
      setAnalyzing(false);
    }
  };

  const radarData = useMemo(() => {
    const stats = analysisResults?.hazards || (selectedMunicipality === 'Whole Province'
      ? { flood: 'high', landslide: 'high', storm_surge: 'high', tsunami: 'medium' }
      : MUNICIPALITY_DATA[selectedMunicipality]?.hazards || { flood: 'none', landslide: 'none', storm_surge: 'none', tsunami: 'none' });

    const mapLevel = (l) => ({ 'very_high': 95, 'high': 75, 'medium': 50, 'low': 25, 'none': 5 }[l] || 10);

    return [
      { axis: 'Flood', A: mapLevel(stats.flood), B: 60 },
      { axis: 'Landslide', A: mapLevel(stats.landslide), B: 45 },
      { axis: 'Storm Surge', A: mapLevel(stats.storm_surge), B: 30 },
      { axis: 'Tsunami', A: mapLevel(stats.tsunami), B: 40 },
      { axis: 'Earthquake', A: 55, B: 55 },
    ];
  }, [selectedMunicipality, analysisResults]);

  const chartData = analysisResults ? [
    { name: 'Flood', count: analysisResults.hhExposure.flood },
    { name: 'Landslide', count: analysisResults.hhExposure.landslide },
    { name: 'Storm Surge', count: analysisResults.hhExposure.storm_surge },
  ] : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Risk & Anticipatory Analytics</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Spatial intersection of Critical Infrastructure with DENR-MGB and DOST-PHIVOLCS hazard layers
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedMunicipality} onValueChange={setSelectedMunicipality}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Whole Province">Whole Province</SelectItem>
              {MUNICIPALITIES.map(m => (
                <SelectItem key={m} value={m}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={runAnalysis} disabled={analyzing} className="bg-primary hover:bg-primary/90">
            {analyzing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Activity className="w-4 h-4 mr-2" />}
            Run Agency-Based Analysis
          </Button>
        </div>
      </div>

      {analysisResults ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
           <Card className="p-4 border-red-500/20 bg-red-500/5">
              <div className="flex items-center gap-3 text-red-600">
                 <ShieldAlert className="w-5 h-5" />
                 <div>
                    <p className="text-2xl font-bold">{analysisResults.exposedFacilities.length}</p>
                    <p className="text-[10px] uppercase font-semibold">Exposed Infrastructure</p>
                 </div>
              </div>
           </Card>
           <Card className="p-4 border-blue-500/20 bg-blue-500/5">
              <div className="flex items-center gap-3 text-blue-600">
                 <Users className="w-5 h-5" />
                 <div>
                    <p className="text-2xl font-bold">{analysisResults.population.toLocaleString()}</p>
                    <p className="text-[10px] uppercase font-semibold">Total Population (PSA)</p>
                 </div>
              </div>
           </Card>
           <Card className="p-4 border-orange-500/20 bg-orange-500/5">
              <div className="flex items-center gap-3 text-orange-600">
                 <BarChart3 className="w-5 h-5" />
                 <div>
                    <p className="text-2xl font-bold">{Object.values(analysisResults.hhExposure).reduce((a,b)=>a+b, 0).toLocaleString()}</p>
                    <p className="text-[10px] uppercase font-semibold">Est. Households Exposed</p>
                 </div>
              </div>
           </Card>
           <Card className="p-4 border-green-500/20 bg-green-500/5">
              <div className="flex items-center gap-3 text-green-600">
                 <CheckCircle2 className="w-5 h-5" />
                 <div>
                    <p className="text-2xl font-bold">MGB/PSA</p>
                    <p className="text-[10px] uppercase font-semibold">Agency Data Validated</p>
                 </div>
              </div>
           </Card>
        </div>
      ) : (
        <Card className="p-8 text-center bg-muted/20 border-dashed border-2">
           <p className="text-sm text-muted-foreground text-center flex flex-col items-center gap-2">
             <MapIcon className="w-8 h-8 opacity-20" />
             Select a municipality to analyze intersection between agency layers and local registry.
           </p>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 h-[500px]">
           <CardHeader className="pb-2">
             <CardTitle className="text-sm font-bold flex items-center gap-2">
               <Activity className="w-4 h-4 text-primary" />
               {selectedMunicipality === 'Whole Province' ? 'Exposed Households by Municipality' : `Comparative Risk Metrics: ${selectedMunicipality}`}
             </CardTitle>
           </CardHeader>
           <CardContent className="h-[430px]">
             {analysisResults ? (
               <div className="h-full flex flex-col">
                 <div className="flex-1 min-h-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={analysisResults.muniBreakdown} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="hsl(var(--border))" />
                        <XAxis type="number" hide />
                        <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 10 }} />
                        <Tooltip
                          cursor={{fill: 'hsl(var(--muted)/0.2)'}}
                          contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', fontSize: '11px' }}
                        />
                        <Bar dataKey="exposedHH" name="Exposed Households" fill="hsl(var(--chart-1))" radius={[0, 4, 4, 0]} barSize={20} />
                      </BarChart>
                    </ResponsiveContainer>
                 </div>
                 <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t">
                    <div className="text-center">
                       <p className="text-xs text-muted-foreground uppercase font-semibold">Max Risk Town</p>
                       <p className="font-bold text-sm text-red-600">{analysisResults.muniBreakdown[0]?.name}</p>
                    </div>
                    <div className="text-center">
                       <p className="text-xs text-muted-foreground uppercase font-semibold">Min Risk Town</p>
                       <p className="font-bold text-sm text-green-600">{analysisResults.muniBreakdown[analysisResults.muniBreakdown.length-1]?.name}</p>
                    </div>
                    <div className="text-center">
                       <p className="text-xs text-muted-foreground uppercase font-semibold">Infrastructure Load</p>
                       <p className="font-bold text-sm">{analysisResults.exposedFacilities.length} Priority Units</p>
                    </div>
                 </div>
               </div>
             ) : (
               <div className="h-full flex flex-col items-center justify-center text-muted-foreground italic text-xs gap-3">
                 <BarChart3 className="w-12 h-12 opacity-10" />
                 Run analysis to view provincial exposure distributions.
               </div>
             )}
           </CardContent>
        </Card>

        <div className="space-y-4">
          {analysisResults && (
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-bold text-primary flex items-center gap-2 uppercase">
                  <Package className="w-3 h-3" /> Logistics & Relief
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span>Family Food Packs:</span>
                  <span className="font-bold">{analysisResults.relief.foodPacks.toLocaleString()} units</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span>Potable Water (3 days):</span>
                  <span className="font-bold">{analysisResults.relief.waterLiters.toLocaleString()} Liters</span>
                </div>
                <div className="flex justify-between text-xs border-t pt-1">
                  <span>Estimated LGU Fund:</span>
                  <span className="font-bold text-primary">₱ {analysisResults.relief.estimatedCost.toLocaleString()}</span>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="h-[330px]">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Priority Infrastructure at Risk</CardTitle>
            </CardHeader>
            <CardContent className="overflow-y-auto h-[260px] custom-scrollbar">
              {analysisResults?.exposedFacilities.length > 0 ? (
                <div className="space-y-2">
                  {analysisResults.exposedFacilities
                    .sort((a, b) => (b.capacity || 0) - (a.capacity || 0))
                    .map(f => (
                      <div key={f.id} className="p-2 rounded border bg-card text-[10px] flex justify-between items-center">
                        <div className="min-w-0">
                          <p className="font-bold truncate">{f.name}</p>
                          <p className="text-muted-foreground uppercase">{f.type?.replace('_', ' ')}</p>
                        </div>
                        <Badge variant="destructive" className="text-[8px] h-4">PRIORITY</Badge>
                      </div>
                    ))
                  }
                </div>
              ) : (
                <p className="text-xs text-muted-foreground text-center pt-8">No critical facilities analyzed yet.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Exposed Households by Hazard</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', fontSize: '11px' }}
                />
                <Bar dataKey="count" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Agency Multi-Hazard Risk Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="hsl(var(--border))" />
                <PolarAngleAxis dataKey="axis" tick={{ fontSize: 10 }} />
                <Radar name={selectedMunicipality} dataKey="A" stroke="hsl(var(--chart-1))" fill="hsl(var(--chart-1))" fillOpacity={0.4} />
                <Radar name="Provincial Avg" dataKey="B" stroke="hsl(var(--chart-2))" fill="hsl(var(--chart-2))" fillOpacity={0.1} />
                <Legend wrapperStyle={{ fontSize: '10px' }} />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Relative Exposure Mix</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="count"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend layout="vertical" align="right" verticalAlign="middle" wrapperStyle={{ fontSize: '10px' }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
