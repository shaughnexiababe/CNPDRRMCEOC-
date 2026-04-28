package com.example.cnpdrrmoeoc.ui

import android.Manifest
import android.annotation.SuppressLint
import android.content.pm.PackageManager
import android.widget.Toast
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowDropDown
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.core.content.ContextCompat
import androidx.hilt.navigation.compose.hiltViewModel
import com.example.cnpdrrmoeoc.gis.CamNorteGeography
import com.google.android.gms.location.LocationServices

@SuppressLint("MissingPermission")
@Composable
fun FieldView(viewModel: GisViewModel = hiltViewModel()) {
    var title by remember { mutableStateOf("") }
    var description by remember { mutableStateOf("") }
    var municipality by remember { mutableStateOf(CamNorteGeography.MUNICIPALITIES.first().name) }
    var barangay by remember { mutableStateOf("") }
    var incidentType by remember { mutableStateOf("Flood") }
    
    var latitude by remember { mutableStateOf<Double?>(null) }
    var longitude by remember { mutableStateOf<Double?>(null) }
    
    var expandedMuni by remember { mutableStateOf(false) }
    var expandedType by remember { mutableStateOf(false) }
    
    val context = LocalContext.current
    val fusedLocationClient = remember { LocationServices.getFusedLocationProviderClient(context) }
    
    val locationPermissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { isGranted ->
        if (isGranted) {
            fusedLocationClient.lastLocation.addOnSuccessListener { location ->
                location?.let {
                    latitude = it.latitude
                    longitude = it.longitude
                    Toast.makeText(context, "Location captured!", Toast.LENGTH_SHORT).show()
                }
            }
        }
    }

    val submissionStatus by viewModel.submissionStatus.collectAsState(initial = null)

    LaunchedEffect(submissionStatus) {
        submissionStatus?.let { success ->
            if (success) {
                Toast.makeText(context, "Report submitted successfully!", Toast.LENGTH_SHORT).show()
                title = ""
                description = ""
                barangay = ""
                latitude = null
                longitude = null
            } else {
                Toast.makeText(context, "Failed to submit report. Saved locally.", Toast.LENGTH_SHORT).show()
            }
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
            .verticalScroll(rememberScrollState()),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        Text("Report Emergency / Incident", style = MaterialTheme.typography.headlineSmall)
        
        OutlinedTextField(
            value = title,
            onValueChange = { title = it },
            label = { Text("What is happening? (e.g., Road Blockage)") },
            modifier = Modifier.fillMaxWidth()
        )

        // Location capturing
        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
        ) {
            Row(
                modifier = Modifier.padding(12.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text("Attach GPS Location", style = MaterialTheme.typography.labelLarge)
                    Text(
                        if (latitude != null) "Coordinates: ${"%.4f".format(latitude)}, ${"%.4f".format(longitude)}" 
                        else "No location attached",
                        style = MaterialTheme.typography.bodySmall
                    )
                }
                Button(
                    onClick = {
                        val permission = Manifest.permission.ACCESS_FINE_LOCATION
                        if (ContextCompat.checkSelfPermission(context, permission) == PackageManager.PERMISSION_GRANTED) {
                            fusedLocationClient.lastLocation.addOnSuccessListener { location ->
                                location?.let {
                                    latitude = it.latitude
                                    longitude = it.longitude
                                }
                            }
                        } else {
                            locationPermissionLauncher.launch(permission)
                        }
                    },
                    contentPadding = PaddingValues(horizontal = 12.dp, vertical = 4.dp)
                ) {
                    Icon(Icons.Default.LocationOn, contentDescription = null, modifier = Modifier.size(16.dp))
                    Spacer(Modifier.width(4.dp))
                    Text("Capture")
                }
            }
        }

        // Municipality Dropdown
        Box {
            OutlinedTextField(
                value = municipality,
                onValueChange = {},
                readOnly = true,
                label = { Text("Municipality") },
                modifier = Modifier.fillMaxWidth(),
                trailingIcon = {
                    IconButton(onClick = { expandedMuni = true }) {
                        Icon(Icons.Default.ArrowDropDown, contentDescription = null)
                    }
                }
            )
            DropdownMenu(expanded = expandedMuni, onDismissRequest = { expandedMuni = false }) {
                CamNorteGeography.MUNICIPALITIES.forEach { muni ->
                    DropdownMenuItem(
                        text = { Text(muni.name) },
                        onClick = {
                            municipality = muni.name
                            expandedMuni = false
                        }
                    )
                }
            }
        }

        OutlinedTextField(
            value = barangay,
            onValueChange = { barangay = it },
            label = { Text("Barangay / Sitio") },
            modifier = Modifier.fillMaxWidth()
        )

        // Type Dropdown
        Box {
            OutlinedTextField(
                value = incidentType,
                onValueChange = {},
                readOnly = true,
                label = { Text("Incident Type") },
                modifier = Modifier.fillMaxWidth(),
                trailingIcon = {
                    IconButton(onClick = { expandedType = true }) {
                        Icon(Icons.Default.ArrowDropDown, contentDescription = null)
                    }
                }
            )
            DropdownMenu(expanded = expandedType, onDismissRequest = { expandedType = false }) {
                listOf("Flood", "Landslide", "Storm Surge", "Medical", "Fire", "Other").forEach { type ->
                    DropdownMenuItem(
                        text = { Text(type) },
                        onClick = {
                            incidentType = type
                            expandedType = false
                        }
                    )
                }
            }
        }

        OutlinedTextField(
            value = description,
            onValueChange = { description = it },
            label = { Text("Additional Details") },
            modifier = Modifier.fillMaxWidth(),
            minLines = 3
        )

        Button(
            onClick = {
                if (title.isNotBlank() && description.isNotBlank()) {
                    viewModel.submitReport(title, description, incidentType, municipality, barangay, latitude, longitude)
                } else {
                    Toast.makeText(context, "Please fill required fields", Toast.LENGTH_SHORT).show()
                }
            },
            modifier = Modifier.fillMaxWidth(),
            colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary)
        ) {
            Text("Send Report to EOC")
        }
        
        HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp))
        
        Text("Emergency Hotlines", style = MaterialTheme.typography.titleSmall)
        Card(modifier = Modifier.fillMaxWidth()) {
            Column(modifier = Modifier.padding(12.dp)) {
                Text("PDRRMO Camarines Norte: (054) 440-1234", style = MaterialTheme.typography.bodyMedium)
                Text("PNP Daet: 911 / 117", style = MaterialTheme.typography.bodyMedium)
            }
        }
    }
}
