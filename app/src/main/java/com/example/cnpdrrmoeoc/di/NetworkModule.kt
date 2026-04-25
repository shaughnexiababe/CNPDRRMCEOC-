package com.example.cnpdrrmoeoc.di

import com.example.cnpdrrmoeoc.data.remote.AlertApiService
import com.example.cnpdrrmoeoc.data.remote.GeoRiskApiService
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import javax.inject.Named
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object NetworkModule {

    @Provides
    @Singleton
    @Named("MgbRetrofit")
    fun provideMgbRetrofit(): Retrofit {
        return Retrofit.Builder()
            .baseUrl("https://controlmap.mgb.gov.ph/arcgis/rest/services/") 
            .addConverterFactory(GsonConverterFactory.create())
            .build()
    }

    @Provides
    @Singleton
    @Named("PhivolcsRetrofit")
    fun providePhivolcsRetrofit(): Retrofit {
        return Retrofit.Builder()
            .baseUrl("https://www.phivolcs.dost.gov.ph/") 
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
    fun provideAlertApiService(@Named("PhivolcsRetrofit") retrofit: Retrofit): AlertApiService {
        return retrofit.create(AlertApiService::class.java)
    }
}
