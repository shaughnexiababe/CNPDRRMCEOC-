import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cnpdrrmceoc } from '@/lib/cnpdrrmceoc';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Radio, AlertTriangle, Clock, MapPin, Users, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import moment from 'moment';
import GISMap from '@/components/GISMap';

const statusColors = {
  active: 'bg-red-500/10 text-red-600 border-red-500/20',
  monitoring: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
  resolved: 'bg-green-500/10 text-green-600 border-green-500/20',
  expired: 'bg-gray-500/10 text-gray-600 border-gray-500/20',
};

const incidentStatusColors = {
  reported: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  verified: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
  responding: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
  resolved: 'bg-green-500/10 text-green-600 border-green-500/20',
};

const priorityColors = {
  low: 'text-green-600',
  medium: 'text-yellow-600',
  high: 'text-orange-600',
  critical: 'text-red-600',
};

export default function OperationsCenter() {
  const queryClient = useQueryClient();

  const { data: alerts = [] } = useQuery({
    queryKey: ['alerts'],
    queryFn: () => cnpdrrmceoc.entities.HazardAlert.list('-created_date', 50),
  });

  const { data: incidents = [] } = useQuery({
    queryKey: ['incidents'],
    queryFn: () => cnpdrrmceoc.entities.IncidentReport.list('-created_date', 50),
  });

  const { data: facilities = [] } = useQuery({
    queryKey: ['facilities'],
    queryFn: () => cnpdrrmceoc.entities.Facility.list('-created_date', 200),
  });

  const { data: layers = [] } = useQuery({
    queryKey: ['layers'],
    queryFn: () => cnpdrrmceoc.entities.HazardLayer.list('-created_date', 100),
  });

  const updateAlertMutation = useMutation({
    mutationFn: ({ id, data }) => cnpdrrmceoc.entities.HazardAlert.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['alerts'] }),
  });

  const updateIncidentMutation = useMutation({
    mutationFn: ({ id, data }) => cnpdrrmceoc.entities.IncidentReport.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['incidents'] }),
  });

  const activeAlerts = alerts.filter(a => a.status === 'active' || a.status === 'monitoring');
  const activeIncidents = incidents.filter(i => i.status !== 'resolved');
  const evacCenters = facilities.filter(f => f.type === 'evacuation_center');

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Operations Center</h1>
          <p className="text-sm text-muted-foreground">Real-time monitoring & response management</p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            <div>
              <p className="text-2xl font-bold">{activeAlerts.length}</p>
              <p className="text-[10px] text-muted-foreground">Active Alerts</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <Radio className="w-5 h-5 text-primary" />
            <div>
              <p className="text-2xl font-bold">{activeIncidents.length}</p>
              <p className="text-[10px] text-muted-foreground">Active Incidents</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-accent" />
            <div>
              <p className="text-2xl font-bold">
                {evacCenters.reduce((sum, e) => sum + (e.current_occupancy || 0), 0).toLocaleString()}
              </p>
              <p className="text-[10px] text-muted-foreground">In Evacuation</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-500" />
            <div>
              <p className="text-2xl font-bold">{evacCenters.length}</p>
              <p className="text-[10px] text-muted-foreground">Evac Centers</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Map + Live Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <GISMap facilities={facilities} alerts={alerts} incidents={incidents} layers={layers} height="380px" />
        </div>

        {/* Live Incident Feed */}
        <Card className="max-h-[380px] overflow-hidden flex flex-col">
          <CardHeader className="pb-2 shrink-0">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Radio className="w-4 h-4 text-primary" />
              Live Incident Feed
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-y-auto flex-1 space-y-2">
            {activeIncidents.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No active incidents</p>
            ) : (
              activeIncidents.map((incident) => (
                <div key={incident.id} className="p-3 rounded-lg bg-muted/50 space-y-2">
                  <div className="flex items-start justify-between">
                    <p className="text-xs font-semibold">{incident.title}</p>
                    <Badge className={cn("text-[9px] border", incidentStatusColors[incident.status])}>
                      {incident.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    <MapPin className="w-3 h-3" /> {incident.municipality}
                    {incident.barangay && <span>• {incident.barangay}</span>}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={cn("text-[10px] font-medium", priorityColors[incident.priority])}>
                      {incident.priority} priority
                    </span>
                    <Select
                      value={incident.status}
                      onValueChange={(val) => updateIncidentMutation.mutate({ id: incident.id, data: { status: val } })}
                    >
                      <SelectTrigger className="h-6 text-[10px] w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="reported">Reported</SelectItem>
                        <SelectItem value="verified">Verified</SelectItem>
                        <SelectItem value="responding">Responding</SelectItem>
                        <SelectItem value="resolved">Resolved</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Alert Management */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Alert Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {alerts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No alerts</p>
            ) : (
              alerts.slice(0, 10).map((alert) => (
                <div key={alert.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={cn("w-2 h-2 rounded-full shrink-0", {
                      'bg-green-500': alert.severity === 'low',
                      'bg-yellow-500': alert.severity === 'moderate',
                      'bg-orange-500': alert.severity === 'high',
                      'bg-red-500': alert.severity === 'very_high',
                    })} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{alert.title}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {alert.type} • {alert.affected_municipality || 'Province-wide'}
                        {alert.issued_at && ` • ${moment(alert.issued_at).format('MMM D, HH:mm')}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge className={cn("text-[10px] border", statusColors[alert.status])}>
                      {alert.status}
                    </Badge>
                    <Select
                      value={alert.status}
                      onValueChange={(val) => updateAlertMutation.mutate({ id: alert.id, data: { status: val } })}
                    >
                      <SelectTrigger className="h-7 text-[10px] w-28">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="monitoring">Monitoring</SelectItem>
                        <SelectItem value="resolved">Resolved</SelectItem>
                        <SelectItem value="expired">Expired</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
