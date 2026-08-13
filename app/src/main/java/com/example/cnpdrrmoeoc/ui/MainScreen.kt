package com.example.cnpdrrmoeoc.ui

import android.content.Intent
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
import com.example.cnpdrrmoeoc.service.LocationService
import com.example.cnpdrrmoeoc.ui.components.BantayFabOverlay
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.example.cnpdrrmoeoc.R
import com.example.cnpdrrmoeoc.data.AgencyAlert
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
    val activeAlerts by viewModel.activeAlerts.collectAsState()
    val trackingStatus by viewModel.trackingStatus.collectAsState()
    val context = LocalContext.current
    
    LaunchedEffect(trackingStatus) {
        val intent = Intent(context, LocationService::class.java)
        if (trackingStatus != null) {
            intent.action = LocationService.ACTION_START
            intent.putExtra(LocationService.EXTRA_UNIT_ID, trackingStatus!!.unitId)
            intent.putExtra(LocationService.EXTRA_ASSIGNMENT_TITLE, trackingStatus!!.assignmentTitle)
            context.startService(intent)
        } else {
            intent.action = LocationService.ACTION_STOP
            context.startService(intent)
        }
    }
    
    if (user == null) {
        LoginScreen(
            onLogin = { email, password -> viewModel.login(email, password) },
            onRegister = { name, email, password, municipality -> 
                viewModel.register(name, email, password, municipality) 
            }
        )
        return
    }

    val role = user!!.role
    val navigationItems = remember(role) {
        mutableListOf<NavigationItem>().apply {
            add(NavigationItem("Alerts", "alerts", Icons.Default.Notifications))
            add(NavigationItem("Safety Map", "safetymap", Icons.Default.LocationOn))
            
            if (role == "citizen") {
                add(NavigationItem("Report", "report", Icons.Default.Edit))
                add(NavigationItem("Evac Centers", "evac", Icons.Default.Home))
            } else {
                add(NavigationItem("Operations", "operations", Icons.Default.Build))
                add(NavigationItem("Responder", "responder", Icons.Default.Place))
                add(NavigationItem("Field", "report", Icons.Default.Edit))
                add(NavigationItem("Analytics", "analytics", Icons.Default.Info))
                add(NavigationItem("Notes", "notes", Icons.Default.Edit))
                
                if (role == "admin") {
                    add(NavigationItem("Users", "users", Icons.Default.Person))
                }
            }
        }
    }

    var selectedIndex by remember { mutableIntStateOf(0) }

    Box(modifier = Modifier.fillMaxSize()) {
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
                                    "admin" -> "PDRRMO Command Center"
                                    "eoc_personnel" -> "EOC Staff Portal"
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
                                navController.navigate(item.route) {
                                    popUpTo(navController.graph.startDestinationId)
                                    launchSingleTop = true
                                }
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
                composable("report") { FieldView() }
                
                if (role == "citizen") {
                    composable("evac") { EvacuationCentersView(viewModel) }
                }
                
                if (role == "eoc_personnel" || role == "admin") {
                    composable("operations") { OperationsCenterView(viewModel) }
                    composable("responder") { FieldResponderView(viewModel) }
                    composable("analytics") { AnalyticsView(viewModel) }
                    composable("notes") { ShiftNotesView(viewModel) }
                }
                
                if (role == "admin") {
                    composable("users") { UserManagementView(viewModel) }
                }
            }
        }
        
        val navBackStackEntry by navController.currentBackStackEntryAsState()
        val currentRoute = navBackStackEntry?.destination?.route
        
        if (currentRoute != "report") {
            BantayFabOverlay(
                gisViewModel = viewModel,
                onNavigate = { route: String ->
                    val canNavigate = when(route) {
                        "operations", "analytics", "notes" -> role != "citizen"
                        "users" -> role == "admin"
                        else -> true
                    }
                    if (canNavigate) {
                        navController.navigate(route)
                        val index = navigationItems.indexOfFirst { it.route == route }
                        if (index != -1) selectedIndex = index
                    }
                }
            )
        }
    }
}

@Composable
fun LoginScreen(
    onLogin: (String, String) -> Unit, 
    onRegister: (String, String, String, String) -> Unit
) {
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var name by remember { mutableStateOf("") }
    var municipality by remember { mutableStateOf(com.example.cnpdrrmoeoc.gis.CamNorteGeography.MUNICIPALITIES.first().name) }
    var isRegistering by remember { mutableStateOf(false) }
    var showMuniMenu by remember { mutableStateOf(false) }
    
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
            
            Box(modifier = Modifier.fillMaxWidth()) {
                OutlinedTextField(
                    value = municipality,
                    onValueChange = { },
                    label = { Text("Municipality") },
                    modifier = Modifier.fillMaxWidth(),
                    readOnly = true,
                    trailingIcon = {
                        IconButton(onClick = { showMuniMenu = true }) {
                            Icon(Icons.Default.ArrowDropDown, contentDescription = null)
                        }
                    }
                )
                DropdownMenu(
                    expanded = showMuniMenu,
                    onDismissRequest = { showMuniMenu = false }
                ) {
                    com.example.cnpdrrmoeoc.gis.CamNorteGeography.MUNICIPALITIES.forEach { muni ->
                        DropdownMenuItem(
                            text = { Text(muni.name) },
                            onClick = {
                                municipality = muni.name
                                showMuniMenu = false
                            }
                        )
                    }
                }
            }
            Spacer(modifier = Modifier.height(16.dp))
        }

        OutlinedTextField(
            value = email,
            onValueChange = { email = it },
            label = { Text("Email Address") },
            modifier = Modifier.fillMaxWidth()
        )
        Spacer(modifier = Modifier.height(16.dp))
        
        OutlinedTextField(
            value = password,
            onValueChange = { password = it },
            label = { Text("Password") },
            modifier = Modifier.fillMaxWidth(),
            visualTransformation = androidx.compose.ui.text.input.PasswordVisualTransformation()
        )
        
        Spacer(modifier = Modifier.height(24.dp))
        Button(
            onClick = { 
                if (isRegistering) onRegister(name, email, password, municipality) 
                else onLogin(email, password) 
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
            "Staff use official accounts to unlock operational tools.",
            style = MaterialTheme.typography.bodySmall,
            textAlign = androidx.compose.ui.text.style.TextAlign.Center,
            color = MaterialTheme.colorScheme.secondary
        )
    }
}

data class NavigationItem(val label: String, val route: String, val icon: ImageVector)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AlertsView(viewModel: GisViewModel = hiltViewModel()) {
    val alertsData by viewModel.activeAlerts.collectAsState()
    val user by viewModel.currentUser.collectAsState()
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

    Column(modifier = Modifier.fillMaxSize().padding(16.dp)) {
        Text("Active Public Advisories", style = MaterialTheme.typography.headlineSmall)
        
        // "I'm Safe" Check-in Panel
        if (user?.role == "citizen" && alertsData.any { it.affected_municipality == user?.municipality }) {
            Spacer(modifier = Modifier.height(16.dp))
            val latestAlert = alertsData.first { it.affected_municipality == user?.municipality }
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer)
            ) {
                Column(modifier = Modifier.padding(16.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                    Text("Emergency Check-in", style = MaterialTheme.typography.titleMedium)
                    Text(
                        "An active alert is in effect for ${user?.municipality}.",
                        style = MaterialTheme.typography.bodySmall,
                        textAlign = androidx.compose.ui.text.style.TextAlign.Center
                    )
                    Spacer(modifier = Modifier.height(12.dp))
                    Button(
                        onClick = { viewModel.checkInSafe(latestAlert.id) },
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Icon(Icons.Default.Check, contentDescription = null)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("I AM SAFE")
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(16.dp))
        
        if (alertsData.isEmpty()) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Text("No active alerts for your area.", style = MaterialTheme.typography.bodyMedium, color = Color.Gray)
            }
        } else {
            LazyColumn(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                items(alertsData) { alert ->
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(
                            containerColor = when(alert.severity) {
                                "critical" -> Color(0xFFFFEBEE)
                                "high" -> Color(0xFFFFF3E0)
                                else -> MaterialTheme.colorScheme.secondaryContainer
                            }
                        )
                    ) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(alert.type.uppercase(), style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.primary)
                                if (alert.severity == "critical" || alert.severity == "high") {
                                    Icon(Icons.Default.Warning, contentDescription = null, tint = Color.Red, modifier = Modifier.size(16.dp))
                                }
                            }
                            Spacer(modifier = Modifier.height(8.dp))
                            Text(alert.title, style = MaterialTheme.typography.titleMedium)
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(alert.description, style = MaterialTheme.typography.bodySmall, maxLines = 3)
                        }
                    }
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

        Column(
            modifier = Modifier
                .align(Alignment.BottomEnd)
                .padding(16.dp),
            horizontalAlignment = Alignment.End
        ) {
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
                    
                    style.removeLayer(layerId)
                    style.removeSource(sourceId)
                    style.addSource(GeoJsonSource(sourceId, floodData))
                    
                    val layer = FillLayer(layerId, sourceId)
                    layer.setProperties(
                        PropertyFactory.fillColor(
                            org.maplibre.android.style.expressions.Expression.match(
                                org.maplibre.android.style.expressions.Expression.get("susceptibility"),
                                org.maplibre.android.style.expressions.Expression.literal("#ef4444"),
                                org.maplibre.android.style.expressions.Expression.literal("very_high"), org.maplibre.android.style.expressions.Expression.literal("#ef4444"),
                                org.maplibre.android.style.expressions.Expression.literal("high"), org.maplibre.android.style.expressions.Expression.literal("#f97316"),
                                org.maplibre.android.style.expressions.Expression.literal("moderate"), org.maplibre.android.style.expressions.Expression.literal("#eab308"),
                                org.maplibre.android.style.expressions.Expression.literal("low"), org.maplibre.android.style.expressions.Expression.literal("#22c55e")
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
fun AnalyticsView(viewModel: GisViewModel) {
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

