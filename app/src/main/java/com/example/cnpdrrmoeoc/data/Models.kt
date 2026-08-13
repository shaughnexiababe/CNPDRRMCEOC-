package com.example.cnpdrrmoeoc.data

import androidx.room.Entity
import androidx.room.PrimaryKey
import com.google.firebase.Timestamp
import com.google.firebase.firestore.GeoPoint
import java.util.Date

@Entity(tableName = "hazard_layers")
data class HazardLayer(
    @PrimaryKey val id: String,
    val name: String,
    val severity: String, // Low, Moderate, High, Critical
    val type: String,     // Flood, Landslide, Storm Surge
    val geoJsonData: String
)

@Entity(tableName = "critical_facilities")
data class CriticalFacility(
    @PrimaryKey val id: String,
    val name: String,
    val type: String, // hospital, evacuation_center
    val latitude: Double,
    val longitude: Double,
    val status: String = "operational",
    val capacity: Int? = null,
    val current_occupancy: Int = 0
)

data class Incident(
    val id: String = "",
    val title: String = "",
    val description: String = "",
    val type: String = "",
    val municipality: String = "",
    val barangay: String = "",
    val location: GeoPoint? = null,
    val status: String = "reported", // reported, verified, dispatched, responding, resolved
    val priority: String = "medium",
    val reported_by_id: String = "",
    val created_at: Timestamp? = null,
    val updated_at: Timestamp? = null
)

data class User(
    val id: String = "",
    val full_name: String = "",
    val email: String = "",
    val role: String = "citizen",
    val municipality: String = "",
    val barangay: String = "",
    val last_checkin_at: Timestamp? = null,
    val created_at: Timestamp? = null
)

data class Unit(
    val id: String = "",
    val call_sign: String = "",
    val type: String = "",
    val status: String = "available",
    val current_location: GeoPoint? = null,
    val crew_lead_user_id: String = "",
    val last_location_update: Timestamp? = null
)

data class Assignment(
    val id: String = "",
    val incident_id: String = "",
    val unit_id: String = "",
    val dispatcher_id: String = "",
    val status: String = "assigned",
    val eta_minutes: Int = 0,
    val notes: String = "",
    val assigned_at: Timestamp? = null
)

data class HazardAlert(
    val id: String = "",
    val title: String = "",
    val description: String = "",
    val type: String = "",
    val severity: String = "moderate",
    val status: String = "active",
    val affected_municipality: String = "",
    val issued_at: Timestamp? = null,
    val expires_at: Timestamp? = null
)

data class CheckIn(
    val id: String = "",
    val user_id: String = "",
    val hazard_alert_id: String = "",
    val municipality: String = "",
    val barangay: String = "",
    val status: String = "safe",
    val created_at: Timestamp? = null
)

// Keeping these for legacy/compat if needed
enum class UserRole {
    CITIZEN,
    EOC_PERSONNEL,
    ADMIN;
    
    override fun toString(): String {
        return name.lowercase()
    }
}
