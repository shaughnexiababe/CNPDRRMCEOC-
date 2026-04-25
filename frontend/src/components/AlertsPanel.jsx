import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import moment from 'moment';

const severityStyles = {
  low: 'bg-green-500/10 text-green-600 border-green-500/20',
  moderate: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
  high: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
  very_high: 'bg-red-500/10 text-red-600 border-red-500/20',
};

export default function AlertsPanel({ alerts = [], limit = 5 }) {
  const activeAlerts = alerts
    .filter(a => a.status === 'active' || a.status === 'monitoring')
    .slice(0, limit);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-destructive" />
            Active Alerts
          </CardTitle>
          <Badge variant="destructive" className="text-[10px] px-2">
            {activeAlerts.length} Active
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {activeAlerts.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No active alerts</p>
        ) : (
          activeAlerts.map((alert) => (
            <div key={alert.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
              <div className={cn("w-2 h-2 rounded-full mt-1.5 shrink-0", {
                'bg-green-500': alert.severity === 'low',
                'bg-yellow-500': alert.severity === 'moderate',
                'bg-orange-500': alert.severity === 'high',
                'bg-red-500 animate-pulse': alert.severity === 'very_high',
              })} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{alert.title}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge className={cn("text-[10px] border", severityStyles[alert.severity])}>
                    {alert.severity?.replace('_', ' ')}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5" />
                    {alert.issued_at ? moment(alert.issued_at).fromNow() : 'recently'}
                  </span>
                </div>
                {alert.affected_municipality && (
                  <p className="text-[11px] text-muted-foreground mt-1">{alert.affected_municipality}</p>
                )}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
