package com.example.cnpdrrmoeoc.data.remote

import okhttp3.ResponseBody
import retrofit2.http.GET

/**
 * Interface for fetching real-time alerts from PAGASA and PHIVOLCS.
 */
interface AlertApiService {
    
    // Official PHIVOLCS Earthquake RSS feed
    @GET("it_earthquake/earthquake_rss.xml")
    suspend fun getLatestEarthquakes(): ResponseBody

    // Placeholder for PAGASA - they often use specific bulletin URLs
    // e.g. http://bagong.pagasa.dost.gov.ph/rss/weather.xml
    @GET("rss/weather.xml")
    suspend fun getPagasaAlerts(): ResponseBody
}
