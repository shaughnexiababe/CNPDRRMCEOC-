# CN-PDRRMO Decision Support System (DSS) Roadmap

## 1. Tech Stack Overview (Open Source Prioritized)
- **Mobile (Android):** Kotlin, Jetpack Compose, Hilt (DI), Room (Offline), Retrofit (API).
- **GIS Engine:** MapLibre SDK for Android (Open-source vector/raster maps).
- **Backend:** Python (FastAPI) or Node.js with PostgreSQL + PostGIS.
- **GIS Server:** GeoServer (for serving WMS/WFS layers).
- **Analytics:** Turf-java (on-device spatial analysis) or GeoPandas (backend).

## 2. Functional Milestones

### Phase 1: Foundation & Mapping
- [x] Initial Android project setup with Compose and Navigation.
- [x] Dependency injection with Hilt.
- [x] MapLibre integration for base map visualization.
- [x] Basic GeoJSON layer management.
- [x] Hardcoded Bounding Boxes for all 12 municipalities in Camarines Norte.
- [ ] Administrative boundary overlays (Provinces, Municipalities, Barangays) via GeoJSON.

### Phase 2: Interoperability & External Data
- [x] Retrofit API service for HazardHunterPH/GeoRiskPH.
- [x] Alert API service for PAGASA/PHIVOLCS RSS feeds.
- [ ] Integration with HazardHunterPH API for real-time hazard assessment.
- [ ] PAGASA/PHIVOLCS RSS/API feeds integration for weather and seismic alerts.
- [x] Infrastructure for Offline Tiling (MBTiles integration).
- [ ] Support for GeoJSON, KML, and Shapefile imports.

### Phase 3: Risk & Anticipatory Analytics
- [ ] **Intersection Analysis:** Algorithm to calculate exposed households by intersecting hazard polygons with critical facility points.
- [ ] **Predictive Modeling:** Module to simulate flood scenarios based on forecasted rainfall data.

### Phase 4: User Experience (Tiered Dashboard)
- [ ] **Strategic View:** Province-wide summary charts and policy metrics.
- [ ] **Operational View:** Real-time GIS monitoring with incident overlays.
- [ ] **Field View:** Offline-capable forms for damage assessment and incident reporting.

### Phase 5: Security & Scalability
- [ ] Role-Based Access Control (RBAC) for different user tiers.
- [ ] Offline Map Tiling for low-connectivity areas in Camarines Norte.
- [ ] Cloud synchronization and automated backups.

## 3. Project Assessment
- **Problematic Code:** None detected in current skeleton; project was an empty template.
- **Fixed Issues:** Upgraded project to use modern Android components (Compose, Hilt, KSP) and established a scalable architecture.
- **Conflicts:** Resolved initial Gradle sync issues caused by version mismatches and missing Kotlin plugins.
