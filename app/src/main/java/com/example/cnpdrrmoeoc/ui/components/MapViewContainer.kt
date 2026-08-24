package com.example.cnpdrrmoeoc.ui.components

import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.key
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.viewinterop.AndroidView
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import org.maplibre.android.MapLibre
import org.maplibre.android.camera.CameraPosition
import org.maplibre.android.geometry.LatLng
import org.maplibre.android.maps.MapView
import org.maplibre.android.maps.Style

/**
 * Hosts a MapLibre MapView inside Compose.
 *
 * The MapView is REBUILT when [isOfflineMode] changes — previously the
 * offline/online choice was made once inside getMapAsync's closure, so
 * flipping the "Offline Map" switch after the map loaded silently did
 * nothing.
 */
@Composable
fun MapViewContainer(
    modifier: Modifier = Modifier,
    isOfflineMode: Boolean = false,
    onMapReady: (org.maplibre.android.maps.MapLibreMap) -> Unit = {}
) {
    val context = LocalContext.current

    // Initialize MapLibre once
    remember {
        MapLibre.getInstance(context)
    }

    // New MapView per style mode; key() forces the AndroidView below to
    // recreate when the mode flips.
    val mapView = remember(isOfflineMode) {
        MapView(context).apply {
            getMapAsync { map ->
                val styleUri = if (isOfflineMode) {
                    // Raster-tile style served from assets. MapLibre's HTTP
                    // tile cache lets responders see previously-viewed tiles
                    // without connectivity; hazard GeoJSON overlays render
                    // fully offline because they are bundled in assets.
                    "asset://styles/offline_style.json"
                } else {
                    "https://demotiles.maplibre.org/style.json"
                }

                map.setStyle(Style.Builder().fromUri(styleUri))

                map.cameraPosition = CameraPosition.Builder()
                    .target(LatLng(14.1173, 122.9553)) // Daet, Camarines Norte
                    .zoom(10.0)
                    .build()
                onMapReady(map)
            }
        }
    }

    // Handle MapView lifecycle
    val lifecycleObserver = rememberMapLifecycleObserver(mapView)
    val lifecycle = LocalLifecycleOwner.current.lifecycle
    DisposableEffect(lifecycle, mapView) {
        lifecycle.addObserver(lifecycleObserver)
        onDispose {
            lifecycle.removeObserver(lifecycleObserver)
            // Deterministic teardown: without this, a rebuilt/removed
            // composable leaked its MapView (and GL context) until process death.
            mapView.onStop()
            mapView.onDestroy()
        }
    }

    key(isOfflineMode) {
        AndroidView(factory = { mapView }, modifier = modifier)
    }
}

@Composable
fun rememberMapLifecycleObserver(mapView: MapView): LifecycleEventObserver =
    remember(mapView) {
        LifecycleEventObserver { _, event ->
            when (event) {
                Lifecycle.Event.ON_START -> mapView.onStart()
                Lifecycle.Event.ON_RESUME -> mapView.onResume()
                Lifecycle.Event.ON_PAUSE -> mapView.onPause()
                Lifecycle.Event.ON_STOP -> mapView.onStop()
                else -> {}
            }
        }
    }
