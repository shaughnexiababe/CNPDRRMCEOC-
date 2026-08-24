package com.example.cnpdrrmoeoc.di

import com.example.cnpdrrmoeoc.data.remote.AlertApiService
import com.example.cnpdrrmoeoc.data.remote.GeoRiskApiService
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit
import okhttp3.OkHttpClient
import javax.inject.Named
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object NetworkModule {

    @Provides
    @Singleton
    fun provideOkHttp(): OkHttpClient =
        OkHttpClient.Builder()
            .connectTimeout(15, TimeUnit.SECONDS)
            .readTimeout(20, TimeUnit.SECONDS)
            .build()

    @Provides
    @Singleton
    @Named("MgbRetrofit")
    fun provideMgbRetrofit(okHttpClient: OkHttpClient): Retrofit {
        return Retrofit.Builder()
            .baseUrl("https://controlmap.mgb.gov.ph/arcgis/rest/services/")
            .client(okHttpClient)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
    }

    @Provides
    @Singleton
    @Named("AgencyRetrofit")
    fun provideAgencyRetrofit(okHttpClient: OkHttpClient): Retrofit {
        // Base URL is a placeholder; AlertApiService uses absolute URLs.
        return Retrofit.Builder()
            .baseUrl("https://www.phivolcs.dost.gov.ph/")
            .client(okHttpClient)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
    }

    @Provides
    @Singleton
    fun provideGeoRiskApiService(@Named("MgbRetrofit") retrofit: Retrofit): GeoRiskApiService {
        return retrofit.create(GeoRiskApiService::class.java)
    }

    @Provides
    @Singleton
    fun provideAlertApiService(@Named("AgencyRetrofit") retrofit: Retrofit): AlertApiService {
        return retrofit.create(AlertApiService::class.java)
    }
}
