import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { cnpdrrmceoc } from '@/lib/cnpdrrmceoc';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Activity, BarChart3, Loader2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { MUNICIPALITIES, SEVERITY_LEVELS } from '@/lib/constants';
import { cn } from '@/lib/utils';

const intersectionData = {
  "Daet": { flood: { low: 1200, moderate: 2100, high: 890, very_high: 330 }, landslide: { low: 340, moderate: 310, high: 180, very_high: 60 }, storm_surge: { low: 890, moderate: 780, high: 450, very_high: 220 } },
  "Mercedes": { flood: { low: 980, moderate: 1400, high: 560, very_high: 270 }, landslide: { low: 80, moderate: 90, high: 40, very_high: 20 }, storm_surge: { low: 1200, moderate: 1800, high: 1100, very_high: 460 } },
  "Talisay": { flood: { low: 760, moderate: 1200, high: 630, very_high: 300 }, landslide: { low: 450, moderate: 430, high: 230, very_high: 120 }, storm_surge: { low: 560, moderate: 720, high: 400, very_high: 210 } },
  "Labo": { flood: { low: 540, moderate: 620, high: 280, very_high: 120 }, landslide: { low: 780, moderate: 860, high: 480, very_high: 220 }, storm_surge: { low: 30, moderate: 50, high: 30, very_high: 10 } },
};

const facilityExposureData = [
  { type: 'Hospitals', none: 8, low: 3, moderate: 2, high: 1, very_high: 0 },
  { type: 'Schools', none: 45, low: 22, moderate: 15, high: 8, very_high: 3 },
  { type: 'Evac Centers', none: 12, low: 8, moderate: 5, high: 2, very_high: 1 },
  { type: 'Bridges', none: 6, low: 4, moderate: 5, high: 3, very_high: 1 },
  { type: 'Gov Buildings', none: 18, low: 6, moderate: 3, high: 1, very_high: 0 },
];

const radarData = [
  { axis: 'Flood', A: 72, B: 58 },
  { axis: 'Landslide', A: 45, B: 78 },
  { axis: 'Storm Surge', A: 81, B: 22 },
  { axis: 'Earthquake', A: 55, B: 55 },
  { axis: 'Typhoon', A: 90, B: 65 },
];

export default function RiskAnalytics() {
  const [selectedMunicipality, setSelectedMunicipality] = useState('Daet');
  const [analyzing, setAnalyzing] = useState(false);

  const { data: facilities = [] } = useQuery({
    queryKey: ['facilities'],
    queryFn: () => cnpdrrmceoc.entities.Facility.list('-created_date', 500),
  });

  const currentData = intersectionData[selectedMunicipality] || intersectionData['Daet'];

  const barData = Object.entries(currentData).map(([hazard, levels]) => ({
    hazard: hazard.charAt(0).toUpperCase() + hazard.slice(1).replace('_', ' '),
    ...levels,
  }));

  const totalExposed = Object.values(currentData).reduce((sum, hazard) =>
    sum + Object.values(hazard).reduce((s, v) => s + v, 0), 0
  );

  const runAnalysis = async () => {
    setAnalyzing(true);
    await new Promise(r => setTimeout(r, 2000));
    setAnalyzing(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Risk Analytics</h1>
          <p className="text-sm text-muted-foreground mt-1">Intersection analysis & exposure assessment</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedMunicipality} onValueChange={setSelectedMunicipality}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.keys(intersectionData).map(m => (
                <SelectItem key={m} value={m}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={runAnalysis} disabled={analyzing}>
            {analyzing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Activity className="w-4 h-4 mr-2" />}
            Run Analysis
          </Button>
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {SEVERITY_LEVELS.map((level) => {
          const count = Object.values(currentData).reduce((sum, hazard) => sum + (hazard[level.value] || 0), 0);
          return (
            <Card key={level.value} className="p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">{level.label} Exposure</p>
              <p className="text-2xl font-bold mt-1" style={{ color: level.color }}>{count.toLocaleString()}</p>
              <p className="text-[10px] text-muted-foreground">households in {selectedMunicipality}</p>
            </Card>
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">
              Household Exposure — {selectedMunicipality}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={barData} margin={{ left: -15 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="hazard" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Bar dataKey="low" fill="#22C55E" radius={[2, 2, 0, 0]} name="Low" stackId="a" />
                <Bar dataKey="moderate" fill="#F59E0B" radius={[0, 0, 0, 0]} name="Moderate" stackId="a" />
                <Bar dataKey="high" fill="#F97316" radius={[0, 0, 0, 0]} name="High" stackId="a" />
                <Bar dataKey="very_high" fill="#EF4444" radius={[2, 2, 0, 0]} name="Very High" stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
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

      {/* Facility Exposure Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Critical Facility Exposure Matrix</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-3 text-xs font-semibold text-muted-foreground">Facility Type</th>
                  <th className="text-center py-2 px-3 text-xs font-semibold text-muted-foreground">None</th>
                  {SEVERITY_LEVELS.map(l => (
                    <th key={l.value} className="text-center py-2 px-3 text-xs font-semibold" style={{ color: l.color }}>
                      {l.label}
                    </th>
                  ))}
                  <th className="text-center py-2 px-3 text-xs font-semibold text-muted-foreground">Total</th>
                </tr>
              </thead>
              <tbody>
                {facilityExposureData.map((row) => (
                  <tr key={row.type} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="py-2.5 px-3 font-medium text-xs">{row.type}</td>
                    <td className="text-center py-2.5 px-3 text-xs">{row.none}</td>
                    <td className="text-center py-2.5 px-3 text-xs">{row.low}</td>
                    <td className="text-center py-2.5 px-3 text-xs">{row.moderate}</td>
                    <td className="text-center py-2.5 px-3">
                      <Badge variant="outline" className={cn("text-[10px]", row.high > 0 && "border-orange-500/30 text-orange-600 bg-orange-500/5")}>
                        {row.high}
                      </Badge>
                    </td>
                    <td className="text-center py-2.5 px-3">
                      <Badge variant="outline" className={cn("text-[10px]", row.very_high > 0 && "border-red-500/30 text-red-600 bg-red-500/5")}>
                        {row.very_high}
                      </Badge>
                    </td>
                    <td className="text-center py-2.5 px-3 text-xs font-semibold">
                      {row.none + row.low + row.moderate + row.high + row.very_high}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
