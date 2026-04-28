# PDRRMO-CN Hazard Data Management Guide

Because official agency servers (GeoRiskPH/MGB/PAGASA) can be unreliable or blocked during active disasters, this application uses a **Local-First Data Model**. 

## Current Configuration
The dashboard is currently configured to load hazard data from the following local paths:
- `/public/data/hazards/flood_camnorte.json`
- `/public/data/hazards/landslide_camnorte.json`
- `/public/data/hazards/storm_surge_camnorte.json`
- `/public/data/hazards/active_faults_camnorte.json`

## How to Refresh Hazard Data Manually
If you need to update the hazard maps (e.g., once a year or after a major landscape change):

1. **Go to HazardHunterPH**: Visit [hazardhunter.georisk.gov.ph](https://hazardhunter.georisk.gov.ph/).
2. **Select Camarines Norte**: Use the search or boundary tool to isolate the province.
3. **Download/Export**: 
   - Look for the "Download" icon or "Layers" menu.
   - Choose **GeoJSON** as the export format.
   - Download for each category: Flood, Landslide, Storm Surge, and Fault Lines.
4. **Deploy to Application**:
   - Rename the downloaded files to match the names in `Current Configuration` above.
   - Place them in the `frontend/public/data/hazards/` directory of this project.
   - Restart the application (or refresh the browser).

## Why this is better
1. **Disaster Resilience**: The dashboard works 100% offline or during internet outages if the files are locally hosted.
2. **Speed**: Zero wait time for external ArcGIS queries.
3. **No CORS Errors**: Eliminates "Invalid URL" and "400 Bad Request" errors from agency servers.

---
*Generated for CNPDRRMO EOC Technical Staff*
