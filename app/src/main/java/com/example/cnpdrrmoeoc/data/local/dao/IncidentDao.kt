package com.example.cnpdrrmoeoc.data.local.dao

import androidx.room.*
import com.example.cnpdrrmoeoc.data.IncidentReport
import kotlinx.coroutines.flow.Flow

@Dao
interface IncidentDao {
    @Query("SELECT * FROM incident_reports ORDER BY createdDate DESC")
    fun getAllIncidents(): Flow<List<IncidentReport>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertIncident(incident: IncidentReport)

    @Delete
    suspend fun deleteIncident(incident: IncidentReport)

    @Query("DELETE FROM incident_reports")
    suspend fun clearAll()
}
