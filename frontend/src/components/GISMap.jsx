import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, LayersControl, CircleMarker, useMap, GeoJSON } from 'react-leaflet';
import { MAP_CENTER, MAP_ZOOM } from '@/lib/constants';
import 'leaflet/dist/leaflet.css';
import axios from 'axios';

function FlyToLocation({ coords, zoom = 13 }) {
  const map = useMap();
  useEffect(() => {
    if (coords) map.flyTo(coords, zoom, { duration: 1.2 });
  }, [coords, zoom, map]);
  return null;
}

function RemoteGeoJSON({ url, color }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    if (url) {
      // In a real app, this would fetch from the actual storage URL
      // For our mock/local environment, we'll simulate it
      if (url.startsWith('https://mock-storage.com')) {
         // Simulate a small polygon for the mock upload
         setData({
           type: "Feature",
           properties: {},
           geometry: {
             type: "Polygon",
             coordinates: [[[122.9, 14.1], [123.0, 14.1], [123.0, 14.2], [122.9, 14.2], [122.9, 14.1]]]
           }
         });
      } else {
        axios.get(url).then(res => setData(res.data)).catch(console.error);
      }
    }
  }, [url]);

  if (!data) return null;
  return <GeoJSON data={data} style={{ color, fillColor: color, fillOpacity: 0.4 }} />;
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
              <RemoteGeoJSON url={layer.file_url} color={hazardOverlayColors[layer.type] || '#6B7280'} />
            </LayersControl.Overlay>
          ))}

          <LayersControl.Overlay checked name="Facilities">
            <React.Fragment>
              {facilityMarkers.map((f) => (
                <CircleMarker
                  key={f.id}
                  center={[f.latitude, f.longitude]}
                  radius={6}
                  fillColor={facilityColors[f.type] || '#6B7280'}
                  fillOpacity={0.8}
                  color="#fff"
                  weight={2}
                >
                  <Popup>
                    <div className="text-xs">
                      <strong>{f.name}</strong>
                      <br />Type: {f.type?.replace(/_/g, ' ')}
                      <br />Municipality: {f.municipality}
                      {f.capacity && <><br />Capacity: {f.capacity}</>}
                    </div>
                  </Popup>
                </CircleMarker>
              ))}
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

