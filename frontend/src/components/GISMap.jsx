import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, LayersControl, CircleMarker, useMap, GeoJSON, LayerGroup } from 'react-leaflet';
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
    // Append f=geojson and query parameters for ArcGIS Servers
    let finalUrl = url;
    if (isGeoRisk) {
        // Construct a query URL that requests GeoJSON for the current extent
        const baseUrl = url.endsWith('/') ? url : `${url}/`;
        finalUrl = `${baseUrl}query?where=1%3D1&outFields=*&returnGeometry=true&f=geojson`;
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
      const props = feature.properties;
      const title = props.name || props.title || props.Municipality || props.Hazard || layerName;

      let popupContent = `<div class="text-xs font-sans"><p class="font-bold border-b pb-1 mb-1">${title}</p>`;

      if (props.Barangay || props.BARANGAY) popupContent += `<p><b>Barangay:</b> ${props.Barangay || props.BARANGAY}</p>`;
      if (props.Municipality || props.MUNICIPALI) popupContent += `<p><b>Municipality:</b> ${props.Municipality || props.MUNICIPALI}</p>`;

      const susc = props.susceptibility || props.Susceptibil || props.RiskLevel || props.Severity;
      if (susc) popupContent += `<p class="capitalize"><b>Susceptibility:</b> ${susc.toString().replace('_', ' ')}</p>`;

      popupContent += `</div>`;
      layer.bindPopup(popupContent);
    }
  };

  const getStyle = (feature) => {
    const props = feature.properties || {};
    const susc = (props.susceptibility || props.Susceptibil || props.RiskLevel || props.Severity || '').toString().toLowerCase();

    let fillColor = color || '#3B82F6';

    if (susc.includes('very high') || susc.includes('critical') || susc === '4' || susc.includes('v_high')) {
      fillColor = '#ef4444'; // Red
    } else if (susc.includes('high') || susc === '3') {
      fillColor = '#f97316'; // Orange
    } else if (susc.includes('moderate') || susc.includes('medium') || susc === '2') {
      fillColor = '#eab308'; // Yellow
    } else if (susc.includes('low') || susc === '1') {
      fillColor = '#22c55e'; // Green
    }

    return {
      fillColor,
      weight: 1,
      opacity: 1,
      color: 'white',
      fillOpacity: 0.6,
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
              attribution='&copy; OpenStreetMap | GeoRisk v1.2'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="Satellite">
            <TileLayer
              attribution='&copy; Esri'
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            />
          </LayersControl.BaseLayer>

          {/* GeoRiskPH Hazard Overlays */}
          {GEORISK_LAYERS_CONFIG.map((layer) => (
            <LayersControl.Overlay key={layer.id} name={layer.name}>
              <RemoteGeoJSON url={layer.url} layerName={layer.name} isGeoRisk={true} />
            </LayersControl.Overlay>
          ))}

          {/* Custom Hazard Layers (Local/Uploaded) */}
          {activeLayers.map((layer) => (
            <LayersControl.Overlay key={`local-${layer.id}`} name={`Local: ${layer.name}`}>
              <RemoteGeoJSON url={layer.file_url} layerName={layer.name} />
            </LayersControl.Overlay>
          ))}

          <LayersControl.Overlay checked name="Facilities & Assets">
            <LayerGroup>
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
            </LayerGroup>
          </LayersControl.Overlay>

          <LayersControl.Overlay checked name="Active Alerts">
             <LayerGroup>
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
             </LayerGroup>
          </LayersControl.Overlay>
        </LayersControl>
      </MapContainer>
    </div>
  );
}
