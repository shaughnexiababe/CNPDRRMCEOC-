import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, LayersControl, CircleMarker, useMap, GeoJSON } from 'react-leaflet';
import { MAP_CENTER, MAP_ZOOM } from '@/lib/constants';
import 'leaflet/dist/leaflet.css';
import axios from 'axios';
import { Badge } from '@/components/ui/badge';

function FlyToLocation({ coords, zoom = 13 }) {
  const map = useMap();
  useEffect(() => {
    if (coords) map.flyTo(coords, zoom, { duration: 1.2 });
  }, [coords, zoom, map]);
  return null;
}

function RemoteGeoJSON({ url, color, layerName }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    if (url) {
      if (url.startsWith('data:application/json;base64,')) {
        try {
          const jsonString = atob(url.split(',')[1]);
          setData(JSON.parse(jsonString));
        } catch (e) {
          console.error("Failed to parse base64 GeoJSON", e);
        }
      } else if (url.startsWith('https://mock-storage.com')) {
         setData({
           type: "FeatureCollection",
           features: [
             {
               type: "Feature",
               properties: { susceptibility: 'very_high', name: 'Sample Site Boundary' },
               geometry: { type: "Polygon", coordinates: [[[122.9553, 14.1173], [123.0156, 14.1089], [122.9734, 14.1256], [122.9553, 14.1173]]] }
             }
           ]
         });
      } else {
        axios.get(url).then(res => setData(res.data)).catch(console.error);
      }
    }
  }, [url]);

  if (!data) return null;

  const onEachFeature = (feature, layer) => {
    if (feature.properties) {
      const { name, barangay, municipality, susceptibility, info } = feature.properties;
      layer.bindPopup(`
        <div class="text-xs font-sans">
          <p class="font-bold border-b pb-1 mb-1">${name || layerName}</p>
          ${barangay ? `<p><b>Barangay:</b> ${barangay}</p>` : ''}
          ${municipality ? `<p><b>Municipality:</b> ${municipality}</p>` : ''}
          <p class="capitalize"><b>Susceptibility:</b> ${susceptibility?.replace('_', ' ') || 'High'}</p>
          ${info ? `<p class="mt-1 text-muted-foreground">${info}</p>` : ''}
        </div>
      `);
    }
  };

  const getStyle = (feature) => {
    const susc = feature.properties?.susceptibility?.toLowerCase();
    let fillColor = color;

    // Override color based on MGB/Project NOAH standard susceptibility
    if (susc === 'very_high' || susc === 'critical') fillColor = '#ef4444'; // Red
    else if (susc === 'high') fillColor = '#f97316'; // Orange
    else if (susc === 'moderate' || susc === 'medium') fillColor = '#eab308'; // Yellow
    else if (susc === 'low') fillColor = '#22c55e'; // Green

    return {
      fillColor,
      weight: 1,
      opacity: 1,
      color: 'white',
      fillOpacity: 0.5,
    };
  };

  return <GeoJSON data={data} style={getStyle} onEachFeature={onEachFeature} />;
}

// Fix leaflet default marker icon
import L from 'leaflet';
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const facilityColors = {
  hospital: '#EF4444',
  school: '#3B82F6',
  evacuation_center: '#22C55E',
  fire_station: '#F97316',
  police_station: '#6366F1',
  barangay_hall: '#8B5CF6',
  government_building: '#14B8A6',
  bridge: '#F59E0B',
};

const hazardOverlayColors = {
  flood: '#3B82F6',
  landslide: '#A855F7',
  storm_surge: '#06B6D4',
  liquefaction: '#F97316',
  fault_line: '#EF4444',
};

export default function GISMap({
  facilities = [],
  alerts = [],
  incidents = [],
  layers = [],
  highlightedIds = [],
  className,
  height = '500px',
  flyTo = null,
  flyToZoom = 13
}) {
  const facilityMarkers = facilities.filter(f => f.latitude && f.longitude);
  const alertMarkers = alerts.filter(a => a.latitude && a.longitude && (a.status === 'active' || a.status === 'monitoring'));
  const incidentMarkers = incidents.filter(i => i.latitude && i.longitude);
  const activeLayers = layers.filter(l => l.is_active !== false && l.file_url);

  return (
    <div className={className} style={{ height }}>
      <MapContainer
        center={MAP_CENTER}
        zoom={MAP_ZOOM}
        style={{ height: '100%', width: '100%', borderRadius: 'var(--radius)' }}
        zoomControl={true}
      >
        {flyTo && <FlyToLocation coords={flyTo} zoom={flyToZoom} />}
        <LayersControl position="topright">
          <LayersControl.BaseLayer checked name="Street Map">
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="Satellite">
            <TileLayer
              attribution='&copy; Esri'
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="Terrain">
            <TileLayer
              attribution='&copy; OpenTopoMap'
              url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
            />
          </LayersControl.BaseLayer>

          {/* Custom Hazard Layers */}
          {activeLayers.map((layer) => (
            <LayersControl.Overlay key={layer.id} checked name={`Layer: ${layer.name}`}>
              <RemoteGeoJSON url={layer.file_url} color={hazardOverlayColors[layer.type] || '#6B7280'} layerName={layer.name} />
            </LayersControl.Overlay>
          ))}

          <LayersControl.Overlay checked name="Facilities">
            <React.Fragment>
              {facilityMarkers.map((f) => {
                const isHighlighted = highlightedIds.includes(f.id);
                return (
                  <CircleMarker
                    key={f.id}
                    center={[f.latitude, f.longitude]}
                    radius={isHighlighted ? 10 : 6}
                    fillColor={isHighlighted ? "#ff0000" : (facilityColors[f.type] || '#6B7280')}
                    fillOpacity={0.8}
                    color="#fff"
                    weight={isHighlighted ? 4 : 2}
                  >
                    <Popup>
                      <div className="text-xs">
                        {isHighlighted && <Badge variant="destructive" className="mb-2 text-[8px] h-4">AT RISK</Badge>}
                        <br /><strong>{f.name}</strong>
                        <br />Type: {f.type?.replace(/_/g, ' ')}
                        <br />Municipality: {f.municipality}
                        {f.capacity && <><br />Capacity: {f.capacity}</>}
                      </div>
                    </Popup>
                  </CircleMarker>
                );
              })}
            </React.Fragment>
          </LayersControl.Overlay>

          <LayersControl.Overlay checked name="Active Alerts">
            <React.Fragment>
              {alertMarkers.map((a) => (
                <CircleMarker
                  key={a.id}
                  center={[a.latitude, a.longitude]}
                  radius={12}
                  fillColor={a.severity === 'very_high' ? '#EF4444' : a.severity === 'high' ? '#F97316' : '#F59E0B'}
                  fillOpacity={0.4}
                  color={a.severity === 'very_high' ? '#EF4444' : '#F97316'}
                  weight={2}
                >
                  <Popup>
                    <div className="text-xs">
                      <strong>{a.title}</strong>
                      <br />Severity: {a.severity?.replace('_', ' ')}
                      <br />Type: {a.type}
                      {a.affected_municipality && <><br />Area: {a.affected_municipality}</>}
                    </div>
                  </Popup>
                </CircleMarker>
              ))}
            </React.Fragment>
          </LayersControl.Overlay>

          <LayersControl.Overlay name="Incident Reports">
            <React.Fragment>
              {incidentMarkers.map((i) => (
                <Marker key={i.id} position={[i.latitude, i.longitude]}>
                  <Popup>
                    <div className="text-xs">
                      <strong>{i.title}</strong>
                      <br />Type: {i.type?.replace(/_/g, ' ')}
                      <br />Status: {i.status}
                      {i.municipality && <><br />{i.municipality}</>}
                    </div>
                  </Popup>
                </Marker>
              ))}
            </React.Fragment>
          </LayersControl.Overlay>
        </LayersControl>
      </MapContainer>
    </div>
  );
}

