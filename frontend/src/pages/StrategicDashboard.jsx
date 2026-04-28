import React, { useMemo, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { cnpdrrmceoc } from '@/lib/cnpdrrmceoc';
import {
  AlertTriangle, Users, Building2, MapPin,
  Shield, Activity, TrendingUp
} from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";
import { subscribeToRealtimeIncidents } from '@/lib/firebase';
import StatCard from '@/components/StatCard';
import AlertsPanel from '@/components/AlertsPanel';
import MunicipalityBreakdown from '@/components/MunicipalityBreakdown';
import HazardExposureChart from '@/components/HazardExposureChart';
import RiskSeverityPie from '@/components/RiskSeverityPie';
import GISMap from '@/components/GISMap';
import AssessmentsPanel from '@/components/AssessmentsPanel';
import AgencyDataPanel from '@/components/AgencyDataPanel';

export default function StrategicDashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: alerts = [] } = useQuery({
    queryKey: ['alerts'],
    queryFn: () => cnpdrrmceoc.entities.HazardAlert.list('-created_date', 50),
  });

  const { data: facilities = [] } = useQuery({
    queryKey: ['facilities'],
    queryFn: () => cnpdrrmceoc.entities.Facility.list('-created_date', 200),
  });

  const { data: incidents = [] } = useQuery({
    queryKey: ['incidents'],
    queryFn: () => cnpdrrmceoc.entities.IncidentReport.list('-created_date', 50),
  });

  const { data: layers = [] } = useQuery({
    queryKey: ['layers'],
    queryFn: () => cnpdrrmceoc.entities.HazardLayer.list('-created_date', 100),
  });

  // Setup real-time Firestore listener for new incidents
  useEffect(() => {
    const unsubscribe = subscribeToRealtimeIncidents((newIncident) => {
      // Show pop-up notification
      toast({
        title: "NEW INCIDENT REPORTED",
        description: `${newIncident.type.toUpperCase()}: ${newIncident.title} in ${newIncident.municipality}`,
        variant: "destructive",
        duration: 10000, // Show for 10 seconds
      });

      // Invalidate tanstack query to refresh the list and map
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
    });

    return () => unsubscribe();
  }, [toast, queryClient]);

  const activeAlerts = useMemo(() => alerts.filter(a => a.status === 'active' || a.status === 'monitoring'), [alerts]);
  const activeIncidents = useMemo(() => incidents.filter(i => i.status !== 'resolved'), [incidents]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Strategic Overview</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Province of Camarines Norte — PDRRMO Decision Support System
        </p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Active Alerts"
          value={activeAlerts.length}
          icon={AlertTriangle}
          subtitle="Across all municipalities"
          trend={activeAlerts.length > 3 ? 'up' : 'down'}
          trendValue={activeAlerts.length > 3 ? 'Elevated risk' : 'Normal levels'}
        />
        <StatCard
          title="Total Facilities"
          value={facilities.length}
          icon={Building2}
          subtitle="Mapped & monitored"
        />
        <StatCard
          title="Active Incidents"
          value={activeIncidents.length}
          icon={Activity}
          subtitle="Requiring response"
        />
        <StatCard
          title="Municipalities"
          value="12"
          icon={MapPin}
          subtitle="Under monitoring"
        />
      </div>

      {/* Map + Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <GISMap
            facilities={facilities}
            alerts={alerts}
            incidents={incidents}
            layers={layers}
            height="400px"
          />
        </div>
        <AlertsPanel alerts={alerts} limit={6} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <HazardExposureChart />
        </div>
        <RiskSeverityPie />
      </div>

      {/* Municipality breakdown + Assessments Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-1">
          <AgencyDataPanel />
        </div>
        <div className="lg:col-span-1">
          <MunicipalityBreakdown />
        </div>
        <div className="lg:col-span-1">
          <AssessmentsPanel />
        </div>
      </div>
    </div>
  );
}
