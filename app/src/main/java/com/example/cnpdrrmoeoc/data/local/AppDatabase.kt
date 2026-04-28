package com.example.cnpdrrmoeoc.data.local

import androidx.room.Database
import androidx.room.RoomDatabase
import com.example.cnpdrrmoeoc.data.HazardLayer
import com.example.cnpdrrmoeoc.data.CriticalFacility
import com.example.cnpdrrmoeoc.data.IncidentReport
import com.example.cnpdrrmoeoc.data.local.dao.IncidentDao

@Database(
    entities = [HazardLayer::class, CriticalFacility::class, IncidentReport::class],
    version = 1,
    exportSchema = false
)
abstract class AppDatabase : RoomDatabase() {
    abstract fun incidentDao(): IncidentDao
}
