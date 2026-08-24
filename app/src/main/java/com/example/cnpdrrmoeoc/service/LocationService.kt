package com.example.cnpdrrmoeoc.service

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.IBinder
import android.os.Looper
import androidx.core.app.NotificationCompat
import com.example.cnpdrrmoeoc.R
import com.example.cnpdrrmoeoc.data.repository.GisRepository
import com.google.android.gms.location.*
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import javax.inject.Inject

@AndroidEntryPoint
class LocationService : Service() {

    @Inject
    lateinit var repository: GisRepository

    private lateinit var fusedLocationClient: FusedLocationProviderClient
    private lateinit var locationCallback: LocationCallback
    private val serviceScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    companion object {
        private const val CHANNEL_ID = "location_tracking_channel"
        private const val NOTIFICATION_ID = 1001
        
        const val ACTION_START = "ACTION_START"
        const val ACTION_STOP = "ACTION_STOP"
        const val EXTRA_UNIT_ID = "EXTRA_UNIT_ID"
        const val EXTRA_ASSIGNMENT_TITLE = "EXTRA_ASSIGNMENT_TITLE"
    }

    override fun onCreate() {
        super.onCreate()
        fusedLocationClient = LocationServices.getFusedLocationProviderClient(this)
        createNotificationChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_START -> {
                val unitId = intent.getStringExtra(EXTRA_UNIT_ID)
                val assignmentTitle = intent.getStringExtra(EXTRA_ASSIGNMENT_TITLE) ?: "Active Assignment"
                if (unitId != null) {
                    try {
                        startForeground(NOTIFICATION_ID, createNotification(assignmentTitle))
                    } catch (se: SecurityException) {
                        // FOREGROUND_SERVICE_LOCATION permission absent (or FGS
                        // start restriction hit). Degrade gracefully instead of crashing.
                        stopSelf()
                        return START_NOT_STICKY
                    }
                    requestLocationUpdates(unitId)
                } else {
                    // Defensive: never run as a zombie service with no unit to track.
                    stopSelf()
                    return START_NOT_STICKY
                }
            }
            ACTION_STOP -> {
                stopForeground(STOP_FOREGROUND_REMOVE)
                stopSelf()
            }
        }
        return START_STICKY
    }

    private fun requestLocationUpdates(unitId: String) {
        val request = LocationRequest.Builder(Priority.PRIORITY_BALANCED_POWER_ACCURACY, 30000)
            .setMinUpdateIntervalMillis(15000)
            .build()

        locationCallback = object : LocationCallback() {
            override fun onLocationResult(result: LocationResult) {
                result.lastLocation?.let { location ->
                    serviceScope.launch {
                        repository.updateUnitLocation(unitId, location.latitude, location.longitude)
                    }
                }
            }
        }

        try {
            fusedLocationClient.requestLocationUpdates(request, locationCallback, Looper.getMainLooper())
        } catch (se: SecurityException) {
            // Location permission revoked while tracking — don't idle forever.
            stopForeground(STOP_FOREGROUND_REMOVE)
            stopSelf()
        }
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Location Tracking",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Used for tracking responder location during active assignments"
            }
            val manager = getSystemService(NOTIFICATION_SERVICE) as NotificationManager
            manager.createNotificationChannel(channel)
        }
    }

    private fun createNotification(assignmentTitle: String): Notification {
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Tracking Active Assignment")
            .setContentText(assignmentTitle)
            .setSmallIcon(R.drawable.ic_launcher_foreground) // Use launcher icon as placeholder
            .setOngoing(true)
            .setForegroundServiceBehavior(NotificationCompat.FOREGROUND_SERVICE_IMMEDIATE)
            .build()
    }

    override fun onDestroy() {
        super.onDestroy()
        if (::locationCallback.isInitialized) {
            fusedLocationClient.removeLocationUpdates(locationCallback)
        }
        serviceScope.cancel()
    }

    override fun onBind(intent: Intent?): IBinder? = null
}
