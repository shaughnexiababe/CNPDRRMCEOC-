package com.example.cnpdrrmoeoc.data.repository

import com.example.cnpdrrmoeoc.data.remote.AlertApiService
import com.example.cnpdrrmoeoc.data.remote.GeoRiskApiService
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class GisRepository @Inject constructor(
    private val geoRiskApi: GeoRiskApiService,
    private val alertApi: AlertApiService
) {
    /**
     * Fetches Flood susceptibility from MGB ArcGIS for Camarines Norte.
     */
    suspend fun fetchFloodData(bbox: String? = null): String? {
        return try {
            val response = geoRiskApi.queryFloodHazard(bbox = bbox)
            response.string()
        } catch (e: Exception) {
            e.printStackTrace()
            null
        }
    }

    /**
     * Fetches Landslide susceptibility from MGB ArcGIS for Camarines Norte.
     */
    suspend fun fetchLandslideData(bbox: String? = null): String? {
        return try {
            val response = geoRiskApi.queryLandslideHazard(bbox = bbox)
            response.string()
        } catch (e: Exception) {
            e.printStackTrace()
            null
        }
    }

    /**
     * Fetches latest Earthquake alerts from PHIVOLCS RSS.
     */
    suspend fun fetchLatestEarthquakes(): String? {
        return try {
            val response = alertApi.getLatestEarthquakes()
            response.string()
        } catch (e: Exception) {
            e.printStackTrace()
            null
        }
    }

    /**
     * Fetches latest weather bulletins from PAGASA (Placeholder/GMA fallback).
     */
    suspend fun fetchPagasaAlerts(): String? {
        return try {
            val response = alertApi.getPagasaAlerts()
            response.string()
        } catch (e: Exception) {
            e.printStackTrace()
            null
        }
    }
}
