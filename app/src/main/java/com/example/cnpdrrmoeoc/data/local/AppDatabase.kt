package com.example.cnpdrrmoeoc.data.local

import androidx.room.Database
import androidx.room.RoomDatabase
import com.example.cnpdrrmoeoc.data.IncidentReport
import com.example.cnpdrrmoeoc.data.local.dao.IncidentDao

@Database(
    entities = [IncidentReport::class],
    version = 2, // v2: photoUrls column on the offline outbox
    exportSchema = false
)
abstract class AppDatabase : RoomDatabase() {
    abstract fun incidentDao(): IncidentDao
}
