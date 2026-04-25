import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const exposureData = [
  { municipality: 'Daet', flood: 15420, landslide: 450, storm_surge: 8340 },
  { municipality: 'Labo', flood: 8560, landslide: 12340, storm_surge: 0 },
  { municipality: 'Jose Panganiban', flood: 5100, landslide: 4560, storm_surge: 3200 },
  { municipality: 'Paracale', flood: 4450, landslide: 5340, storm_surge: 4100 },
  { municipality: 'Mercedes', flood: 6210, landslide: 230, storm_surge: 9560 },
  { municipality: 'Vinzons', flood: 5340, landslide: 1450, storm_surge: 6890 },
  { municipality: 'Basud', flood: 3890, landslide: 4120, storm_surge: 1340 },
  { municipality: 'Capalonga', flood: 2560, landslide: 4340, storm_surge: 5120 },
  { municipality: 'Santa Elena', flood: 4100, landslide: 2560, storm_surge: 3200 },
  { municipality: 'Talisay', flood: 3890, landslide: 1230, storm_surge: 2890 },
  { municipality: 'San Lorenzo Ruiz', flood: 1100, landslide: 6230, storm_surge: 0 },
  { municipality: 'San Vicente', flood: 1200, landslide: 3230, storm_surge: 0 },
];

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
