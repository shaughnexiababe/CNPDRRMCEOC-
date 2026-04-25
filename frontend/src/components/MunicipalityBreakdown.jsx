import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { MUNICIPALITIES } from '@/lib/constants';

// Simulated population data for Camarines Norte municipalities
const municipalityData = [
  { name: "Daet", population: 116786, households: 27568, riskScore: 72 },
  { name: "Labo", population: 92867, households: 20846, riskScore: 58 },
  { name: "Jose Panganiban", population: 55234, households: 12453, riskScore: 65 },
  { name: "Mercedes", population: 45123, households: 10234, riskScore: 81 },
  { name: "Paracale", population: 52341, households: 11876, riskScore: 69 },
  { name: "Vinzons", population: 42156, households: 9534, riskScore: 45 },
  { name: "Basud", population: 38456, households: 8654, riskScore: 52 },
  { name: "Talisay", population: 28345, households: 6432, riskScore: 77 },
  { name: "Capalonga", population: 41234, households: 9342, riskScore: 43 },
  { name: "San Vicente", population: 22345, households: 5023, riskScore: 38 },
  { name: "San Lorenzo Ruiz", population: 18234, households: 4123, riskScore: 35 },
  { name: "Santa Elena", population: 35678, households: 8023, riskScore: 41 },
];

function getRiskColor(score) {
  if (score >= 75) return '#EF4444';
  if (score >= 60) return '#F97316';
  if (score >= 45) return '#F59E0B';
  return '#22C55E';
}

export default function MunicipalityBreakdown() {
  const sorted = [...municipalityData].sort((a, b) => b.riskScore - a.riskScore);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">Municipality Risk Index</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {sorted.map((m) => (
          <div key={m.name} className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium">{m.name}</span>
              <span className="text-[10px] text-muted-foreground">{m.riskScore}/100</span>
            </div>
            <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${m.riskScore}%`, backgroundColor: getRiskColor(m.riskScore) }}
              />
            </div>
            <div className="flex gap-3 text-[10px] text-muted-foreground">
              <span>Pop: {m.population.toLocaleString()}</span>
              <span>HH: {m.households.toLocaleString()}</span>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
