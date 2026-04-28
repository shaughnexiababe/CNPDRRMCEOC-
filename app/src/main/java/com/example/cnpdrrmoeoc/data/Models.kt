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

@Entity(tableName = "incident_reports")
data class IncidentReport(
    @PrimaryKey val id: String = java.util.UUID.randomUUID().toString(),
    val title: String,
    val description: String,
    val type: String,
    val municipality: String,
    val barangay: String?,
    val latitude: Double?,
    val longitude: Double?,
    val status: String = "reported",
    val priority: String = "medium",
    val createdDate: Long = System.currentTimeMillis()
)

data class User(
    val id: String,
    val name: String,
    val email: String,
    val role: UserRole
)

enum class UserRole {
    CITIZEN,
    EOC_PERSONNEL,
    ADMIN
}

data class AgencyAlert(
    val title: String,
    val description: String,
    val source: String,
    val url: String?,
    val timestamp: Long = System.currentTimeMillis()
)
