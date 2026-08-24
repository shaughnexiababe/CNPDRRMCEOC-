package com.example.cnpdrrmoeoc.ui

import android.Manifest
import android.annotation.SuppressLint
import android.content.pm.PackageManager
import android.os.Build
import android.widget.Toast
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowDropDown
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.AddAPhoto
import androidx.compose.material.icons.filled.AddCircle
import androidx.compose.material.icons.filled.Clear
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.core.content.ContextCompat
import androidx.core.content.FileProvider
import androidx.hilt.navigation.compose.hiltViewModel
import com.example.cnpdrrmoeoc.gis.CamNorteGeography
import com.example.cnpdrrmoeoc.ui.components.Base64Photo
import com.example.cnpdrrmoeoc.util.PhotoCompressor
import com.google.android.gms.location.LocationServices
import kotlinx.coroutines.*

@SuppressLint("MissingPermission")
@Composable
fun FieldView(viewModel: GisViewModel = hiltViewModel()) {
    val user by viewModel.currentUser.collectAsState()
    
    var title by remember { mutableStateOf("") }
    var description by remember { mutableStateOf("") }
    var municipality by remember { mutableStateOf("") }
    var barangay by remember { mutableStateOf("") }
    var incidentType by remember { mutableStateOf("Flood") }
    
    var latitude by remember { mutableStateOf<Double?>(null) }
    var longitude by remember { mutableStateOf<Double?>(null) }
    
    var expandedMuni by remember { mutableStateOf(false) }
    var expandedType by remember { mutableStateOf(false) }
    var expandedBrgy by remember { mutableStateOf(false) }
    
    val context = LocalContext.current
    val fusedLocationClient = remember { LocationServices.getFusedLocationProviderClient(context) }
    
    // Set default municipality from user profile
    LaunchedEffect(user) {
        user?.let {
            if (municipality.isEmpty()) municipality = it.municipality
        }
    }

    val locationPermissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { isGranted ->
        if (isGranted) {
            fusedLocationClient.lastLocation.addOnSuccessListener { location ->
                location?.let {
                    latitude = it.latitude
                    longitude = it.longitude
                    viewModel.updateLocation(it.latitude, it.longitude)
                }
            }
        }
    }

    // Auto-capture location on start if permitted
    LaunchedEffect(Unit) {
        if (ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED) {
            fusedLocationClient.lastLocation.addOnSuccessListener { location ->
                location?.let {
                    latitude = it.latitude
                    longitude = it.longitude
                    viewModel.updateLocation(it.latitude, it.longitude)
                }
            }
        }
    }

    // --- Photo attachments (free-route: inline base64 data URLs) ---
    val photoDataUrls = remember { mutableStateListOf<String>() }
    val photoScope = rememberCoroutineScope()

    // Camera via FileProvider + TakePicture (no CAMERA permission needed —
    // the system camera app handles the capture).
    var pendingCameraUri by remember { mutableStateOf<android.net.Uri?>(null) }
    val cameraLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.TakePicture()
    ) { ok ->
        val uri = pendingCameraUri
        if (ok && uri != null) {
            // Compress off the main thread (decode + JPEG encode)
            photoScope.launch(Dispatchers.Default) {
                val compressed = PhotoCompressor.compressToDataUrl(context, uri)
                withContext(Dispatchers.Main) {
                    if (compressed != null && photoDataUrls.size < 2) {
                        photoDataUrls.add(compressed)
                    } else if (compressed == null) {
                        Toast.makeText(context, "Photo too large — try another.", Toast.LENGTH_SHORT).show()
                    }
                }
            }
        }
        pendingCameraUri = null
    }

    // Gallery (system Photo Picker — needs no storage permission on 13+;
    // limited to 2 picks)
    val galleryLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.PickMultipleVisualMedia(maxItems = 2)
    ) { uris ->
        photoScope.launch(Dispatchers.Default) {
            uris.take(2).forEach { uri ->
                val compressed = PhotoCompressor.compressToDataUrl(context, uri)
                if (compressed != null) {
                    withContext(Dispatchers.Main) {
                        if (photoDataUrls.size < 2) photoDataUrls.add(compressed)
                    }
                }
            }
        }
    }

    fun launchCamera() {
        val dir = java.io.File(context.cacheDir, "camera").apply { mkdirs() }
        val file = java.io.File(dir, "capture_${System.currentTimeMillis()}.jpg")
        val uri = FileProvider.getUriForFile(context, "${context.packageName}.fileprovider", file)
        pendingCameraUri = uri
        cameraLauncher.launch(uri)
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
                photoDataUrls.clear()
            } else {
                Toast.makeText(context, "Failed to submit report — saved offline for auto-retry.", Toast.LENGTH_SHORT).show()
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
                                    viewModel.updateLocation(it.latitude, it.longitude)
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
                    Text(if (latitude != null) "Refresh" else "Capture")
                }
            }
        }

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
                            barangay = "" // reset barangay when municipality changes
                            expandedMuni = false
                        }
                    )
                }
            }
        }

        // Barangay picker bound to the official 282-barangay reference list
        // (was a free-text field producing inconsistent spellings).
        val barangays = CamNorteGeography.BARANGAYS[municipality] ?: emptyList()
        if (barangays.isNotEmpty()) {
            Box {
                OutlinedTextField(
                    value = barangay,
                    onValueChange = {},
                    readOnly = true,
                    label = { Text("Barangay") },
                    modifier = Modifier.fillMaxWidth(),
                    trailingIcon = {
                        IconButton(onClick = { expandedBrgy = true }) {
                            Icon(Icons.Default.ArrowDropDown, contentDescription = null)
                        }
                    }
                )
                DropdownMenu(expanded = expandedBrgy, onDismissRequest = { expandedBrgy = false }) {
                    barangays.forEach { b ->
                        DropdownMenuItem(
                            text = { Text(b) },
                            onClick = {
                                barangay = b
                                expandedBrgy = false
                            }
                        )
                    }
                }
            }
        } else {
            OutlinedTextField(
                value = barangay,
                onValueChange = { barangay = it },
                label = { Text("Barangay / Sitio") },
                modifier = Modifier.fillMaxWidth()
            )
        }

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

        if (latitude == null) {
            Text(
                "Tip: attach GPS coordinates so the EOC can locate this incident on the map.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.error
            )
        }

        // --- Photo attachments (max 2, stored inline — no Storage bucket) ---
        Text("Photos (optional, max 2)", style = MaterialTheme.typography.titleSmall)
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            photoDataUrls.forEachIndexed { index, url ->
                Box {
                    Base64Photo(url, size = 72.dp)
                    IconButton(
                        onClick = { photoDataUrls.removeAt(index) },
                        modifier = Modifier
                            .align(Alignment.TopEnd)
                            .size(22.dp)
                    ) {
                        Icon(Icons.Default.Clear, contentDescription = "Remove photo", tint = MaterialTheme.colorScheme.error)
                    }
                }
            }
        }
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            OutlinedButton(
                onClick = { launchCamera() },
                enabled = photoDataUrls.size < 2
            ) {
                Icon(Icons.Default.AddAPhoto, contentDescription = null, modifier = Modifier.size(18.dp))
                Spacer(Modifier.width(6.dp)); Text("Camera")
            }
            OutlinedButton(
                onClick = {
                    galleryLauncher.launch(
                        androidx.activity.result.PickVisualMediaRequest(
                            ActivityResultContracts.PickVisualMedia.ImageOnly
                        )
                    )
                },
                enabled = photoDataUrls.size < 2
            ) {
                Icon(Icons.Default.AddCircle, contentDescription = null, modifier = Modifier.size(18.dp))
                Spacer(Modifier.width(6.dp)); Text("Gallery")
            }
        }

        Button(
            onClick = {
                if (title.isNotBlank() && description.isNotBlank() && municipality.isNotBlank()) {
                    viewModel.submitReport(
                        title, description, incidentType, municipality, barangay,
                        latitude, longitude,
                        photoUrls = photoDataUrls.toList()
                    )
                } else {
                    Toast.makeText(context, "Please fill required fields", Toast.LENGTH_SHORT).show()
                }
            },
            modifier = Modifier.fillMaxWidth(),
            colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary)
        ) {
            Text("Send Report to EOC")
        }
        
        Text("Emergency Hotlines", style = MaterialTheme.typography.titleSmall)
        Card(modifier = Modifier.fillMaxWidth()) {
            Column(modifier = Modifier.padding(12.dp)) {
                Text("PDRRMO Camarines Norte: (054) 440-1234", style = MaterialTheme.typography.bodyMedium)
                Text("PNP Daet: 911 / 117", style = MaterialTheme.typography.bodyMedium)
            }
        }
    }
}
