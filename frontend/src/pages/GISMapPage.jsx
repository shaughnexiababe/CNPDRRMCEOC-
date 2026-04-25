import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { cnpdrrmceoc } from '@/lib/cnpdrrmceoc';
import GISMap from '@/components/GISMap';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Layers, Filter, MapPin } from 'lucide-react';
import { MUNICIPALITIES, FACILITY_TYPES, MUNICIPALITY_COORDINATES, BARANGAYS_BY_MUNICIPALITY } from '@/lib/constants';

export default function GISMapPage() {
  const [selectedMunicipality, setSelectedMunicipality] = useState('all');
  const [selectedBarangay, setSelectedBarangay] = useState('all');
  const [flyTo, setFlyTo] = useState(null);
  const [flyToZoom, setFlyToZoom] = useState(13);
  const [showFacilities, setShowFacilities] = useState(true);
  const [showAlerts, setShowAlerts] = useState(true);
  const [showIncidents, setShowIncidents] = useState(true);

  const availableBarangays = selectedMunicipality !== 'all'
    ? (BARANGAYS_BY_MUNICIPALITY[selectedMunicipality] || [])
    : [];

  const handleMunicipalityChange = (value) => {
    setSelectedMunicipality(value);
    setSelectedBarangay('all');
    if (value !== 'all' && MUNICIPALITY_COORDINATES[value]) {
      setFlyTo(MUNICIPALITY_COORDINATES[value]);
      setFlyToZoom(13);
    } else {
      setFlyTo([14.1389, 122.7631]);
      setFlyToZoom(11);
    }
  };

  const { data: facilities = [] } = useQuery({
    queryKey: ['facilities'],
    queryFn: () => cnpdrrmceoc.entities.Facility.list('-created_date', 500),
  });

  const { data: alerts = [] } = useQuery({
    queryKey: ['alerts'],
    queryFn: () => cnpdrrmceoc.entities.HazardAlert.list('-created_date', 100),
  });

  const { data: incidents = [] } = useQuery({
    queryKey: ['incidents'],
    queryFn: () => cnpdrrmceoc.entities.IncidentReport.list('-created_date', 100),
  });

  const { data: layers = [] } = useQuery({
    queryKey: ['layers'],
    queryFn: () => cnpdrrmceoc.entities.HazardLayer.list('-created_date', 100),
  });

  const filteredFacilities = facilities.filter(f => {
    if (selectedMunicipality !== 'all' && f.municipality !== selectedMunicipality) return false;
    if (selectedBarangay !== 'all' && f.barangay !== selectedBarangay) return false;
    return true;
  });

  const filteredAlerts = selectedMunicipality === 'all'
    ? alerts
    : alerts.filter(a => a.affected_municipality === selectedMunicipality);

  const filteredIncidents = incidents.filter(i => {
    if (selectedMunicipality !== 'all' && i.municipality !== selectedMunicipality) return false;
    if (selectedBarangay !== 'all' && i.barangay !== selectedBarangay) return false;
    return true;
  });

  const facilityTypeCounts = {};
  filteredFacilities.forEach(f => {
    facilityTypeCounts[f.type] = (facilityTypeCounts[f.type] || 0) + 1;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">GIS Map View</h1>
          <p className="text-sm text-muted-foreground mt-1">Multi-layered geospatial visualization</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Sidebar Controls */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Filter className="w-4 h-4" />
              Map Controls
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div>
                <Label className="text-xs font-medium">Municipality</Label>
                <Select value={selectedMunicipality} onValueChange={handleMunicipalityChange}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Municipalities</SelectItem>
                    {MUNICIPALITIES.map(m => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {availableBarangays.length > 0 && (
                <div>
                  <Label className="text-xs font-medium">Barangay</Label>
                  <Select value={selectedBarangay} onValueChange={setSelectedBarangay}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="All Barangays" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableBarangays.map(b => (
                        <SelectItem key={b} value={b}>{b}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="space-y-3 pt-2 border-t">
              <Label className="text-xs font-medium">Layers</Label>
              <div className="flex items-center justify-between">
                <Label className="text-xs">Facilities</Label>
                <Switch checked={showFacilities} onCheckedChange={setShowFacilities} />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-xs">Hazard Alerts</Label>
                <Switch checked={showAlerts} onCheckedChange={setShowAlerts} />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-xs">Incidents</Label>
                <Switch checked={showIncidents} onCheckedChange={setShowIncidents} />
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t">
              <Label className="text-xs font-medium flex items-center gap-1">
                <MapPin className="w-3 h-3" /> Facility Summary
              </Label>
              {Object.entries(facilityTypeCounts).map(([type, count]) => (
                <div key={type} className="flex items-center justify-between text-xs">
                  <span className="capitalize">{type.replace(/_/g, ' ')}</span>
                  <Badge variant="secondary" className="text-[10px]">{count}</Badge>
                </div>
              ))}
              {Object.keys(facilityTypeCounts).length === 0 && (
                <p className="text-xs text-muted-foreground">No facilities mapped</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Map */}
        <div className="lg:col-span-3">
          <GISMap
            facilities={showFacilities ? filteredFacilities : []}
            alerts={showAlerts ? filteredAlerts : []}
            incidents={showIncidents ? filteredIncidents : []}
            layers={layers}
            height="calc(100vh - 180px)"
            flyTo={flyTo}
            flyToZoom={flyToZoom}
          />
        </div>
      </div>
    </div>
  );
}
