package com.example.cnpdrrmoeoc.ui.components

import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
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

@Composable
fun MapViewContainer(
    modifier: Modifier = Modifier,
    isOfflineMode: Boolean = false,
    onMapReady: (org.maplibre.android.maps.MapLibreMap) -> Unit = {}
) {
    val context = LocalContext.current
    
    // Initialize MapLibre
    remember {
        MapLibre.getInstance(context)
    }

    val mapView = remember {
        MapView(context).apply {
            getMapAsync { map ->
                // Choose style based on connectivity mode
                val styleUri = if (isOfflineMode) {
                    // This refers to a local style in assets that uses MBTiles or local tiles
                    "asset://styles/offline_style.json"
                } else {
                    "https://demotiles.maplibre.org/style.json"
                }

                map.setStyle(Style.Builder().fromUri(styleUri)) { style ->
                    if (isOfflineMode) {
                        // OFFLINE MBTiles Integration:
                        // In a full implementation, we'd use a custom FileSource or 
                        // a local HTTP server to serve tiles from the .mbtiles SQLite file.
                        // Here we set the infrastructure to handle local sources.
                        try {
                            // Example: Adding a local vector source from MBTiles
                            // val offlineMbtiles = File(context.filesDir, "cam_norte.mbtiles")
                            // if (offlineMbtiles.exists()) {
                            //    style.addSource(VectorSource("offline-source", "mbtiles://${offlineMbtiles.absolutePath}"))
                            // }
                        } catch (e: Exception) {
                            e.printStackTrace()
                        }
                    }
                }
                
                map.cameraPosition = CameraPosition.Builder()
                    .target(LatLng(14.1173, 122.9553))
                    .zoom(10.0)
                    .build()
                onMapReady(map)
            }
        }
    }

    // Handle MapView lifecycle
    val lifecycleObserver = rememberMapLifecycleObserver(mapView)
    val lifecycle = LocalLifecycleOwner.current.lifecycle
    DisposableEffect(lifecycle) {
        lifecycle.addObserver(lifecycleObserver)
        onDispose {
            lifecycle.removeObserver(lifecycleObserver)
        }
    }

    AndroidView(factory = { mapView }, modifier = modifier)
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
                Lifecycle.Event.ON_DESTROY -> mapView.onDestroy()
                else -> {}
            }
        }
    }
