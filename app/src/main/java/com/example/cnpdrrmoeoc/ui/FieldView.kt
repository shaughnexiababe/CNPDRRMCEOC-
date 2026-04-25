package com.example.cnpdrrmoeoc.ui

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

@Composable
fun FieldView() {
    var incidentType by remember { mutableStateOf("") }
    var description by remember { mutableStateOf("") }
    var locationName by remember { mutableStateOf("") }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
            .verticalScroll(rememberScrollState()),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        Text("Report Incident", style = MaterialTheme.typography.headlineMedium)
        
        OutlinedTextField(
            value = incidentType,
            onValueChange = { incidentType = it },
            label = { Text("Incident Type (e.g., Flood, Landslide)") },
            modifier = Modifier.fillMaxWidth()
        )

        OutlinedTextField(
            value = locationName,
            onValueChange = { locationName = it },
            label = { Text("Location Name / Sitio") },
            modifier = Modifier.fillMaxWidth()
        )

        OutlinedTextField(
            value = description,
            onValueChange = { description = it },
            label = { Text("Description") },
            modifier = Modifier.fillMaxWidth(),
            minLines = 3
        )

        Button(
            onClick = { /* TODO: Submit to backend */ },
            modifier = Modifier.fillMaxWidth()
        ) {
            Text("Submit Report")
        }
        
        HorizontalDivider()
        
        Text("Offline Mode: Reports will be cached if no connection is available.", 
            style = MaterialTheme.typography.bodySmall)
    }
}
