package com.example.cnpdrrmoeoc.ui

import android.media.RingtoneManager
import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ExitToApp
import androidx.compose.material.icons.automirrored.filled.OpenInNew
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.example.cnpdrrmoeoc.R
import com.example.cnpdrrmoeoc.data.AgencyAlert
import com.example.cnpdrrmoeoc.data.UserRole
import com.example.cnpdrrmoeoc.ui.components.MapViewContainer
import org.maplibre.android.maps.MapLibreMap
import org.maplibre.android.style.layers.FillLayer
import org.maplibre.android.style.layers.PropertyFactory
import org.maplibre.android.style.sources.GeoJsonSource

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MainScreen(viewModel: GisViewModel = hiltViewModel()) {
    val navController = rememberNavController()
    val user by viewModel.currentUser.collectAsState()
    
    if (user == null) {
        LoginScreen(
            onLogin = { email -> viewModel.login(email) },
            onRegister = { name, email -> viewModel.register(name, email) }
        )
        return
    }

    val role = user!!.role
    val navigationItems = remember(role) {
        mutableListOf<NavigationItem>().apply {
            if (role == UserRole.CITIZEN) {
                add(NavigationItem("Alerts", "alerts", Icons.Default.Notifications))
                add(NavigationItem("Safety Map", "safetymap", Icons.Default.LocationOn))
                add(NavigationItem("Report", "report", Icons.Default.Edit))
            } else {
                add(NavigationItem("Analytics", "analytics", Icons.Default.Info))
                add(NavigationItem("Operations", "operations", Icons.Default.Build))
                add(NavigationItem("Field", "report", Icons.Default.Edit))
                add(NavigationItem("Alerts", "alerts", Icons.Default.Notifications))
            }
        }
    }

    var selectedIndex by remember { mutableIntStateOf(0) }

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
                        Text(
                            when(role) {
                                UserRole.ADMIN -> "PDRRMO Command Center"
                                UserRole.EOC_PERSONNEL -> "EOC Staff Portal"
                                else -> "CN-PDRRMO Public"
                            }, 
                            style = MaterialTheme.typography.titleMedium
                        )
                    }
                },
                actions = {
                    IconButton(onClick = { viewModel.logout() }) {
                        Icon(Icons.AutoMirrored.Filled.ExitToApp, contentDescription = "Logout")
                    }
                }
            )
        },
        bottomBar = {
            NavigationBar {
                navigationItems.forEachIndexed { index, item ->
                    NavigationBarItem(
                        icon = { Icon(item.icon, contentDescription = item.label) },
                        label = { Text(item.label) },
                        selected = selectedIndex == index,
                        onClick = {
                            selectedIndex = index
                            navController.navigate(item.route)
                        }
                    )
                }
            }
        }
    ) { innerPadding ->
        NavHost(
            navController = navController,
            startDestination = navigationItems.first().route,
            modifier = Modifier.padding(innerPadding)
        ) {
            composable("alerts") { AlertsView() }
            composable("safetymap") { OperationalView(viewModel) }
            composable("operations") { OperationsCenterView(viewModel) }
            composable("report") { FieldView() }
            composable("analytics") { AnalyticsView() }
        }
    }
}

data class NavigationItem(val label: String, val route: String, val icon: ImageVector)

@Composable
fun LoginScreen(onLogin: (String) -> Unit, onRegister: (String, String) -> Unit) {
    var email by remember { mutableStateOf("") }
    var name by remember { mutableStateOf("") }
    var isRegistering by remember { mutableStateOf(false) }
    
    Column(
        modifier = Modifier.fillMaxSize().padding(32.dp).verticalScroll(rememberScrollState()),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Image(
            painter = painterResource(id = R.drawable.logo),
            contentDescription = "Logo",
            modifier = Modifier.size(100.dp)
        )
        Spacer(modifier = Modifier.height(32.dp))
        Text("CN-PDRRMO EOC", style = MaterialTheme.typography.headlineMedium)
        Text(if (isRegistering) "Create Citizen Account" else "Digital Decision Support System", style = MaterialTheme.typography.bodyMedium)
        
        Spacer(modifier = Modifier.height(32.dp))
        
        if (isRegistering) {
            OutlinedTextField(
                value = name,
                onValueChange = { name = it },
                label = { Text("Full Name") },
                modifier = Modifier.fillMaxWidth()
            )
            Spacer(modifier = Modifier.height(16.dp))
        }

        OutlinedTextField(
            value = email,
            onValueChange = { email = it },
            label = { Text("Email Address") },
            modifier = Modifier.fillMaxWidth()
        )
        
        Spacer(modifier = Modifier.height(24.dp))
        Button(
            onClick = { 
                if (isRegistering) onRegister(name, email) else onLogin(email) 
            },
            modifier = Modifier.fillMaxWidth()
        ) {
            Text(if (isRegistering) "Register" else "Login")
        }
        
        TextButton(onClick = { isRegistering = !isRegistering }) {
            Text(if (isRegistering) "Already have an account? Login" else "New citizen? Register here")
        }

        Spacer(modifier = Modifier.height(16.dp))
        Text(
            "Staff use official @eoc.gov emails to unlock operational tools.",
            style = MaterialTheme.typography.bodySmall,
            textAlign = androidx.compose.ui.text.style.TextAlign.Center,
            color = MaterialTheme.colorScheme.secondary
        )
    }
}

@Composable
fun AlertsView(viewModel: GisViewModel = hiltViewModel()) {
    val alertsData by viewModel.latestAlerts.collectAsState()
    val context = LocalContext.current
    
    var lastAlertCount by remember { mutableIntStateOf(0) }
    
    LaunchedEffect(alertsData) {
        if (alertsData.isNotEmpty() && alertsData.size > lastAlertCount) {
            try {
                val notification = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
                val r = RingtoneManager.getRingtone(context, notification)
                r.play()
            } catch (e: Exception) { e.printStackTrace() }
        }
        lastAlertCount = alertsData.size
    }

    LaunchedEffect(Unit) {
        viewModel.fetchLatestAgencyAlerts()
    }

    Column(modifier = Modifier.fillMaxSize().padding(16.dp)) {
        Text("Active Public Advisories", style = MaterialTheme.typography.headlineSmall)
        Spacer(modifier = Modifier.height(16.dp))
        
        if (alertsData.isEmpty()) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator()
            }
        } else {
            LazyColumn(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                items(alertsData) { alert: AgencyAlert ->
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.secondaryContainer),
                        onClick = {
                            alert.url?.let {
                                try {
                                    val intent = android.content.Intent(android.content.Intent.ACTION_VIEW, android.net.Uri.parse(it))
                                    context.startActivity(intent)
                                } catch (e: Exception) {
                                    android.widget.Toast.makeText(context, "Cannot open link", android.widget.Toast.LENGTH_SHORT).show()
                                }
                            }
                        }
                    ) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(alert.source, style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.primary)
                                Icon(Icons.AutoMirrored.Filled.OpenInNew, contentDescription = null, modifier = Modifier.size(16.dp))
                            }
                            Spacer(modifier = Modifier.height(8.dp))
                            Text(alert.title, style = MaterialTheme.typography.titleMedium)
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(alert.description, style = MaterialTheme.typography.bodySmall, maxLines = 3)
                        }
                    }
                }
                
                item {
                    Spacer(modifier = Modifier.height(16.dp))
                    Text("Tip: Always follow official instructions from your local MDRRMO or PDRRMO during emergencies.", 
                        style = MaterialTheme.typography.bodySmall, 
                        color = MaterialTheme.colorScheme.secondary)
                }
            }
        }
    }
}

@Composable
fun OperationalView(viewModel: GisViewModel = hiltViewModel()) {
    var mapReference by remember { mutableStateOf<MapLibreMap?>(null) }
    val floodData by viewModel.floodLayerJson.collectAsState()
    var showMunicipalityMenu by remember { mutableStateOf(false) }
    var isOfflineMode by remember { mutableStateOf(false) }

    Box(modifier = Modifier.fillMaxSize()) {
        MapViewContainer(
            modifier = Modifier.fillMaxSize(),
            isOfflineMode = isOfflineMode,
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
            // Offline Toggle
            Card(
                modifier = Modifier.padding(bottom = 8.dp),
                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
            ) {
                Row(
                    modifier = Modifier.padding(8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text("Offline Map", style = MaterialTheme.typography.bodySmall)
                    Spacer(modifier = Modifier.width(8.dp))
                    Switch(
                        checked = isOfflineMode,
                        onCheckedChange = { isOfflineMode = it },
                        modifier = Modifier.scale(0.8f)
                    )
                }
            }

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

@Composable
fun AnalyticsView(viewModel: GisViewModel = hiltViewModel()) {
    val analytics by viewModel.analyticsData.collectAsState()
    val isAnalyzing by viewModel.isAnalyzing.collectAsState()
    
    Column(modifier = Modifier.fillMaxSize().padding(16.dp).verticalScroll(rememberScrollState())) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column {
                Text("Risk & Anticipatory Analytics", style = MaterialTheme.typography.headlineSmall)
                Text("Provincial Decision Support (PSA 2020)", 
                    style = MaterialTheme.typography.bodySmall, 
                    color = MaterialTheme.colorScheme.secondary)
            }
            Button(
                onClick = { viewModel.runProvincialAnalysis() },
                enabled = !isAnalyzing,
                contentPadding = PaddingValues(horizontal = 12.dp)
            ) {
                if (isAnalyzing) {
                    CircularProgressIndicator(modifier = Modifier.size(16.dp), strokeWidth = 2.dp, color = Color.White)
                } else {
                    Icon(Icons.Default.Refresh, contentDescription = null, modifier = Modifier.size(16.dp))
                    Spacer(Modifier.width(4.dp))
                    Text("Analyze", style = MaterialTheme.typography.labelSmall)
                }
            }
        }
        
        Spacer(modifier = Modifier.height(24.dp))
        
        if (analytics == null) {
            Box(modifier = Modifier.fillMaxWidth().height(200.dp), contentAlignment = Alignment.Center) {
                if (isAnalyzing) {
                    Text("Processing Provincial Data...", style = MaterialTheme.typography.bodySmall)
                } else {
                    Text("Click 'Analyze' to generate risk profiles.", style = MaterialTheme.typography.bodySmall, color = Color.Gray)
                }
            }
        } else {
            // Top Stats (Mirroring Web Cards)
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Card(modifier = Modifier.weight(1f)) {
                    Column(modifier = Modifier.padding(12.dp)) {
                        Text("Exposed HH", style = MaterialTheme.typography.labelSmall)
                        Text(analytics!!.totalExposedHH.toString(), 
                            style = MaterialTheme.typography.titleLarge, 
                            color = MaterialTheme.colorScheme.error)
                    }
                }
                Card(modifier = Modifier.weight(1f)) {
                    Column(modifier = Modifier.padding(12.dp)) {
                        Text("Risk Units", style = MaterialTheme.typography.labelSmall)
                        Text(analytics!!.infrastructureAtRisk.toString(), 
                            style = MaterialTheme.typography.titleLarge, 
                            color = MaterialTheme.colorScheme.primary)
                    }
                }
            }

            Spacer(modifier = Modifier.height(24.dp))
            Text("Vulnerability Ranking", style = MaterialTheme.typography.titleMedium)
            Spacer(modifier = Modifier.height(8.dp))

            analytics!!.muniBreakdown.forEach { muni ->
                val maxExposed = analytics!!.muniBreakdown.first().exposedHH
                Column(modifier = Modifier.padding(vertical = 8.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(muni.name, style = MaterialTheme.typography.bodyMedium)
                        Text(muni.exposedHH.toString(), 
                            style = MaterialTheme.typography.labelLarge,
                            fontWeight = androidx.compose.ui.text.font.FontWeight.Bold)
                    }
                    Spacer(modifier = Modifier.height(4.dp))
                    LinearProgressIndicator(
                        progress = { muni.exposedHH.toFloat() / maxExposed },
                        modifier = Modifier.fillMaxWidth().height(8.dp),
                        color = if (muni.exposedHH > 20000) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.primary,
                        strokeCap = StrokeCap.Round
                    )
                }
            }
            
            Spacer(modifier = Modifier.height(24.dp))
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.secondaryContainer)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text("PDRRMO Logistics Forecast", style = MaterialTheme.typography.titleSmall)
                    Spacer(modifier = Modifier.height(8.dp))
                    Text("• Est. Relief Packs: ${(analytics!!.totalExposedHH * 1.1).toInt()}", style = MaterialTheme.typography.bodySmall)
                    Text("• Water Reserve: ${analytics!!.totalExposedHH * 15} Liters", style = MaterialTheme.typography.bodySmall)
                }
            }
        }
    }
}
