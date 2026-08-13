import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cnpdrrmceoc } from '@/lib/cnpdrrmceoc';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter
} from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { AlertTriangle, Clock, MapPin, Users, CheckCircle2, ExternalLink, Radio, Send, Check } from 'lucide-react';
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
  dispatched: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
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
  const [dispatchOpen, setDispatchOpen] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [dispatchData, setDispatchData] = useState({ unitId: '', etaMinutes: 15, notes: '' });

  const { data: alerts = [] } = useQuery({
    queryKey: ['alerts'],
    queryFn: () => cnpdrrmceoc.entities.HazardAlert.list('-created_at', 50),
  });

  const { data: incidents = [] } = useQuery({
    queryKey: ['incidents'],
    queryFn: () => cnpdrrmceoc.entities.Incident.list('-created_at', 50),
  });

  const { data: units = [] } = useQuery({
    queryKey: ['units'],
    queryFn: () => cnpdrrmceoc.entities.Unit.list(),
  });

  const { data: facilities = [] } = useQuery({
    queryKey: ['facilities'],
    queryFn: () => cnpdrrmceoc.entities.Facility.list('-created_at', 200),
  });

  const updateAlertMutation = useMutation({
    mutationFn: ({ id, data }) => cnpdrrmceoc.entities.HazardAlert.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['alerts'] }),
  });

  const updateIncidentMutation = useMutation({
    mutationFn: ({ id, data }) => cnpdrrmceoc.entities.Incident.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['incidents'] }),
  });

  const dispatchMutation = useMutation({
    mutationFn: ({ incidentId, data }) => cnpdrrmceoc.entities.Incident.dispatch(incidentId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      queryClient.invalidateQueries({ queryKey: ['units'] });
      setDispatchOpen(false);
      setSelectedIncident(null);
      setDispatchData({ unitId: '', etaMinutes: 15, notes: '' });
    },
  });

  const activeAlerts = alerts.filter(a => a.status === 'active' || a.status === 'monitoring');
  const activeIncidents = incidents.filter(i => i.status !== 'resolved');
  const availableUnits = units.filter(u => u.status === 'available');
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
            <Clock className="w-5 h-5 text-purple-500" />
            <div>
              <p className="text-2xl font-bold">{availableUnits.length}</p>
              <p className="text-[10px] text-muted-foreground">Available Units</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Map + Live Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <GISMap alerts={activeAlerts} incidents={activeIncidents} height="420px" />
        </div>

        {/* Live Incident Feed */}
        <Card className="max-h-[420px] overflow-hidden flex flex-col">
          <CardHeader className="pb-2 shrink-0">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Radio className="w-4 h-4 text-primary" />
              Live Incident Feed
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-y-auto flex-1 space-y-2 px-3">
            {activeIncidents.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No active incidents</p>
            ) : (
              activeIncidents.map((incident) => (
                <div key={incident.id} className="p-3 rounded-lg border bg-muted/30 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-semibold">{incident.title}</p>
                      <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground mt-0.5">
                        <MapPin className="w-2.5 h-2.5" /> {incident.municipality}
                        {incident.barangay && <span>• {incident.barangay}</span>}
                      </div>
                    </div>
                    <Badge variant="outline" className={cn("text-[8px] h-4 px-1 leading-none uppercase font-bold", incidentStatusColors[incident.status])}>
                      {incident.status}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className={cn("text-[9px] font-bold uppercase", priorityColors[incident.priority])}>
                      {incident.priority} priority
                    </span>

                    <div className="flex items-center gap-1">
                      {incident.status === 'verified' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 text-[9px] px-2 bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
                          onClick={() => {
                            setSelectedIncident(incident);
                            setDispatchOpen(true);
                          }}
                        >
                          <Send className="w-2.5 h-2.5 mr-1" /> Dispatch
                        </Button>
                      )}

                      <Select
                        value={incident.status}
                        onValueChange={(val) => updateIncidentMutation.mutate({ id: incident.id, data: { status: val } })}
                      >
                        <SelectTrigger className="h-6 text-[9px] w-20 px-1.5">
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
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dispatch Dialog */}
      <Dialog open={dispatchOpen} onOpenChange={setDispatchOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Dispatch Response Unit</DialogTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Dispatching to: <strong>{selectedIncident?.title}</strong> in {selectedIncident?.municipality}
            </p>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-xs">Available Units near {selectedIncident?.municipality}</Label>
              {availableUnits.length === 0 ? (
                <div className="p-3 rounded bg-red-50 text-red-800 text-[10px] border border-red-100">
                  Critical: No units are currently available. Check OOS list.
                </div>
              ) : (
                <RadioGroup
                  value={dispatchData.unitId}
                  onValueChange={(val) => setDispatchData({...dispatchData, unitId: val})}
                  className="grid grid-cols-1 gap-2"
                >
                  {availableUnits.map(unit => (
                    <div key={unit.id} className="flex items-center space-x-2 border p-2 rounded hover:bg-muted/50 transition-colors">
                      <RadioGroupItem value={unit.id} id={unit.id} />
                      <Label htmlFor={unit.id} className="flex-1 text-xs cursor-pointer flex justify-between">
                        <span>{unit.call_sign} ({unit.type})</span>
                        <span className="text-muted-foreground italic">Available</span>
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs">ETA (Minutes)</Label>
                <Input
                  type="number"
                  value={dispatchData.etaMinutes}
                  onChange={(e) => setDispatchData({...dispatchData, etaMinutes: parseInt(e.target.value) || 0})}
                  className="h-8 text-xs"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Dispatch Instructions (Optional)</Label>
              <Input
                placeholder="Proceed via Bagasbas Road..."
                value={dispatchData.notes}
                onChange={(e) => setDispatchData({...dispatchData, notes: e.target.value})}
                className="h-8 text-xs"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="secondary" size="sm" onClick={() => setDispatchOpen(false)}>Cancel</Button>
            <Button
              size="sm"
              disabled={dispatchMutation.isPending || !dispatchData.unitId}
              onClick={() => dispatchMutation.mutate({ incidentId: selectedIncident.id, data: dispatchData })}
            >
              {dispatchMutation.isPending ? 'Dispatching...' : 'Confirm Dispatch'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Alert Management */}
      <Card>
        <CardHeader className="pb-3 px-4">
          <CardTitle className="text-sm font-semibold">Live Hazard Alerts</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="space-y-2">
            {alerts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No alerts recorded</p>
            ) : (
              alerts.slice(0, 10).map((alert) => (
                <div key={alert.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/10 hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={cn("w-2 h-2 rounded-full shrink-0", {
                      'bg-green-500': alert.severity === 'low',
                      'bg-yellow-500': alert.severity === 'moderate',
                      'bg-orange-500': alert.severity === 'high',
                      'bg-red-500': alert.severity === 'very_high' || alert.severity === 'critical',
                    })} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-medium truncate">{alert.title}</p>
                        {alert.source_url && (
                          <a href={alert.source_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-0.5 text-[9px]">
                            <ExternalLink className="w-2 h-2" />
                            Source
                          </a>
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        {alert.type} • {alert.affected_municipality || 'Province-wide'}
                        {alert.issued_at && ` • ${moment(alert.issued_at).format('MMM D, HH:mm')}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge className={cn("text-[9px] h-5 leading-none px-1.5 border uppercase font-bold", statusColors[alert.status])}>
                      {alert.status}
                    </Badge>
                    <Select
                      value={alert.status}
                      onValueChange={(val) => updateAlertMutation.mutate({ id: alert.id, data: { status: val } })}
                    >
                      <SelectTrigger className="h-6 text-[9px] w-24 px-1.5">
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
