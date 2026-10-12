package com.example.cnpdrrmoeoc.data

import androidx.room.Entity
import androidx.room.PrimaryKey
import com.google.firebase.Timestamp
import com.google.firebase.firestore.GeoPoint

/**
 * A critical facility (hospital, evacuation center, etc.) in the
 * shared "facilities" Firestore collection.
 *
 * NOTE: all fields must have default values — Firestore
 * deserialized objects require an effective no-arg constructor.
 * The previous CriticalFacility (a Room @Entity with non-default
 * fields) crashed at runtime with "could not find a no-arg
 * constructor" whenever the evacuation center listener received data.
 */
data class Facility(
    val id: String = "",
    val name: String = "",
    val type: String = "", // hospital, evacuation_center, fire_station...
    val municipality: String = "",
    val barangay: String = "",
    val latitude: Double = 0.0,
    val longitude: Double = 0.0,
    val status: String = "operational",
    val capacity: Int? = null,
    val current_occupancy: Int = 0,
    val contact_person: String = ""
)

data class Incident(
    val id: String = "",
    val title: String = "",
    val description: String = "",
    val type: String = "",
    val municipality: String = "",
    val barangay: String = "",
    val approx_latitude: Double? = null,
    val approx_longitude: Double? = null,
    val photo_count: Int = 0,
    val status: String = "reported", // reported, verified, dispatched, responding, resolved
    val priority: String = "medium",
    val reported_by_id: String = "",
    val schema_version: Int = 2,
    val created_at: Timestamp? = null,
    val updated_at: Timestamp? = null
)

data class IncidentPrivate(
    val id: String = "",
    val reporter_name: String = "",
    val reporter_contact: String = "",
    val reported_by_name: String = "",
    val latitude: Double? = null,
    val longitude: Double? = null,
    val location: GeoPoint? = null,
    val photo_urls: List<String> = emptyList(),
    val reported_by_id: String = "",
    val schema_version: Int = 2,
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
    val status: String = "available", // available, dispatched
    val current_location: GeoPoint? = null,
    val crew_lead_user_id: String = "",
    val last_location_update: Timestamp? = null
)

data class Assignment(
    val id: String = "",
    val incident_id: String = "",
    val unit_id: String = "",
    val dispatcher_id: String = "",
    val status: String = "assigned", // assigned, enroute, on_scene, completed
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
    val status: String = "active", // active, monitoring, resolved, expired
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

/** Parsed external advisory (PHIVOLCS / PAGASA feeds). */
data class AgencyAlert(
    val title: String = "",
    val description: String = "",
    val source: String = "",
    val url: String = ""
)

/**
 * Offline outbox for incident reports.
 * When a field report fails to sync (no connectivity), it is queued in
 * Room and replayed by GisRepository.syncPendingReports() once the
 * network returns. This is the ONLY thing Room is used for — Firestore
 * is the system of record for everything else.
 */
@Entity(tableName = "incident_reports")
data class IncidentReport(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val remoteId: String = "",
    val title: String = "",
    val description: String = "",
    val type: String = "",
    val municipality: String = "",
    val barangay: String = "",
    val reporterName: String = "",
    val reporterContact: String = "",
    val latitude: Double? = null,
    val longitude: Double? = null,
    val reportedById: String = "",
    val photoUrls: String = "",
    val createdDate: Long = System.currentTimeMillis()
)
