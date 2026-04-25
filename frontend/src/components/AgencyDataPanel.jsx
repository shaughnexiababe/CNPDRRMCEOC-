import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Cloud, Zap, Globe, Map } from 'lucide-react';

export default function AgencyDataPanel() {
  const feeds = [
    {
      agency: 'DOST-PAGASA',
      title: 'Thunderstorm Advisory #5',
      time: '15 mins ago',
      type: 'Weather',
      status: 'active',
      icon: Cloud
    },
    {
      agency: 'DOST-PHIVOLCS',
      title: 'Earthquake Information #1',
      time: '1 hour ago',
      type: 'Seismic',
      status: 'monitoring',
      icon: Zap
    },
    {
      agency: 'DENR-MGB',
      title: 'Flood Susceptibility Update',
      time: 'Daily Sync',
      type: 'GIS',
      status: 'synced',
      icon: Map
    },
    {
      agency: 'NAMRIA',
      title: 'Topographic Base Map',
      time: 'Static',
      type: 'Base',
      status: 'synced',
      icon: Globe
    }
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          Agency Integration Hub
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {feeds.map((feed, i) => (
          <div key={i} className="flex items-center justify-between p-2 rounded-md border bg-muted/20 text-xs">
            <div className="flex items-center gap-3">
              <div className="p-1.5 rounded-full bg-primary/10">
                <feed.icon className="w-3.5 h-3.5 text-primary" />
              </div>
              <div>
                <p className="font-bold">{feed.agency}</p>
                <p className="text-muted-foreground truncate max-w-[150px]">{feed.title}</p>
              </div>
            </div>
            <div className="text-right">
              <Badge variant="outline" className="text-[9px] h-4">{feed.status}</Badge>
              <p className="text-[9px] text-muted-foreground mt-0.5">{feed.time}</p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
