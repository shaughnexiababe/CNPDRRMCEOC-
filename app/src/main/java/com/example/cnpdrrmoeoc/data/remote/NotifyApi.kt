package com.example.cnpdrrmoeoc.data.remote

import android.util.Log
import com.google.firebase.auth.FirebaseAuth
import kotlinx.coroutines.tasks.await
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Firebase-less notification bridge to the Vercel API routes.
 *
 * Cloud Functions (Firestore triggers) require the Blaze billing plan,
 * so the app calls these free Vercel serverless endpoints directly after
 * writing the Firestore document — the endpoints verify the caller's ID
 * token and send the FCM push to staff devices.
 *
 * Everything here is fire-and-forget: failures are logged but never thrown
 * (the in-app Firestore listeners remain the primary awareness channel).
 */
@Singleton
class NotifyApi @Inject constructor(
    private val okHttp: OkHttpClient,
    private val auth: FirebaseAuth
) {
    companion object {
        private const val TAG = "NotifyApi"
        /** Production deployment of the web app (frontend/api routes). */
        private const val BASE_URL = "https://cnpdrrmceoc.vercel.app"
    }

    suspend fun notifyCriticalIncident(incidentId: String) {
        post("$BASE_URL/api/notify-critical-incident", incidentId = incidentId)
    }

    suspend fun notifyHazardAlert(alertId: String) {
        post("$BASE_URL/api/notify-hazard-alert", alertId = alertId)
    }

    private suspend fun post(url: String, incidentId: String? = null, alertId: String? = null) {
        try {
            val user = auth.currentUser ?: return
            val token = user.getIdToken(false).await().token ?: return
            val body = JSONObject().apply {
                incidentId?.let { put("incidentId", it) }
                alertId?.let { put("alertId", it) }
            }.toString().toRequestBody("application/json".toMediaType())

            val request = Request.Builder()
                .url(url)
                .header("Authorization", "Bearer $token")
                .header("Content-Type", "application/json")
                .post(body)
                .build()

            okHttp.newCall(request).execute().use { response ->
                if (!response.isSuccessful) {
                    Log.w(TAG, "Notify failed ${response.code}: $url")
                }
            }
        } catch (e: Exception) {
            Log.w(TAG, "Notify failed: $url", e)
        }
    }
}
