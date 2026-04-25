package com.example.cnpdrrmoeoc.data.remote

import com.example.cnpdrrmoeoc.data.IncidentReport
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.POST

interface IncidentApiService {
    @POST("api/entities/IncidentReport")
    suspend fun submitReport(@Body report: IncidentReport): Response<IncidentReport>
}
