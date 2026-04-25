package com.example.cnpdrrmoeoc.gis

import org.maplibre.geojson.Point
import org.maplibre.geojson.Polygon
import org.maplibre.geojson.LineString

/**
 * Utility for performing geospatial risk analysis using MapLibre GeoJSON models.
 */
object RiskAnalytics {

    /**
     * Basic Point-in-Polygon (Ray Casting) algorithm.
     * Checks if a point (e.g., a household or hospital) is inside a hazard polygon.
     */
    fun isAtRisk(point: Point, polygon: Polygon): Boolean {
        val lng = point.longitude()
        val lat = point.latitude()
        
        // Handle single outer ring
        val outerRing = polygon.coordinates()?.firstOrNull() ?: return false
        
        var isInside = false
        var j = outerRing.size - 1
        for (i in outerRing.indices) {
            val pi = outerRing[i]
            val pj = outerRing[j]
            
            if (((pi.latitude() > lat) != (pj.latitude() > lat)) &&
                (lng < (pj.longitude() - pi.longitude()) * (lat - pi.latitude()) / (pj.latitude() - pi.latitude()) + pi.longitude())
            ) {
                isInside = !isInside
            }
            j = i
        }
        return isInside
    }

    /**
     * Calculates the number of facilities exposed to a specific hazard.
     */
    fun countExposedFacilities(facilityLocations: List<Point>, hazardPolygons: List<Polygon>): Int {
        var count = 0
        for (facility in facilityLocations) {
            for (hazard in hazardPolygons) {
                if (isAtRisk(facility, hazard)) {
                    count++
                    break
                }
            }
        }
        return count
    }
}
