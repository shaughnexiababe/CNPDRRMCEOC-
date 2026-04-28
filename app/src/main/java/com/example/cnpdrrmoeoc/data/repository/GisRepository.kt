package com.example.cnpdrrmoeoc.data.repository

import android.content.Context
import com.example.cnpdrrmoeoc.data.IncidentReport
import com.example.cnpdrrmoeoc.data.local.dao.IncidentDao
import com.example.cnpdrrmoeoc.data.remote.AlertApiService
import com.example.cnpdrrmoeoc.data.remote.GeoRiskApiService
import com.example.cnpdrrmoeoc.data.remote.IncidentApiService
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class GisRepository @Inject constructor(
    @ApplicationContext private val context: Context,
    private val incidentDao: IncidentDao,
    private val geoRiskApi: GeoRiskApiService,
    private val alertApi: AlertApiService,
    private val incidentApi: IncidentApiService
) {
    /**
     * Submits a field incident report. Saves locally first (Offline-Sync logic).
     */
    suspend fun submitIncidentReport(report: IncidentReport): Boolean {
        // 1. Save to local DB immediately for persistence
        incidentDao.insertIncident(report)

        // 2. Attempt to sync with production server
        return try {
            val response = incidentApi.submitReport(report)
            if (response.isSuccessful) {
                // If successful, we could mark as synced or keep as local record
                true
            } else false
        } catch (e: Exception) {
            e.printStackTrace()
            false // Remains in local DB for later retry
        }
    }

    private fun loadFromAssets(fileName: String): String? {
        return try {
            context.assets.open(fileName).bufferedReader().use { it.readText() }
        } catch (e: Exception) {
            null
        }
    }

    /**
     * Fetches Flood susceptibility. Mirrors web logic: Local-First.
     */
    suspend fun fetchFloodData(bbox: String? = null): String? {
        // Try local file first (Mirroring Web App "Sync-and-Cache" / Local-First)
        val local = loadFromAssets("hazards/flood_camnorte.json")
        if (local != null) return local

        return try {
            val response = geoRiskApi.queryFloodHazard(bbox = bbox)
            response.string()
        } catch (e: Exception) {
            e.printStackTrace()
            null
        }
    }

    /**
     * Fetches Landslide susceptibility.
     */
    suspend fun fetchLandslideData(bbox: String? = null): String? {
        val local = loadFromAssets("hazards/landslide_camnorte.json")
        if (local != null) return local

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
