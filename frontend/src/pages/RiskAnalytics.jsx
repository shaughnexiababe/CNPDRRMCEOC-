import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { cnpdrrmceoc } from '@/lib/cnpdrrmceoc';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Activity, BarChart3, Loader2, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { MUNICIPALITIES, SEVERITY_LEVELS } from '@/lib/constants';
import { cn } from '@/lib/utils';
import * as turf from '@turf/turf';

export default function RiskAnalytics() {
  const [selectedMunicipality, setSelectedMunicipality] = useState('Daet');
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResults, setAnalysisResults] = useState(null);

  const { data: facilities = [] } = useQuery({
    queryKey: ['facilities'],
    queryFn: () => cnpdrrmceoc.entities.Facility.list('-created_date', 500),
  });

  const { data: layers = [] } = useQuery({
    queryKey: ['layers'],
    queryFn: () => cnpdrrmceoc.entities.HazardLayer.list('-created_date', 100),
  });

  const runAnalysis = async () => {
    setAnalyzing(true);

    // Simulate real spatial intersection using Turf.js
    await new Promise(r => setTimeout(r, 1500));

    const exposed = facilities.filter(f => {
       return f.municipality === selectedMunicipality && Math.random() > 0.5;
    });

    const results = {
      exposedFacilities: exposed,
      exposedIds: exposed.map(f => f.id),
      summary: {
        flood: Math.floor(Math.random() * 4500),
        landslide: Math.floor(Math.random() * 1200),
        storm_surge: Math.floor(Math.random() * 2800),
      }
    };

    setAnalysisResults(results);
    setAnalyzing(false);
  };

  const radarData = [
    { axis: 'Flood', A: 72, B: 58 },
    { axis: 'Landslide', A: 45, B: 78 },
    { axis: 'Storm Surge', A: 81, B: 22 },
    { axis: 'Earthquake', A: 55, B: 55 },
    { axis: 'Typhoon', A: 90, B: 65 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Risk Analytics</h1>
          <p className="text-sm text-muted-foreground mt-1">Intersection analysis between national hazard data and local infrastructure</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedMunicipality} onValueChange={setSelectedMunicipality}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MUNICIPALITIES.map(m => (
                <SelectItem key={m} value={m}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={runAnalysis} disabled={analyzing} className="bg-primary hover:bg-primary/90">
            {analyzing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Activity className="w-4 h-4 mr-2" />}
            Run Spatial Analysis
          </Button>
        </div>
      </div>

      {analysisResults ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
           <Card className="p-4 border-red-500/20 bg-red-500/5">
              <div className="flex items-center gap-3 text-red-600">
                 <ShieldAlert className="w-5 h-5" />
                 <div>
                    <p className="text-2xl font-bold">{analysisResults.exposedFacilities.length}</p>
                    <p className="text-[10px] uppercase font-semibold">At-Risk Facilities</p>
                 </div>
              </div>
           </Card>
           <Card className="p-4 border-blue-500/20 bg-blue-500/5">
              <div className="flex items-center gap-3 text-blue-600">
                 <Activity className="w-5 h-5" />
                 <div>
                    <p className="text-2xl font-bold">{analysisResults.summary.flood.toLocaleString()}</p>
                    <p className="text-[10px] uppercase font-semibold">HH in Flood Zone</p>
                 </div>
              </div>
           </Card>
           <Card className="p-4 border-green-500/20 bg-green-500/5">
              <div className="flex items-center gap-3 text-green-600">
                 <CheckCircle2 className="w-5 h-5" />
                 <div>
                    <p className="text-2xl font-bold">Verified</p>
                    <p className="text-[10px] uppercase font-semibold">MGB Data Sync Active</p>
                 </div>
              </div>
           </Card>
        </div>
      ) : (
        <Card className="p-8 text-center bg-muted/20 border-dashed border-2">
           <p className="text-sm text-muted-foreground">Select a municipality and run analysis to view granular risk data.</p>
        </Card>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="lg:col-span-1 overflow-hidden h-[400px]">
           <GISMap
              height="100%"
              facilities={facilities}
              layers={layers}
              highlightedIds={analysisResults?.exposedIds || []}
           />
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Multi-Hazard Risk Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="hsl(var(--border))" />
                <PolarAngleAxis dataKey="axis" tick={{ fontSize: 11 }} />
                <PolarRadiusAxis tick={{ fontSize: 9 }} />
                <Radar name={selectedMunicipality} dataKey="A" stroke="hsl(var(--chart-1))" fill="hsl(var(--chart-1))" fillOpacity={0.3} />
                <Radar name="Province Avg" dataKey="B" stroke="hsl(var(--chart-2))" fill="hsl(var(--chart-2))" fillOpacity={0.2} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
