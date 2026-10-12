package com.example.cnpdrrmoeoc.data.local

import androidx.room.Database
import androidx.room.RoomDatabase
import androidx.room.migration.Migration
import androidx.sqlite.db.SupportSQLiteDatabase
import com.example.cnpdrrmoeoc.data.IncidentReport
import com.example.cnpdrrmoeoc.data.local.dao.IncidentDao

@Database(
    entities = [IncidentReport::class],
    version = 3, // v3: remoteId, reporterName, reporterContact for PII split outbox
    exportSchema = false,
)
abstract class AppDatabase : RoomDatabase() {
    abstract fun incidentDao(): IncidentDao

    companion object {
        val MIGRATION_1_2 = object : Migration(1, 2) {
            override fun migrate(db: SupportSQLiteDatabase) {
                db.execSQL("ALTER TABLE incident_reports ADD COLUMN photoUrls TEXT NOT NULL DEFAULT ''")
            }
        }

        val MIGRATION_2_3 = object : Migration(2, 3) {
            override fun migrate(db: SupportSQLiteDatabase) {
                db.execSQL("ALTER TABLE incident_reports ADD COLUMN remoteId TEXT NOT NULL DEFAULT ''")
                db.execSQL("ALTER TABLE incident_reports ADD COLUMN reporterName TEXT NOT NULL DEFAULT ''")
                db.execSQL("ALTER TABLE incident_reports ADD COLUMN reporterContact TEXT NOT NULL DEFAULT ''")
            }
        }
    }
}
