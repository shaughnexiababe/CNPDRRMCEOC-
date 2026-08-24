package com.example.cnpdrrmoeoc.util

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import android.util.Base64
import android.util.Log
import java.io.ByteArrayOutputStream

/**
 * Compresses a photo (from camera or gallery) into an inline JPEG data URL
 * — "data:image/jpeg;base64,...".
 *
 * Free-route storage strategy: Cloud Storage for Firebase requires the
 * Blaze billing plan, so incident photos live INSIDE the Firestore
 * document (`photo_urls[]`). Data URLs render natively everywhere
 * (web <img>, this app's Base64Photo composable) with zero decoding logic.
 *
 * Target: longest edge 1024px, JPEG quality 65 → typically 80–200KB, so
 * two photos stay well under Firestore's 1MiB document limit together with
 * the rest of the incident fields.
 */
object PhotoCompressor {
    private const val TAG = "PhotoCompressor"
    const val MAX_DIM = 1024
    const val QUALITY = 65
    /** Reject results above this many characters (~300KB) to protect doc size. */
    const val MAX_CHARS = 400_000

    fun compressToDataUrl(context: Context, uri: Uri): String? {
        return try {
            // First pass: read bounds only
            val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
            context.contentResolver.openInputStream(uri)?.use {
                BitmapFactory.decodeStream(it, null, bounds)
            } ?: return null

            if (bounds.outWidth <= 0 || bounds.outHeight <= 0) return null

            // Downsample by power of two to get close to MAX_DIM
            var sample = 1
            while (bounds.outWidth / (sample * 2) >= MAX_DIM ||
                bounds.outHeight / (sample * 2) >= MAX_DIM
            ) {
                sample *= 2
            }

            val opts = BitmapFactory.Options().apply { inSampleSize = sample }
            val raw = context.contentResolver.openInputStream(uri)?.use {
                BitmapFactory.decodeStream(it, null, opts)
            } ?: return null

            // Exact-resize if still larger than MAX_DIM
            val bitmap = if (raw.width > MAX_DIM || raw.height > MAX_DIM) {
                val scale = MAX_DIM.toFloat() / maxOf(raw.width, raw.height)
                val w = (raw.width * scale).toInt().coerceAtLeast(1)
                val h = (raw.height * scale).toInt().coerceAtLeast(1)
                Bitmap.createScaledBitmap(raw, w, h, true).also {
                    if (it != raw) raw.recycle()
                }
            } else raw

            val out = ByteArrayOutputStream()
            bitmap.compress(Bitmap.CompressFormat.JPEG, QUALITY, out)
            bitmap.recycle()

            val b64 = Base64.encodeToString(out.toByteArray(), Base64.NO_WRAP)
            val dataUrl = "data:image/jpeg;base64,$b64"
            if (dataUrl.length > MAX_CHARS) {
                Log.w(TAG, "Compressed photo too large (${dataUrl.length} chars) — skipping")
                null
            } else dataUrl
        } catch (e: Exception) {
            Log.e(TAG, "Photo compression failed", e)
            null
        }
    }
}
