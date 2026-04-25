package com.example.cnpdrrmoeoc.data.remote

import okhttp3.ResponseBody
import retrofit2.http.GET
import retrofit2.http.Path
import retrofit2.http.Query

/**
 * Interface for fetching hazard data from MGB (Mines and Geosciences Bureau) 
 * ArcGIS REST Services.
 */
interface GeoRiskApiService {
    
    /**
     * Queries the MGB Flood Susceptibility Layer.
     * Defaulting to filter for Camarines Norte.
     */
    @GET("MGBPublic/Flood/MapServer/0/query")
    suspend fun queryFloodHazard(
        @Query("where") where: String = "PROVINCE = 'CAMARINES NORTE'",
        @Query("outFields") fields: String = "*",
        @Query("f") format: String = "geojson",
        @Query("geometry") bbox: String? = null,
        @Query("geometryType") geometryType: String = "esriGeometryEnvelope"
    ): ResponseBody

    /**
     * Queries the MGB Rain-Induced Landslide Susceptibility Layer.
     */
    @GET("MGBPublic/RainInducedLandslide/MapServer/0/query")
    suspend fun queryLandslideHazard(
        @Query("where") where: String = "PROVINCE = 'CAMARINES NORTE'",
        @Query("outFields") fields: String = "*",
        @Query("f") format: String = "geojson",
        @Query("geometry") bbox: String? = null,
        @Query("geometryType") geometryType: String = "esriGeometryEnvelope"
    ): ResponseBody
}
