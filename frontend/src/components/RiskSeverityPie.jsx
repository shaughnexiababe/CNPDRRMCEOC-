import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

const severityData = [
  { name: 'Low', value: 42300, color: '#22C55E' },
  { name: 'Moderate', value: 31200, color: '#F59E0B' },
  { name: 'High', value: 18900, color: '#F97316' },
  { name: 'Very High', value: 8400, color: '#EF4444' },
];

export default function RiskSeverityPie() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">Exposed Households by Severity</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={240}>
          <PieChart>
            <Pie
              data={severityData}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={85}
              paddingAngle={3}
              dataKey="value"
            >
              {severityData.map((entry, index) => (
                <Cell key={index} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value) => value.toLocaleString() + ' HH'}
              contentStyle={{
                background: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                fontSize: '12px'
              }}
            />
            <Legend wrapperStyle={{ fontSize: '11px' }} />
          </PieChart>
        </ResponsiveContainer>
        <div className="text-center -mt-2">
          <p className="text-2xl font-bold">{(100800).toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">Total Exposed Households</p>
        </div>
      </CardContent>
    </Card>
  );
}
