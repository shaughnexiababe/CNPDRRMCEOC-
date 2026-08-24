import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { deriveSeverityDistribution } from '@/lib/analytics-engine';

// Derived from the shared PSA/hazard baseline (was hardcoded demo data)
const severityData = deriveSeverityDistribution();

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
