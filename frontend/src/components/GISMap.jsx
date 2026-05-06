import React, { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, LayersControl, CircleMarker, useMap, GeoJSON, LayerGroup } from 'react-leaflet';
import L from 'leaflet';
import * as esri from 'esri-leaflet';
import 'leaflet/dist/leaflet.css';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  Hospital, GraduationCap, Home, Flame,
  Shield, Building2, Landmark, ArrowLeftRight, Info
} from 'lucide-react';

import { MAP_CENTER, MAP_ZOOM } from '@/lib/constants';
import { fetchGeoJSON } from '@/lib/spatial';
import { Badge } from '@/components/ui/badge';

/**
 * GeoRiskPH Authoritative Hazard Layers
 * Uses Dynamic Rendering (esri-leaflet) for high performance
 */
const GEORISK_LAYERS = [
  { id: 'gr-flood', name: 'GeoRisk: Flood Susceptibility', url: "https://ulap-hazards.georisk.gov.ph/arcgis/rest/services/MGBPublic/Flood/MapServer" },
  { id: 'gr-landslide', name: 'GeoRisk: Rain-Induced Landslide', url: "https://ulap-hazards.georisk.gov.ph/arcgis/rest/services/MGBPublic/RainInducedLandslide/MapServer" },
  { id: 'gr-faults', name: 'GeoRisk: Active Faults', url: "https://ulap-hazards.georisk.gov.ph/arcgis/rest/services/PHIVOLCSPublic/ActiveFault/MapServer" },
  { id: 'gr-shaking', name: 'GeoRisk: Ground Shaking', url: "https://ulap-hazards.georisk.gov.ph/arcgis/rest/services/PHIVOLCSPublic/GroundShaking/MapServer" },
  { id: 'gr-tsunami', name: 'GeoRisk: Tsunami Hazard', url: "https://ulap-hazards.georisk.gov.ph/arcgis/rest/services/PHIVOLCSPublic/Tsunami/MapServer" },
  { id: 'gr-liquefaction', name: 'GeoRisk: Liquefaction', url: "https://ulap-hazards.georisk.gov.ph/arcgis/rest/services/PHIVOLCSPublic/Liquefaction/MapServer" },
  { id: 'gr-surge', name: 'GeoRisk: Storm Surge', url: "https://ulap-hazards.georisk.gov.ph/arcgis/rest/services/PAGASAPublic/StormSurge/MapServer" }
];

// FIX: Standard Leaflet Icon fix
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

/**
 * Internal component to handle ArcGIS Dynamic Rendering.
 * Improved with instance tracking and a comprehensive "Clean-on-Unmount" strategy.
 */
function ArcGISLayer({ url, name }) {
  const map = useMap();
  const layerRef = React.useRef(null);

  useEffect(() => {
    if (!url || !map) return;

    // Provincial Filter values common in Philippine Agency DBs
    const provFilter = "PROVINCE = 'CAMARINES NORTE' OR Province = 'Camarines Norte' OR PROV_NAME = 'CAMARINES NORTE'";

    const layerOptions = {
      url: url,
      opacity: 0.65,
      useCors: true
    };

    // Apply filters to MGB (Flood/Landslide) to keep map clean
    // We apply it to layers 0, 1, and 2 to ensure it hits the data regardless of index
    if (url.includes('MGBPublic')) {
      layerOptions.layerDefs = {
        0: provFilter,
        1: provFilter,
        2: provFilter
      };
    }

    // Create and add the layer
    const layerInstance = esri.dynamicMapLayer(layerOptions);
    layerRef.current = layerInstance;
    layerInstance.addTo(map);

    // Cleanup logic: Runs when checkbox is unchecked
    return () => {
      if (layerRef.current) {
        const instance = layerRef.current;
        map.removeLayer(instance);

        // Comprehensive DOM Purge: Removes all image fragments associated with this service URL
        // This solves the "Ghost Layer" / Stuck Color issue
        try {
          const container = map.getContainer();
          const layers = container.querySelectorAll('.leaflet-image-layer');
          layers.forEach(img => {
            if (img.src && img.src.includes(url.split('/rest/services/')[1])) {
              img.remove();
            }
          });
        } catch (e) {
          console.warn("Manual cleanup for", name, "encountered an issue.");
        }

        layerRef.current = null;
      }
    };
  }, [url, map, name]);

  return null;
}

function RemoteGeoJSON({ url, color, layerName }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    if (!url) return;
    fetchGeoJSON(url)
      .then(res => setData(res))
      .catch(err => console.error(`GeoJSON Load Error (${layerName}):`, err));
  }, [url, layerName]);

  if (!data || !data.features) return null;

  return (
    <GeoJSON
      key={url}
      data={data}
      style={() => ({
        fillColor: color || '#3B82F6',
        weight: 1,
        opacity: 1,
        color: 'white',
        fillOpacity: 0.5
      })}
    />
  );
}

const getFacilityIcon = (type, isAtRisk) => {
  const iconMap = {
    hospital: Hospital, school: GraduationCap, evacuation_center: Home,
    fire_station: Flame, police_station: Shield, barangay_hall: Building2,
    government_building: Landmark, bridge: ArrowLeftRight,
  };
  const IconComponent = iconMap[type] || Building2;
  const color = isAtRisk ? '#ef4444' : '#3B82F6';
  const iconHtml = renderToStaticMarkup(
    <div style={{
      backgroundColor: 'white', borderRadius: '50%', padding: '5px', border: `2px solid ${color}`,
      boxShadow: '0 2px 4px rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      width: isAtRisk ? '36px' : '30px', height: isAtRisk ? '36px' : '30px',
    }}>
      <IconComponent size={isAtRisk ? 20 : 16} color={color} />
    </div>
  );
  return L.divIcon({
    html: iconHtml, className: 'custom-facility-icon',
    iconSize: [isAtRisk ? 36 : 30, isAtRisk ? 36 : 30],
    iconAnchor: [isAtRisk ? 18 : 15, isAtRisk ? 18 : 15],
  });
};

/**
 * Helper component to handle map flying
 */
function FlyToLocation({ coords, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (coords) {
      map.flyTo(coords, zoom, { duration: 1.5 });
    }
  }, [coords, zoom, map]);
  return null;
}

export default function GISMap({
  facilities = [], alerts = [], incidents = [],
  layers = [], highlightedIds = [],
  className, height = '500px', flyTo = null, flyToZoom = 13
}) {
  const facilityMarkers = facilities.filter(f => f.latitude && f.longitude);
  const alertMarkers = alerts.filter(a => a.latitude && a.longitude && (a.status === 'active' || a.status === 'monitoring'));
  const activeLayers = layers.filter(l => l.is_active !== false && l.file_url);

  return (
    <div className={`relative w-full overflow-hidden rounded-lg border bg-background ${className}`} style={{ height }}>
      <MapContainer
        center={MAP_CENTER} zoom={MAP_ZOOM}
        style={{ height: '100%', width: '100%', zIndex: 1 }} zoomControl={true}
      >
        {flyTo && <FlyToLocation coords={flyTo} zoom={flyToZoom} />}

        <LayersControl position="topright">
          <LayersControl.BaseLayer checked name="Street Map">
            <TileLayer attribution='&copy; OSM | GeoRisk v5.3' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="Satellite">
            <TileLayer attribution='&copy; Esri' url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />
          </LayersControl.BaseLayer>

          {/* GeoRisk Professional Layers */}
          {GEORISK_LAYERS.map((layer) => (
            <LayersControl.Overlay key={layer.id} name={`NATIONAL: ${layer.name.replace('GeoRisk: ', '')}`}>
              <LayerGroup>
                <ArcGISLayer url={layer.url} name={layer.name} />
              </LayerGroup>
            </LayersControl.Overlay>
          ))}

          {/* User Uploaded Custom Layers */}
          {activeLayers.map((layer) => (
            <LayersControl.Overlay key={`u-${layer.id}`} name={`USER: ${layer.name}`}>
              <RemoteGeoJSON url={layer.file_url} layerName={layer.name} />
            </LayersControl.Overlay>
          ))}

          {/* Operational Overlays */}
          <LayersControl.Overlay checked name="Facilities & Assets">
            <LayerGroup>
              {facilityMarkers.map(f => (
                <Marker key={`f-${f.id}`} position={[f.latitude, f.longitude]} icon={getFacilityIcon(f.type, highlightedIds.includes(f.id))}>
                  <Popup><div className="text-xs"><strong>{f.name}</strong><br/>{f.type?.replace(/_/g, ' ')}</div></Popup>
                </Marker>
              ))}
            </LayerGroup>
          </LayersControl.Overlay>

          <LayersControl.Overlay checked name="Active Alerts">
             <LayerGroup>
                {alertMarkers.map(a => (
                    <CircleMarker key={`a-${a.id}`} center={[a.latitude, a.longitude]} radius={10} fillColor="#ef4444" fillOpacity={0.5} color="#ef4444">
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
