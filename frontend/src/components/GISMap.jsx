import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, LayersControl, CircleMarker, useMap, GeoJSON } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  Hospital, GraduationCap, Home, Flame,
  Shield, Building2, Landmark, ArrowLeftRight
} from 'lucide-react';

import { MAP_CENTER, MAP_ZOOM } from '@/lib/constants';
import { fetchGeoJSON, GEORISK_LAYERS_CONFIG } from '@/lib/spatial';
import { Badge } from '@/components/ui/badge';

// FIX: Ensure Leaflet icons don't break on build
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function FlyToLocation({ coords, zoom = 13 }) {
  const map = useMap();
  useEffect(() => {
    if (coords) map.flyTo(coords, zoom, { duration: 1.2 });
  }, [coords, zoom, map]);
  return null;
}

function RemoteGeoJSON({ url, color, layerName, isGeoRisk = false }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!url) return;

    setLoading(true);
    // Append f=geojson for ArcGIS Servers if not present
    let finalUrl = url;
    if (isGeoRisk && !url.includes('f=geojson')) {
        finalUrl = url.includes('?') ? `${url}&f=geojson` : `${url}/query?where=1%3D1&outFields=*&f=geojson`;
    }

    fetchGeoJSON(finalUrl)
      .then(res => {
        setData(res);
        setLoading(false);
      })
      .catch(err => {
        console.error(`Map Layer Load Error (${layerName}):`, err);
        setLoading(false);
      });
  }, [url, layerName, isGeoRisk]);

  if (!data) return null;

  const onEachFeature = (feature, layer) => {
    if (feature.properties) {
      const { name, barangay, municipality, susceptibility, info, title } = feature.properties;
      layer.bindPopup(`
        <div class="text-xs font-sans">
          <p class="font-bold border-b pb-1 mb-1">${name || title || layerName}</p>
          ${barangay ? `<p><b>Barangay:</b> ${barangay}</p>` : ''}
          ${municipality ? `<p><b>Municipality:</b> ${municipality}</p>` : ''}
          <p class="capitalize"><b>Status/Susceptibility:</b> ${susceptibility?.replace('_', ' ') || 'Assessed'}</p>
          ${info ? `<p class="mt-1 text-muted-foreground">${info}</p>` : ''}
        </div>
      `);
    }
  };

  const getStyle = (feature) => {
    const susc = (feature.properties?.susceptibility || feature.properties?.severity || '').toLowerCase();
    let fillColor = color || '#3B82F6';

    if (susc === 'very_high' || susc === 'critical' || susc.includes('high')) fillColor = '#ef4444';
    else if (susc === 'moderate' || susc === 'medium') fillColor = '#eab308';
    else if (susc === 'low') fillColor = '#22c55e';

    return {
      fillColor,
      weight: 1,
      opacity: 1,
      color: 'white',
      fillOpacity: 0.5,
    };
  };

  return data.features ? <GeoJSON key={url} data={data} style={getStyle} onEachFeature={onEachFeature} /> : null;
}

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

const iconCache = new Map();
const getFacilityIcon = (type, isAtRisk) => {
  const cacheKey = `${type}-${isAtRisk}`;
  if (iconCache.has(cacheKey)) return iconCache.get(cacheKey);

  const iconMap = {
    hospital: Hospital,
    school: GraduationCap,
    evacuation_center: Home,
    fire_station: Flame,
    police_station: Shield,
    barangay_hall: Building2,
    government_building: Landmark,
    bridge: ArrowLeftRight,
  };

  const IconComponent = iconMap[type] || Building2;
  const color = isAtRisk ? '#ef4444' : (facilityColors[type] || '#6B7280');

  const iconHtml = renderToStaticMarkup(
    <div style={{
      backgroundColor: 'white',
      borderRadius: '50%',
      padding: '5px',
      border: `2px solid ${color}`,
      boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: isAtRisk ? '36px' : '30px',
      height: isAtRisk ? '36px' : '30px',
    }}>
      <IconComponent size={isAtRisk ? 20 : 16} color={color} />
    </div>
  );

  const icon = L.divIcon({
    html: iconHtml,
    className: 'custom-facility-icon',
    iconSize: [isAtRisk ? 36 : 30, isAtRisk ? 36 : 30],
    iconAnchor: [isAtRisk ? 18 : 15, isAtRisk ? 18 : 15],
  });

  iconCache.set(cacheKey, icon);
  return icon;
};

export default function GISMap({
  facilities = [],
  alerts = [],
  incidents = [],
  layers = [],
  extraMarkers = [],
  highlightedIds = [],
  className,
  height = '500px',
  flyTo = null,
  flyToZoom = 13
}) {
  const facilityMarkers = facilities.filter(f => f.latitude && f.longitude);
  const alertMarkers = alerts.filter(a => a.latitude && a.longitude && (a.status === 'active' || a.status === 'monitoring'));
  const incidentMarkers = incidents.filter(i => i.latitude && i.longitude);
  const densityMarkers = extraMarkers.filter(m => m.type === 'population_density');
  const activeLayers = layers.filter(l => l.is_active !== false && l.file_url);

  return (
    <div className={`relative w-full overflow-hidden rounded-lg border bg-background ${className}`} style={{ height }}>
      <MapContainer
        center={MAP_CENTER}
        zoom={MAP_ZOOM}
        style={{ height: '100%', width: '100%', zIndex: 1 }}
        zoomControl={true}
      >
        {flyTo && <FlyToLocation coords={flyTo} zoom={flyToZoom} />}

        <LayersControl position="topright">
          <LayersControl.BaseLayer checked name="Street Map">
            <TileLayer
              attribution='&copy; OpenStreetMap'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="Satellite">
            <TileLayer
              attribution='&copy; Esri'
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            />
          </LayersControl.BaseLayer>

          {/* GeoRiskPH Authoritative Hazards */}
          {GEORISK_LAYERS_CONFIG.map((layer) => (
            <LayersControl.Overlay key={layer.id} name={layer.name}>
              <RemoteGeoJSON url={layer.url} layerName={layer.name} isGeoRisk={true} />
            </LayersControl.Overlay>
          ))}

          {/* User Custom Layers */}
          {activeLayers.map((layer) => (
            <LayersControl.Overlay key={layer.id} checked name={`Layer: ${layer.name}`}>
              <RemoteGeoJSON url={layer.file_url} layerName={layer.name} />
            </LayersControl.Overlay>
          ))}

          <LayersControl.Overlay checked name="Facilities & Assets">
            <React.Fragment>
              {facilityMarkers.map((f) => (
                <Marker
                  key={`facility-${f.id}`}
                  position={[f.latitude, f.longitude]}
                  icon={getFacilityIcon(f.type, highlightedIds.includes(f.id))}
                >
                  <Popup>
                    <div className="text-xs">
                        <strong>{f.name}</strong><br/>
                        {f.type?.replace(/_/g, ' ')}
                    </div>
                  </Popup>
                </Marker>
              ))}
            </React.Fragment>
          </LayersControl.Overlay>

          <LayersControl.Overlay checked name="Active Alerts">
             <React.Fragment>
                {alertMarkers.map(a => (
                    <CircleMarker
                        key={`alert-${a.id}`}
                        center={[a.latitude, a.longitude]}
                        radius={10}
                        fillColor="#ef4444"
                        fillOpacity={0.5}
                        color="#ef4444"
                    >
                        <Popup>{a.title}</Popup>
                    </CircleMarker>
                ))}
             </React.Fragment>
          </LayersControl.Overlay>
        </LayersControl>
      </MapContainer>
    </div>
  );
}
