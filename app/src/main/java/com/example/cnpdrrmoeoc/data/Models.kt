package com.example.cnpdrrmoeoc.data

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "hazard_layers")
data class HazardLayer(
    @PrimaryKey val id: String,
    val name: String,
    val severity: String, // Low, Medium, High, Very High
    val type: String,     // Flood, Landslide, Storm Surge
    val geoJsonData: String // GeoJSON representation
)

@Entity(tableName = "critical_facilities")
data class CriticalFacility(
    @PrimaryKey val id: String,
    val name: String,
    val type: String, // Hospital, School, etc.
    val latitude: Double,
    val longitude: Double
)
