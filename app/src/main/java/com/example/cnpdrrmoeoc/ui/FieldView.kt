package com.example.cnpdrrmoeoc.ui

import android.widget.Toast
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowDropDown
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.example.cnpdrrmoeoc.gis.CamNorteGeography

@Composable
fun FieldView(viewModel: GisViewModel = hiltViewModel()) {
    var title by remember { mutableStateOf("") }
    var description by remember { mutableStateOf("") }
    var municipality by remember { mutableStateOf(CamNorteGeography.MUNICIPALITIES.first().name) }
    var barangay by remember { mutableStateOf("") }
    var incidentType by remember { mutableStateOf("Flood") }
    
    var expandedMuni by remember { mutableStateOf(false) }
    var expandedType by remember { mutableStateOf(false) }
    
    val context = LocalContext.current
    val submissionStatus by viewModel.submissionStatus.collectAsState(initial = null)

    LaunchedEffect(submissionStatus) {
        submissionStatus?.let { success ->
            if (success) {
                Toast.makeText(context, "Report submitted successfully!", Toast.LENGTH_SHORT).show()
                title = ""
                description = ""
                barangay = ""
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
        Text("Report Field Incident", style = MaterialTheme.typography.headlineSmall)
        
        OutlinedTextField(
            value = title,
            onValueChange = { title = it },
            label = { Text("Report Title (e.g., Bridge Overflow)") },
            modifier = Modifier.fillMaxWidth()
        )

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
            label = { Text("Situation Description") },
            modifier = Modifier.fillMaxWidth(),
            minLines = 3
        )

        Button(
            onClick = {
                if (title.isNotBlank() && description.isNotBlank()) {
                    viewModel.submitReport(title, description, incidentType, municipality, barangay)
                } else {
                    Toast.makeText(context, "Please fill required fields", Toast.LENGTH_SHORT).show()
                }
            },
            modifier = Modifier.fillMaxWidth()
        ) {
            Text("Send to Operations Center")
        }
        
        Text("Note: In low connectivity, the system will attempt to resync when online.", 
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.secondary)
    }
}
