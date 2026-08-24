package com.example.cnpdrrmoeoc.ui.components

import android.graphics.BitmapFactory
import android.util.Base64
import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp

/**
 * Renders an inline base64 photo ("data:image/jpeg;base64,...") without any
 * network loader — no Coil, no Storage. Used for incident attachments on the
 * free-route storage path.
 */
@Composable
fun Base64Photo(
    dataUrl: String,
    modifier: Modifier = Modifier,
    size: Dp = 56.dp
) {
    val bitmap = remember(dataUrl) {
        runCatching {
            val b64 = dataUrl.substringAfter(',')
            val bytes = Base64.decode(b64, Base64.NO_WRAP)
            BitmapFactory.decodeByteArray(bytes, 0, bytes.size)?.asImageBitmap()
        }.getOrNull()
    }
    bitmap?.let {
        Image(
            bitmap = it,
            contentDescription = "incident photo",
            contentScale = ContentScale.Crop,
            modifier = modifier
                .size(size)
                .clip(RoundedCornerShape(6.dp))
        )
    }
}
