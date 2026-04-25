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
                map.setStyle(Style.Builder().fromUri("https://demotiles.maplibre.org/style.json")) { style ->
                    // OFFLINE MAP LOGIC:
                    // If you have a local .mbtiles file in assets, you can add it here.
                    // e.g. style.addSource(VectorSource("offline-source", "asset://cam_norte_basemap.mbtiles"))
                    // This allows the map to render even without internet connection.
                }
                
                // Enable Location if permissions granted
                map.addOnMapClickListener {
                    // Logic for custom pin dropping in the field
                    true
                }
                // Focus on Camarines Norte center (approx)
                map.cameraPosition = CameraPosition.Builder()
                    .target(LatLng(14.1173, 122.9553))
                    .zoom(9.5)
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
