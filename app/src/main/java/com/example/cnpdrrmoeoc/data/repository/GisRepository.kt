package com.example.cnpdrrmoeoc.data.repository

import android.content.Context
import com.example.cnpdrrmoeoc.data.Assignment
import com.example.cnpdrrmoeoc.data.CheckIn
import com.example.cnpdrrmoeoc.data.HazardAlert
import com.example.cnpdrrmoeoc.data.Incident
import com.example.cnpdrrmoeoc.data.Unit
import com.example.cnpdrrmoeoc.data.User
import com.example.cnpdrrmoeoc.data.CriticalFacility
import com.example.cnpdrrmoeoc.data.ShiftNote
import com.example.cnpdrrmoeoc.data.local.dao.IncidentDao
import com.example.cnpdrrmoeoc.data.remote.AlertApiService
import com.example.cnpdrrmoeoc.data.remote.GeoRiskApiService
import com.example.cnpdrrmoeoc.data.remote.IncidentApiService
import com.google.firebase.Timestamp
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.Query
import com.google.firebase.firestore.FieldValue
import com.google.firebase.firestore.GeoPoint
import com.google.firebase.firestore.SetOptions
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
    private val incidentApi: IncidentApiService
) {
    /**
     * Real-time listener for incidents.
     * Scoped by municipality for citizens, unfiltered for EOC/Admin.
     */
    fun getIncidents(municipality: String? = null): Flow<List<Incident>> = callbackFlow {
        var query = firestore.collection("incidents")
            .orderBy("created_at", Query.Direction.DESCENDING)

        if (municipality != null) {
            query = query.whereEqualTo("municipality", municipality)
        }

        val subscription = query.addSnapshotListener { snapshot, error ->
            if (error != null) {
                close(error)
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
                close(error)
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
                    close(error)
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
                    close(error)
                    return@addSnapshotListener
                }
                if (snapshot != null) {
                    trySend(snapshot.toObjects(Assignment::class.java))
                }
            }
        awaitClose { subscription.remove() }
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
                transaction.update(unitRef, "status", "dispatched")
                transaction.update(unitRef, "updated_at", FieldValue.serverTimestamp())

                // 2. Update Incident
                transaction.update(incidentRef, "status", "dispatched")
                transaction.update(incidentRef, "updated_at", FieldValue.serverTimestamp())

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
                    "last_location_at", now,
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
            false
        }
    }

    /**
     * Advances the status of an assignment.
     * assigned -> enroute -> on_scene -> completed
     */
    suspend fun advanceAssignmentStatus(assignmentId: String, unitId: String, currentStatus: String): Boolean {
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
                
                transaction.update(assignmentRef, "status", nextStatus)
                transaction.update(assignmentRef, "updated_at", FieldValue.serverTimestamp())
                
                // Mirror status to unit
                transaction.update(unitRef, "status", nextStatus)
                
                // Special case: if completed, mark unit as available
                if (nextStatus == "completed") {
                    transaction.update(unitRef, "status", "available")
                    transaction.update(assignmentRef, "completed_at", FieldValue.serverTimestamp())
                }
            }.await()
            true
        } catch (e: Exception) {
            false
        }
    }

    /**
     * Submits a field incident report directly to Firestore.
     */
    suspend fun submitIncidentReport(incident: Incident): Boolean {
        return try {
            firestore.collection("incidents").add(incident).await()
            true
        } catch (e: Exception) {
            e.printStackTrace()
            false
        }
    }

    /**
     * Real-time listener for operational evacuation centers.
     */
    fun getEvacuationCenters(): Flow<List<CriticalFacility>> = callbackFlow {
        val subscription = firestore.collection("facilities")
            .whereEqualTo("type", "evacuation_center")
            .whereEqualTo("status", "operational")
            .addSnapshotListener { snapshot, error ->
                if (error != null) {
                    close(error)
                    return@addSnapshotListener
                }
                if (snapshot != null) {
                    trySend(snapshot.toObjects(CriticalFacility::class.java))
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
                    close(error)
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
                    close(error)
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
     * Updates the user document with last_checkin_at and writes a record to checkins collection.
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
                // 1. Create check-in record
                val checkInRef = firestore.collection("checkins").document()
                batch.set(checkInRef, checkIn)
                
                // 2. Update user doc with last check-in timestamp
                val userRef = firestore.collection("users").document(userId)
                batch.update(userRef, "last_checkin_at", now)
            }.await()
            true
        } catch (e: Exception) {
            e.printStackTrace()
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
            e.printStackTrace()
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
            e.printStackTrace()
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
            e.printStackTrace()
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
            e.printStackTrace()
            null
        }
    }
}
