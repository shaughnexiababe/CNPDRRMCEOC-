package com.example.cnpdrrmoeoc.gis

import org.maplibre.geojson.FeatureCollection
import org.maplibre.geojson.Point
import org.maplibre.geojson.Polygon

/**
 * Extension to convert GeoJSON string to FeatureCollection using MapLibre's parser.
 */
fun String.toFeatureCollection(): FeatureCollection? {
    return try {
        FeatureCollection.fromJson(this)
    } catch (e: Exception) {
        null
    }
}

/**
 * Extracts all polygons from a FeatureCollection.
 */
fun FeatureCollection.extractPolygons(): List<Polygon> {
    return features()?.mapNotNull { it.geometry() as? Polygon } ?: emptyList()
}
