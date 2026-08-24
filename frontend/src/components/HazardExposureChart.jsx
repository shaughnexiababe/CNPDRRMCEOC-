import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { deriveHazardExposureData } from '@/lib/analytics-engine';

// Derived from the shared PSA 2020 / MGB hazard baseline (was hardcoded)
const exposureData = deriveHazardExposureData();

export default function HazardExposureChart() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">Household Exposure by Hazard Type</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={exposureData} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="municipality"
              tick={{ fontSize: 9 }}
              angle={-45}
              textAnchor="end"
              height={80}
              interval={0}
            />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip
              contentStyle={{
                background: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                fontSize: '12px'
              }}
            />
            <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
            <Bar dataKey="flood" fill="hsl(var(--chart-1))" radius={[2, 2, 0, 0]} name="Flood" />
            <Bar dataKey="landslide" fill="hsl(var(--chart-5))" radius={[2, 2, 0, 0]} name="Landslide" />
            <Bar dataKey="storm_surge" fill="hsl(var(--chart-2))" radius={[2, 2, 0, 0]} name="Storm Surge" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
