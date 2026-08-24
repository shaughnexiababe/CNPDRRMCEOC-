package com.example.cnpdrrmoeoc.data.remote

import okhttp3.ResponseBody
import retrofit2.http.GET

/**
 * Interface for fetching real-time alerts from agency feeds (PHIVOLCS, PAGASA).
 * Absolute URLs are used per-endpoint: Retrofit honors the full URL over the
 * instance baseUrl, which prevents mistakes like querying the PAGASA weather
 * bulletin on the PHIVOLCS host (that returned a 404 HTML page that was then
 * displayed to users as if it were an advisory).
 *
 * NOTE: these public feeds change occasionally; treat failures as silent
 * degradation and verify the endpoints during annual data refresh.
 */
interface AlertApiService {

    // Official PHIVOLCS Earthquake RSS feed
    @GET("https://www.phivolcs.dost.gov.ph/it_earthquake/earthquake_rss.xml")
    suspend fun getLatestEarthquakes(): ResponseBody

    // PAGASA public weather bulletin RSS
    @GET("https://bagong.pagasa.dost.gov.ph/rss/weather.xml")
    suspend fun getPagasaAlerts(): ResponseBody
}
