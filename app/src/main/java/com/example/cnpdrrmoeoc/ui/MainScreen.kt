package com.example.cnpdrrmoeoc.ui

import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Build
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.example.cnpdrrmoeoc.R
import com.example.cnpdrrmoeoc.ui.components.MapViewContainer
import org.maplibre.android.maps.MapLibreMap
import org.maplibre.android.style.layers.FillLayer
import org.maplibre.android.style.layers.PropertyFactory
import org.maplibre.android.style.sources.GeoJsonSource

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MainScreen() {
    val navController = rememberNavController()
    var selectedItem by remember { mutableIntStateOf(1) } // Default to Operational
    val items = listOf("Strategic", "Operational", "Field")
    val icons = listOf(Icons.Default.Info, Icons.Default.Build, Icons.Default.LocationOn)

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Image(
                            painter = painterResource(id = R.drawable.logo),
                            contentDescription = "Logo",
                            modifier = Modifier.size(32.dp).padding(end = 8.dp)
                        )
                        Text("CN-PDRRMO DSS", style = MaterialTheme.typography.titleMedium)
                    }
                }
            )
        },
        bottomBar = {
            NavigationBar {
                items.forEachIndexed { index, item ->
                    NavigationBarItem(
                        icon = { Icon(icons[index], contentDescription = item) },
                        label = { Text(item) },
                        selected = selectedItem == index,
                        onClick = {
                            selectedItem = index
                            navController.navigate(item.lowercase())
                        }
                    )
                }
            }
        }
    ) { innerPadding ->
        NavHost(
            navController = navController,
            startDestination = "operational",
            modifier = Modifier.padding(innerPadding)
        ) {
            composable("strategic") { StrategicView() }
            composable("operational") { OperationalView() }
            composable("field") { FieldView() }
        }
    }
}

@Composable
fun StrategicView() {
    Text("Strategic View: High-level province data for policy decisions.")
}

@Composable
fun OperationalView(viewModel: GisViewModel = hiltViewModel()) {
    var mapReference by remember { mutableStateOf<MapLibreMap?>(null) }
    val floodData by viewModel.floodLayerJson.collectAsState()
    var showMunicipalityMenu by remember { mutableStateOf(false) }

    Box(modifier = Modifier.fillMaxSize()) {
        MapViewContainer(
            modifier = Modifier.fillMaxSize(),
            onMapReady = { map ->
                mapReference = map
            }
        )

        // Floating Action Button to load hazard data
        Column(
            modifier = Modifier
                .align(Alignment.BottomEnd)
                .padding(16.dp),
            horizontalAlignment = Alignment.End
        ) {
            if (showMunicipalityMenu) {
                Card(
                    modifier = Modifier.padding(bottom = 8.dp),
                    elevation = CardDefaults.cardElevation(defaultElevation = 4.dp)
                ) {
                    Column(modifier = Modifier.padding(8.dp)) {
                        com.example.cnpdrrmoeoc.gis.CamNorteGeography.MUNICIPALITY_BBOXES.keys.forEach { name ->
                            TextButton(onClick = {
                                viewModel.loadFloodForMunicipality(name)
                                showMunicipalityMenu = false
                            }) {
                                Text(name)
                            }
                        }
                    }
                }
            }

            FloatingActionButton(
                onClick = {
                    showMunicipalityMenu = !showMunicipalityMenu
                }
            ) {
                Icon(Icons.Default.LocationOn, contentDescription = "Load Hazards")
            }
        }

        if (floodData != null && mapReference != null) {
            LaunchedEffect(floodData) {
                mapReference?.getStyle { style ->
                    val sourceId = "flood-source"
                    val layerId = "flood-layer"
                    
                    // Remove existing if any
                    style.removeLayer(layerId)
                    style.removeSource(sourceId)

                    // Add GeoJSON source and layer
                    style.addSource(GeoJsonSource(sourceId, floodData))
                    
                    // Android MapLibre Layer with dynamic color logic
                    val layer = FillLayer(layerId, sourceId)
                    layer.setProperties(
                        PropertyFactory.fillColor(
                            org.maplibre.android.style.expressions.Expression.match(
                                org.maplibre.android.style.expressions.Expression.get("susceptibility"),
                                org.maplibre.android.style.expressions.Expression.literal("#ef4444"), // default red
                                org.maplibre.android.style.expressions.Expression.stop("very_high", "#ef4444"),
                                org.maplibre.android.style.expressions.Expression.stop("high", "#f97316"),
                                org.maplibre.android.style.expressions.Expression.stop("moderate", "#eab308"),
                                org.maplibre.android.style.expressions.Expression.stop("low", "#22c55e")
                            )
                        ),
                        PropertyFactory.fillOpacity(0.5f),
                        PropertyFactory.fillOutlineColor("#ffffff")
                    )
                    style.addLayer(layer)
                }
            }
        }
    }
}
