package com.example.cnpdrrmoeoc.data.repository

import android.content.Context
import android.util.Log
import com.example.cnpdrrmoeoc.data.Assignment
import com.example.cnpdrrmoeoc.data.CheckIn
import com.example.cnpdrrmoeoc.data.HazardAlert
import com.example.cnpdrrmoeoc.data.Incident
import com.example.cnpdrrmoeoc.data.IncidentReport
import com.example.cnpdrrmoeoc.data.Unit
import com.example.cnpdrrmoeoc.data.User
import com.example.cnpdrrmoeoc.data.Facility
import com.example.cnpdrrmoeoc.data.ShiftNote
import com.example.cnpdrrmoeoc.data.local.dao.IncidentDao
import com.example.cnpdrrmoeoc.data.remote.AlertApiService
import com.example.cnpdrrmoeoc.data.remote.GeoRiskApiService
import com.example.cnpdrrmoeoc.data.remote.NotifyApi
import com.google.firebase.Timestamp
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.Query
import com.google.firebase.firestore.FieldValue
import com.google.firebase.firestore.GeoPoint
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.tasks.await
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class GisRepository @Inject constructor(
    @ApplicationContext private val context: Context,
    private val firestore: FirebaseFirestore,
    private val incidentDao: IncidentDao,
    private val geoRiskApi: GeoRiskApiService,
    private val alertApi: AlertApiService,
    private val notifyApi: NotifyApi,
) {
    companion object { private const val TAG = "GisRepository" }

    /**
     * Real-time listener for incidents.
     * Scoped by municipality for citizens, unfiltered for EOC/Admin.
     * Listener errors degrade to an empty list instead of propagating an
     * exception that would crash the collecting StateFlows.
     */
    fun getIncidents(municipality: String? = null): Flow<List<Incident>> = callbackFlow {
        var query = firestore.collection("incidents")
            .orderBy("created_at", Query.Direction.DESCENDING)

        if (municipality != null) {
            query = query.whereEqualTo("municipality", municipality)
        }

        val subscription = query.addSnapshotListener { snapshot, error ->
            if (error != null) {
                Log.w(TAG, "Incident listener error", error)
                trySend(emptyList())
                return@addSnapshotListener
            }
            if (snapshot != null) {
                val incidents = snapshot.toObjects(Incident::class.java)
                trySend(incidents)
            }
        }

        awaitClose { subscription.remove() }
    }

    /**
     * Real-time listener for active hazard alerts.
     */
    fun getActiveAlerts(municipality: String? = null): Flow<List<HazardAlert>> = callbackFlow {
        var query = firestore.collection("hazard_alerts")
            .whereEqualTo("status", "active")
            .orderBy("issued_at", Query.Direction.DESCENDING)

        if (municipality != null) {
            query = query.whereEqualTo("affected_municipality", municipality)
        }

        val subscription = query.addSnapshotListener { snapshot, error ->
            if (error != null) {
                Log.w(TAG, "Alert listener error", error)
                trySend(emptyList())
                return@addSnapshotListener
            }
            if (snapshot != null) {
                val alerts = snapshot.toObjects(HazardAlert::class.java)
                trySend(alerts)
            }
        }

        awaitClose { subscription.remove() }
    }

    /**
     * Real-time listener for units.
     */
    fun getUnits(): Flow<List<Unit>> = callbackFlow {
        val subscription = firestore.collection("units")
            .addSnapshotListener { snapshot, error ->
                if (error != null) {
                    Log.w(TAG, "Unit listener error", error)
                    trySend(emptyList())
                    return@addSnapshotListener
                }
                if (snapshot != null) {
                    trySend(snapshot.toObjects(Unit::class.java))
                }
            }
        awaitClose { subscription.remove() }
    }

    /**
     * Real-time listener for active assignments.
     */
    fun getActiveAssignments(): Flow<List<Assignment>> = callbackFlow {
        val subscription = firestore.collection("assignments")
            .whereIn("status", listOf("assigned", "enroute", "on_scene"))
            .addSnapshotListener { snapshot, error ->
                if (error != null) {
                    Log.w(TAG, "Assignment listener error", error)
                    trySend(emptyList())
                    return@addSnapshotListener
                }
                if (snapshot != null) {
                    trySend(snapshot.toObjects(Assignment::class.java))
                }
            }
        awaitClose { subscription.remove() }
    }

    /**
     * Marks an incident as verified by EOC personnel.
     * (Referenced by OperationsCenterView / GisViewModel.verifyIncident —
     * was missing, which broke the build.)
     */
    suspend fun verifyIncident(incidentId: String, verifierId: String): Boolean {
        return try {
            firestore.collection("incidents").document(incidentId).update(
                mapOf(
                    "status" to "verified",
                    "verified_by" to verifierId,
                    "updated_at" to FieldValue.serverTimestamp()
                )
            ).await()
            true
        } catch (e: Exception) {
            Log.e(TAG, "verifyIncident failed", e)
            false
        }
    }

    /**
     * Marks an incident as resolved (EOC personnel).
     */
    suspend fun resolveIncident(incidentId: String): Boolean {
        return try {
            firestore.collection("incidents").document(incidentId).update(
                mapOf(
                    "status" to "resolved",
                    "updated_at" to FieldValue.serverTimestamp()
                )
            ).await()
            true
        } catch (e: Exception) {
            Log.e(TAG, "resolveIncident failed", e)
            false
        }
    }

    /**
     * Atomic dispatch transaction.
     * Updates unit status, incident status, and creates an assignment.
     */
    suspend fun dispatchUnit(
        incidentId: String,
        unitId: String,
        dispatcherId: String,
        etaMinutes: Int,
        notes: String
    ): Result<Assignment> {
        return try {
            val assignment = firestore.runTransaction { transaction ->
                val unitRef = firestore.collection("units").document(unitId)
                val incidentRef = firestore.collection("incidents").document(incidentId)
                val assignmentRef = firestore.collection("assignments").document()

                val unitSnap = transaction.get(unitRef)
                if (!unitSnap.exists()) throw Exception("Unit not found")
                if (unitSnap.getString("status") != "available") {
                    throw Exception("Unit is no longer available")
                }

                // 1. Update Unit
                transaction.update(unitRef,
                    "status", "dispatched",
                    "updated_at", FieldValue.serverTimestamp())

                // 2. Update Incident
                transaction.update(incidentRef,
                    "status", "dispatched",
                    "updated_at", FieldValue.serverTimestamp())

                // 3. Create Assignment
                val assignmentData = Assignment(
                    id = assignmentRef.id,
                    incident_id = incidentId,
                    unit_id = unitId,
                    dispatcher_id = dispatcherId,
                    status = "assigned",
                    eta_minutes = etaMinutes,
                    notes = notes,
                    assigned_at = Timestamp.now()
                )
                transaction.set(assignmentRef, assignmentData)
                assignmentData
            }.await()
            Result.success(assignment)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * Updates a unit's location and records it in history.
     * Writes to units/{unitId} and units/{unitId}/location_history/ in a batch.
     * Field names match the `Unit` model (previously wrote
     * `last_location_at` while the model reads `last_location_update`).
     */
    suspend fun updateUnitLocation(unitId: String, lat: Double, lon: Double): Boolean {
        return try {
            val point = GeoPoint(lat, lon)
            val now = Timestamp.now()

            val unitRef = firestore.collection("units").document(unitId)
            val historyRef = unitRef.collection("location_history").document()

            firestore.runBatch { batch ->
                // 1. Update latest on parent
                batch.update(unitRef,
                    "current_location", point,
                    "last_location_update", now,
                    "updated_at", FieldValue.serverTimestamp()
                )

                // 2. Record in subcollection
                batch.set(historyRef, mapOf(
                    "location" to point,
                    "recorded_at" to now
                ))
            }.await()
            true
        } catch (e: Exception) {
            Log.e(TAG, "updateUnitLocation failed", e)
            false
        }
    }

    /**
     * Advances the status of an assignment.
     * assigned -> enroute -> on_scene -> completed
     *
     * The unit stays "dispatched" for the whole mission (enroute/on_scene
     * are ASSIGNMENT statuses — the old code wrote assignment statuses into
     * units.status twice and corrupted the dispatcher's availability list).
     * Incident moves to "responding" once a crew is on scene.
     */
    suspend fun advanceAssignmentStatus(
        assignmentId: String,
        unitId: String,
        currentStatus: String,
        incidentId: String? = null
    ): Boolean {
        val nextStatus = when (currentStatus) {
            "assigned" -> "enroute"
            "enroute" -> "on_scene"
            "on_scene" -> "completed"
            else -> return false
        }

        return try {
            firestore.runTransaction { transaction ->
                val assignmentRef = firestore.collection("assignments").document(assignmentId)
                val unitRef = firestore.collection("units").document(unitId)

                transaction.update(assignmentRef,
                    "status", nextStatus,
                    "updated_at", FieldValue.serverTimestamp())

                if ((nextStatus == "on_scene") && (incidentId != null)) {
                    transaction.update(
                        firestore.collection("incidents").document(incidentId),
                        "status", "responding",
                        "updated_at", FieldValue.serverTimestamp()
                    )
                }

                if (nextStatus == "completed") {
                    transaction.update(unitRef,
                        "status", "available",
                        "updated_at", FieldValue.serverTimestamp())
                    transaction.update(assignmentRef, "completed_at", FieldValue.serverTimestamp())
                }
            }.await()
            true
        } catch (e: Exception) {
            Log.e(TAG, "advanceAssignmentStatus failed", e)
            false
        }
    }

    /**
     * Submits a field incident report.
     * On failure (typically offline), the report is queued into the Room
     * outbox and replayed by [syncPendingReports]; returns false so the UI
     * can tell the user the report was saved for later delivery.
     */
    suspend fun submitIncidentReport(incident: Incident): Boolean {
        return try {
            val ref = firestore.collection("incidents").add(incident).await()
            // Critical/SOS reports notify EOC staff devices via the free
            // Vercel API route (replaces the Firestore-trigger Cloud Function).
            if (incident.type == "sos" || incident.priority == "critical") {
                notifyApi.notifyCriticalIncident(ref.id)
            }
            true
        } catch (e: Exception) {
            Log.w(TAG, "Online submit failed — queueing offline", e)
            queueOfflineReport(incident)
            false
        }
    }

    private suspend fun queueOfflineReport(incident: Incident) {
        try {
            incidentDao.insertIncident(
                IncidentReport(
                    title = incident.title,
                    description = incident.description,
                    type = incident.type,
                    municipality = incident.municipality,
                    barangay = incident.barangay,
                    latitude = incident.latitude,
                    longitude = incident.longitude,
                    reportedById = incident.reported_by_id,
                    // Joined inline data-URL photos (newline-separated; data URLs
                    // never contain newlines). Guards the doc from exceeding
                    // Firestore's 1MiB limit on replay.
                    photoUrls = incident.photo_urls.joinToString("\n").take(780_000),
                    createdDate = System.currentTimeMillis()
                )
            )
        } catch (e: Exception) {
            Log.e(TAG, "Failed to queue offline report", e)
        }
    }

    /**
     * Replays queued offline reports to Firestore. Safe to call at login /
     * on connectivity restore.
     */
    suspend fun syncPendingReports(): Int {
        val pending = try { incidentDao.getPendingOnce() } catch (_: Exception) { emptyList() }
        var synced = 0
        for (row in pending) {
            try {
                val incident = Incident(
                    title = row.title,
                    description = row.description,
                    type = row.type,
                    municipality = row.municipality,
                    barangay = row.barangay,
                    latitude = row.latitude,
                    longitude = row.longitude,
                    location = if (row.latitude != null && row.longitude != null)
                        GeoPoint(row.latitude, row.longitude) else null,
                    status = "reported",
                    priority = if (row.type == "sos") "critical" else "medium",
                    reported_by_id = row.reportedById,
                    photo_urls = row.photoUrls.split("\n").asSequence().filter { it.isNotBlank() }.take(2).toList(),
                    created_at = Timestamp(java.util.Date(row.createdDate)),
                    updated_at = Timestamp.now()
                )
                firestore.collection("incidents").add(incident).await()
                incidentDao.deleteById(row.id)
                synced++
            } catch (e: Exception) {
                // Still offline or rules rejected — leave the row queued.
                break
            }
        }
        return synced
    }

    /**
     * Real-time listener for operational evacuation centers.
     * Maps to the plain `Facility` model (Firestore needs defaults on every
     * field) and stamps each doc with its Firestore document id.
     */
    fun getEvacuationCenters(): Flow<List<Facility>> = callbackFlow {
        val subscription = firestore.collection("facilities")
            .whereEqualTo("type", "evacuation_center")
            .whereEqualTo("status", "operational")
            .addSnapshotListener { snapshot, error ->
                if (error != null) {
                    Log.w(TAG, "Evac center listener error", error)
                    trySend(emptyList())
                    return@addSnapshotListener
                }
                if (snapshot != null) {
                    val centers = snapshot.documents.mapNotNull { doc ->
                        doc.toObject(Facility::class.java)?.copy(id = doc.id)
                    }
                    trySend(centers)
                }
            }
        awaitClose { subscription.remove() }
    }

    /**
     * Real-time listener for shift notes.
     */
    fun getShiftNotes(): Flow<List<ShiftNote>> = callbackFlow {
        val subscription = firestore.collection("shift_notes")
            .orderBy("created_at", Query.Direction.DESCENDING)
            .limit(20)
            .addSnapshotListener { snapshot, error ->
                if (error != null) {
                    Log.w(TAG, "Shift notes listener error", error)
                    trySend(emptyList())
                    return@addSnapshotListener
                }
                if (snapshot != null) {
                    trySend(snapshot.toObjects(ShiftNote::class.java))
                }
            }
        awaitClose { subscription.remove() }
    }

    /**
     * Adds a new shift note.
     */
    suspend fun addShiftNote(note: ShiftNote): Boolean {
        return try {
            firestore.collection("shift_notes").add(note).await()
            true
        } catch (e: Exception) {
            false
        }
    }

    /**
     * Real-time listener for all users (Admin only).
     */
    fun getAllUsers(): Flow<List<User>> = callbackFlow {
        val subscription = firestore.collection("users")
            .orderBy("created_at", Query.Direction.DESCENDING)
            .addSnapshotListener { snapshot, error ->
                if (error != null) {
                    Log.w(TAG, "Users listener error", error)
                    trySend(emptyList())
                    return@addSnapshotListener
                }
                if (snapshot != null) {
                    trySend(snapshot.toObjects(User::class.java).mapIndexed { index, user ->
                        user.copy(id = snapshot.documents[index].id)
                    })
                }
            }
        awaitClose { subscription.remove() }
    }

    /**
     * Updates a user's role.
     */
    suspend fun updateUserRole(userId: String, newRole: String): Boolean {
        return try {
            firestore.collection("users").document(userId).update("role", newRole).await()
            true
        } catch (e: Exception) {
            false
        }
    }

    /**
     * Records a citizen "I'm safe" check-in.
     */
    suspend fun checkInSafe(userId: String, alertId: String, municipality: String, barangay: String): Boolean {
        return try {
            val now = Timestamp.now()
            val checkIn = CheckIn(
                user_id = userId,
                hazard_alert_id = alertId,
                municipality = municipality,
                barangay = barangay,
                status = "safe",
                created_at = now
            )

            firestore.runBatch { batch ->
                val checkInRef = firestore.collection("checkins").document()
                batch.set(checkInRef, checkIn)

                val userRef = firestore.collection("users").document(userId)
                batch.update(userRef, "last_checkin_at", now)
            }.await()
            true
        } catch (e: Exception) {
            Log.e(TAG, "checkInSafe failed", e)
            false
        }
    }

    private fun loadFromAssets(fileName: String): String? {
        return try {
            context.assets.open(fileName).bufferedReader().use { it.readText() }
        } catch (e: Exception) {
            null
        }
    }

    /**
     * Fetches Flood susceptibility. Mirrors web logic: Local-First.
     */
    suspend fun fetchFloodData(bbox: String? = null): String? {
        val local = loadFromAssets("hazards/flood_camnorte.json")
        if (local != null) return local

        return try {
            val response = geoRiskApi.queryFloodHazard(bbox = bbox)
            response.string()
        } catch (e: Exception) {
            Log.w(TAG, "fetchFloodData remote failed", e)
            null
        }
    }

    /**
     * Fetches Landslide susceptibility.
     */
    suspend fun fetchLandslideData(bbox: String? = null): String? {
        val local = loadFromAssets("hazards/landslide_camnorte.json")
        if (local != null) return local

        return try {
            val response = geoRiskApi.queryLandslideHazard(bbox = bbox)
            response.string()
        } catch (e: Exception) {
            Log.w(TAG, "fetchLandslideData remote failed", e)
            null
        }
    }

    /**
     * Fetches latest Earthquake alerts from PHIVOLCS RSS.
     */
    suspend fun fetchLatestEarthquakes(): String? {
        return try {
            val response = alertApi.getLatestEarthquakes()
            response.string()
        } catch (e: Exception) {
            null
        }
    }

    /**
     * Fetches latest weather bulletins from PAGASA.
     */
    suspend fun fetchPagasaAlerts(): String? {
        return try {
            val response = alertApi.getPagasaAlerts()
            response.string()
        } catch (e: Exception) {
            null
        }
    }
}
