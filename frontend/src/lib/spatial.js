import * as turf from '@turf/turf';

/**
 * Checks if a point (lat, lng) is within any polygon in the given GeoJSON.
 */
export const getSpatialExposure = (lat, lng, geojson) => {
  if (!geojson || !geojson.features || isNaN(lat) || isNaN(lng)) return 'none';

  const point = turf.point([lng, lat]);
  let highestSusc = 'none';

  const suscMap = {
    'none': 0, 'low': 1, 'moderate': 2, 'medium': 2, 'high': 3, 'very_high': 4, 'critical': 4
  };

  for (const feature of geojson.features) {
    try {
      if (feature.geometry.type === 'Polygon' || feature.geometry.type === 'MultiPolygon') {
        if (turf.booleanPointInPolygon(point, feature)) {
          const props = feature.properties || {};
          const susc = (props.susceptibility || props.risk || props.GRIDCODE || 'high').toString().toLowerCase();

          let currentLevel = 3;
          if (susc.includes('very') || susc.includes('critical') || susc === '4') currentLevel = 4;
          else if (susc.includes('high') || susc === '3') currentLevel = 3;
          else if (susc.includes('mod') || susc.includes('med') || susc === '2') currentLevel = 2;
          else if (susc.includes('low') || susc === '1') currentLevel = 1;

          if (currentLevel > suscMap[highestSusc]) {
            if (currentLevel === 4) highestSusc = 'very_high';
            else if (currentLevel === 3) highestSusc = 'high';
            else if (currentLevel === 2) highestSusc = 'moderate';
            else if (currentLevel === 1) highestSusc = 'low';
          }
        }
      }
    } catch (e) { continue; }
  }
  return highestSusc;
};

/**
 * Calculates the required family food packs based on exposed households.
 * Standard PDRRMO assumption: 1 HH = 1 Family Food Pack (FFP).
 */
export const estimateReliefRequirements = (hhCount) => {
  const waterLiters = hhCount * 5 * 3; // 5 people per HH * 3 days * 1 liter
  const foodPacks = Math.ceil(hhCount * 1.1); // +10% contingency
  return {
    foodPacks,
    waterLiters,
    estimatedCost: foodPacks * 550 // Avg 550 PHP per FFP
  };
};

/**
 * Generates density points within hazard polygons to represent exposed households.
 * 1 point = X households (densityFactor).
 */
export const generateHazardDensityPoints = (count, hazardGeoJSON, municipalityBBOX) => {
  if (!hazardGeoJSON || !hazardGeoJSON.features || count <= 0) return [];

  const points = [];
  const [minLng, minLat, maxLng, maxLat] = municipalityBBOX;

  // Limit to max 500 points for performance
  const displayPoints = Math.min(count, 500);
  let attempts = 0;
  const maxAttempts = displayPoints * 10;

  while (points.length < displayPoints && attempts < maxAttempts) {
    attempts++;
    const lng = minLng + Math.random() * (maxLng - minLng);
    const lat = minLat + Math.random() * (maxLat - minLat);
    const p = turf.point([lng, lat]);

    // Check if this random point is inside ANY hazard polygon
    const isExposed = hazardGeoJSON.features.some(feature => {
      try {
        return (feature.geometry.type === 'Polygon' || feature.geometry.type === 'MultiPolygon') &&
               turf.booleanPointInPolygon(p, feature);
      } catch (e) { return false; }
    });

    if (isExposed) {
      points.push({
        id: `density-${points.length}`,
        latitude: lat,
        longitude: lng,
        type: 'population_density'
      });
    }
  }

  return points;
};

/**
 * Cache Management for Hazard Layers (Sync-and-Cache Model)
 */
const CACHE_PREFIX = 'hazard_cache_';
const CACHE_TTL = 1000 * 60 * 60 * 24; // 24 Hours

const getCachedData = (url) => {
  try {
    const cached = localStorage.getItem(CACHE_PREFIX + btoa(url).substring(0, 32));
    if (!cached) return null;
    const { data, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp > CACHE_TTL) return null; // Expired
    return data;
  } catch (e) { return null; }
};

const setCachedData = (url, data) => {
  try {
    localStorage.setItem(CACHE_PREFIX + btoa(url).substring(0, 32), JSON.stringify({
      data,
      timestamp: Date.now()
    }));
  } catch (e) { /* Storage full or unavailable */ }
};

/**
 * Robust fetch for GeoJSON or ArcGIS JSON with caching.
 */
export const fetchGeoJSON = async (url, forceRefresh = false) => {
  if (!url) return null;
  const cleanUrl = url.trim();

  // 1. Check Cache first unless force refresh is requested
  if (!forceRefresh) {
    const cached = getCachedData(cleanUrl);
    if (cached) return cached;
  }

  // 2. Normalize and Encode URL
  const getSafeUrl = (u) => {
    if (u.startsWith('data:') || u.startsWith('/') || u.startsWith('./')) return u;

    try {
      // Split into base and params for clean encoding
      const [base, query] = u.split('?');
      if (!query) return u.startsWith('http') ? u : 'https://' + u;

      const params = new URLSearchParams(query);
      return `${base.startsWith('http') ? base : 'https://' + base}?${params.toString()}`;
    } catch (e) { return u; }
  };

  const safeUrl = getSafeUrl(cleanUrl);

  try {
    let response = await fetch(safeUrl);

    // Auto-retry with ArcGIS JSON if GeoJSON is rejected (400)
    if (!response.ok && safeUrl.includes('f=geojson')) {
      const fallbackUrl = safeUrl.replace('f=geojson', 'f=json');
      response = await fetch(fallbackUrl);
    }

    if (!response.ok) {
      // If server is down, try to use EXPIRED cache as ultimate fallback
      const stale = getCachedData(cleanUrl);
      if (stale) return stale;
      throw new Error(`Agency Server Error: ${response.status}`);
    }

    const data = await response.json();
    if (data.error) throw new Error(data.error.message || "ArcGIS Error");

    // Normalize ArcGIS to GeoJSON
    let finalData = data;
    if (data.features && Array.isArray(data.features) && !data.type) {
      const geojsonFeatures = data.features
        .map(f => {
          const geometry = arcgisToGeoJSONGeometry(f.geometry);
          return geometry ? { type: "Feature", geometry, properties: f.attributes || {} } : null;
        })
        .filter(f => f !== null);
      finalData = { type: "FeatureCollection", features: geojsonFeatures };
    }

    // Update Cache
    setCachedData(cleanUrl, finalData);
    return finalData;

  } catch (e) {
    console.warn(`Fetch failed for ${cleanUrl}, checking stale cache...`, e.message);
    const stale = getCachedData(cleanUrl);
    if (stale) return stale;
    throw e;
  }
};

const arcgisToGeoJSONGeometry = (geometry) => {
  if (!geometry) return null;
  try {
    if (geometry.x !== undefined && geometry.y !== undefined) {
      let x = geometry.x, y = geometry.y;
      if (Math.abs(x) > 180 || Math.abs(y) > 90) [x, y] = webMercatorToWgs84(x, y);
      return { type: "Point", coordinates: [x, y] };
    }
    if (geometry.rings) {
      const coordinates = geometry.rings.map(ring =>
        ring.map(([x, y]) => (Math.abs(x) > 180 || Math.abs(y) > 90) ? webMercatorToWgs84(x, y) : [x, y])
      );
      return { type: "Polygon", coordinates };
    }
    if (geometry.paths) {
      const coordinates = geometry.paths.map(path =>
        path.map(([x, y]) => (Math.abs(x) > 180 || Math.abs(y) > 90) ? webMercatorToWgs84(x, y) : [x, y])
      );
      return {
        type: coordinates.length > 1 ? "MultiLineString" : "LineString",
        coordinates: coordinates.length > 1 ? coordinates : coordinates[0]
      };
    }
  } catch (e) { return null; }
  return null;
};

const webMercatorToWgs84 = (x, y) => {
  const lng = (x / 20037508.34) * 180;
  let lat = (y / 20037508.34) * 180;
  lat = (180 / Math.PI) * (2 * Math.atan(Math.exp((lat * Math.PI) / 180)) - Math.PI / 2);
  return [lng, lat];
};

// Official GeoRiskPH Authoritative Layers Configuration (MapServer REST)
export const GEORISK_LAYERS_CONFIG = [
  { id: 'gr-flood', name: 'GeoRisk: Flood Susceptibility', url: "https://ulap-hazards.georisk.gov.ph/arcgis/rest/services/MGBPublic/Flood/MapServer/0", type: 'map' },
  { id: 'gr-landslide', name: 'GeoRisk: Rain-Induced Landslide', url: "https://ulap-hazards.georisk.gov.ph/arcgis/rest/services/MGBPublic/RainInducedLandslide/MapServer/0", type: 'map' },
  { id: 'gr-faults', name: 'GeoRisk: Active Faults', url: "https://ulap-hazards.georisk.gov.ph/arcgis/rest/services/PHIVOLCSPublic/ActiveFault/MapServer/0", type: 'map' },
  { id: 'gr-shaking', name: 'GeoRisk: Ground Shaking', url: "https://ulap-hazards.georisk.gov.ph/arcgis/rest/services/PHIVOLCSPublic/GroundShaking/MapServer/0", type: 'map' },
  { id: 'gr-liquefaction', name: 'GeoRisk: Liquefaction', url: "https://ulap-hazards.georisk.gov.ph/arcgis/rest/services/PHIVOLCSPublic/Liquefaction/MapServer/0", type: 'map' },
  { id: 'gr-tsunami', name: 'GeoRisk: Tsunami Hazard', url: "https://ulap-hazards.georisk.gov.ph/arcgis/rest/services/PHIVOLCSPublic/Tsunami/MapServer/0", type: 'map' },
  { id: 'gr-surge', name: 'GeoRisk: Storm Surge', url: "https://ulap-hazards.georisk.gov.ph/arcgis/rest/services/PAGASAPublic/StormSurge/MapServer/0", type: 'map' },
];
