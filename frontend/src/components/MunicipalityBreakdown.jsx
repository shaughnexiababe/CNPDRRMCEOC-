import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { deriveMunicipalityStats } from '@/lib/analytics-engine';

/**
 * Municipality Risk Index — derived from the shared PSA 2020 / hazard
 * baseline in lib/constants.js via lib/analytics-engine.js. This replaces
 * the previously hardcoded (and mutually inconsistent) demo numbers:
 * the dashboard, the analytics page and the Android app now all read from
 * the same baseline.
 */
const municipalityRows = deriveMunicipalityStats();

function getRiskColor(score) {
  if (score >= 75) return '#EF4444';
  if (score >= 60) return '#F97316';
  if (score >= 45) return '#F59E0B';
  return '#22C55E';
}

export default function MunicipalityBreakdown() {
  const sorted = [...municipalityRows].sort((a, b) => b.riskScore - a.riskScore);

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
