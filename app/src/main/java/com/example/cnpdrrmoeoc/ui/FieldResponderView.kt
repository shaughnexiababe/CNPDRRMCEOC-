package com.example.cnpdrrmoeoc.ui

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.example.cnpdrrmoeoc.data.Assignment
import com.example.cnpdrrmoeoc.data.Incident

@Composable
fun FieldResponderView(viewModel: GisViewModel) {
    val myUnit by viewModel.myUnit.collectAsState()
    val myAssignment by viewModel.myAssignment.collectAsState()
    val activeIncidents by viewModel.activeIncidents.collectAsState()
    
    val assignedIncident = remember(myAssignment, activeIncidents) {
        activeIncidents.find { it.id == myAssignment?.incident_id }
    }

    Column(modifier = Modifier.fillMaxSize().padding(16.dp)) {
        if (myUnit == null) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Text("You are not assigned as a lead for any active unit.", style = MaterialTheme.typography.bodyMedium, color = Color.Gray)
            }
        } else if (myAssignment == null) {
            Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center, modifier = Modifier.fillMaxSize()) {
                Icon(Icons.Default.Check, contentDescription = null, modifier = Modifier.size(64.dp), tint = Color.Green)
                Spacer(modifier = Modifier.height(16.dp))
                Text("Unit ${myUnit!!.call_sign} is Standing By", style = MaterialTheme.typography.headlineSmall)
                Text("You are ready for dispatch.", style = MaterialTheme.typography.bodyMedium)
            }
        } else {
            ResponderTaskUI(
                unit = myUnit!!,
                assignment = myAssignment!!,
                incident = assignedIncident,
                onAdvance = { viewModel.advanceMyAssignment() }
            )
        }
    }
}

@Composable
fun ResponderTaskUI(
    unit: com.example.cnpdrrmoeoc.data.Unit,
    assignment: Assignment,
    incident: Incident?,
    onAdvance: () -> Unit
) {
    Column(modifier = Modifier.fillMaxSize(), verticalArrangement = Arrangement.spacedBy(16.dp)) {
        Text("ACTIVE ASSIGNMENT", style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.primary)
        
        Card(modifier = Modifier.fillMaxWidth()) {
            Column(modifier = Modifier.padding(16.dp)) {
                Text(incident?.title ?: "Incident Details Loading...", style = MaterialTheme.typography.headlineSmall)
                Text("${incident?.municipality} • ${incident?.barangay}", style = MaterialTheme.typography.bodyMedium)
                Spacer(modifier = Modifier.height(8.dp))
                Text(incident?.description ?: "", style = MaterialTheme.typography.bodySmall)
            }
        }

        Text("Task Progress", style = MaterialTheme.typography.titleMedium)
        
        val steps = listOf(
            "assigned" to "Dispatch Received",
            "enroute" to "En Route to Scene",
            "on_scene" to "On Scene / Responding",
            "completed" to "Mission Completed"
        )
        
        val currentStatus = assignment.status
        
        Card(modifier = Modifier.fillMaxWidth()) {
            Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                steps.forEach { (status, label) ->
                    val isPast = steps.indexOfFirst { it.first == status } < steps.indexOfFirst { it.first == currentStatus }
                    val isCurrent = status == currentStatus
                    
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        RadioButton(selected = isCurrent || isPast, onClick = null, enabled = false)
                        Text(
                            text = label, 
                            style = MaterialTheme.typography.bodyLarge,
                            fontWeight = if (isCurrent) FontWeight.Bold else FontWeight.Normal,
                            color = if (isCurrent) MaterialTheme.colorScheme.primary else if (isPast) Color.Gray else Color.Unspecified
                        )
                    }
                }
            }
        }

        Spacer(modifier = Modifier.weight(1f))

        if (currentStatus != "completed") {
            val nextAction = when(currentStatus) {
                "assigned" -> "MARK AS EN-ROUTE"
                "enroute" -> "MARK AS ARRIVED ON-SCENE"
                "on_scene" -> "MARK AS COMPLETED"
                else -> ""
            }
            
            Button(
                onClick = onAdvance,
                modifier = Modifier.fillMaxWidth().height(56.dp),
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF10B981))
            ) {
                Text(nextAction)
            }
        }
        
        Card(modifier = Modifier.fillMaxWidth(), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.secondaryContainer)) {
            Row(modifier = Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Default.LocationOn, contentDescription = null, modifier = Modifier.size(16.dp))
                Spacer(modifier = Modifier.width(8.dp))
                Text("GPS Breadcrumbs are being pushed for Unit ${unit.call_sign}", style = MaterialTheme.typography.bodySmall)
            }
        }
    }
}
