package com.example.cnpdrrmoeoc.ui

import android.media.RingtoneManager
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Send
import androidx.compose.material.icons.filled.Check
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.example.cnpdrrmoeoc.data.Incident
import com.example.cnpdrrmoeoc.data.Unit as PdrrmoUnit
import com.example.cnpdrrmoeoc.ui.components.MapViewContainer
import kotlinx.coroutines.delay

@Composable
fun OperationsCenterView(viewModel: GisViewModel = hiltViewModel()) {
    val activeIncidents by viewModel.activeIncidents.collectAsState()
    val availableUnits by viewModel.units.collectAsState()
    val context = LocalContext.current
    
    var selectedIncidentForDispatch by remember { mutableStateOf<Incident?>(null) }
    
    var lastIncidentCount by remember { mutableIntStateOf(activeIncidents.size) }
    
    LaunchedEffect(activeIncidents.size) {
        if (activeIncidents.size > lastIncidentCount) {
            try {
                val alarmUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)
                    ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
                val r = RingtoneManager.getRingtone(context, alarmUri)
                r.play()
                delay(4000)
                if (r.isPlaying) r.stop()
            } catch (e: Exception) { e.printStackTrace() }
        }
        lastIncidentCount = activeIncidents.size
    }

    Column(modifier = Modifier.fillMaxSize()) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(8.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            StatCard(modifier = Modifier.weight(1f), label = "Incidents", value = activeIncidents.size.toString(), color = Color(0xFF3B82F6))
            StatCard(modifier = Modifier.weight(1f), label = "Verifying", value = activeIncidents.count { it.status == "reported" }.toString(), color = Color(0xFFF59E0B))
            StatCard(modifier = Modifier.weight(1f), label = "Dispatched", value = activeIncidents.count { it.status == "dispatched" || it.status == "responding" }.toString(), color = Color(0xFF10B981))
            StatCard(modifier = Modifier.weight(1f), label = "Units Avail", value = availableUnits.count { it.status == "available" }.toString(), color = Color(0xFF8B5CF6))
        }

        Text(
            "Operations Queue",
            modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
            style = MaterialTheme.typography.titleMedium
        )

        LazyColumn(
            modifier = Modifier.fillMaxSize().padding(horizontal = 8.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
            contentPadding = PaddingValues(bottom = 16.dp)
        ) {
            items(activeIncidents) { incident ->
                IncidentOpsItem(
                    incident = incident,
                    onVerify = { viewModel.verifyIncident(incident.id) },
                    onDispatch = { selectedIncidentForDispatch = incident }
                )
            }
        }
    }

    selectedIncidentForDispatch?.let { incident ->
        DispatchDialog(
            incident = incident,
            availableUnits = availableUnits.filter { it.status == "available" },
            onDismiss = { selectedIncidentForDispatch = null },
            onConfirm = { unitId, eta, notes ->
                viewModel.dispatchUnit(incident.id, unitId, eta, notes)
                selectedIncidentForDispatch = null
            }
        )
    }
}

@Composable
fun StatCard(modifier: Modifier, label: String, value: String, color: Color) {
    Card(modifier = modifier, colors = CardDefaults.cardColors(containerColor = color.copy(alpha = 0.1f))) {
        Column(modifier = Modifier.padding(8.dp), horizontalAlignment = Alignment.CenterHorizontally) {
            Text(value, style = MaterialTheme.typography.titleLarge, color = color)
            Text(label, style = MaterialTheme.typography.labelSmall, color = color)
        }
    }
}

@Composable
fun IncidentOpsItem(
    incident: Incident,
    onVerify: () -> Unit,
    onDispatch: () -> Unit
) {
    Card(modifier = Modifier.fillMaxWidth()) {
        Column(modifier = Modifier.padding(12.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(incident.title, style = MaterialTheme.typography.bodyLarge)
                    Text("${incident.municipality} • ${incident.barangay}", style = MaterialTheme.typography.bodySmall)
                }
                Badge(containerColor = when(incident.priority) {
                    "high", "critical" -> Color.Red
                    "medium" -> Color(0xFFF59E0B)
                    else -> Color.Gray
                }) {
                    Text(incident.priority.uppercase(), color = Color.White)
                }
            }
            
            Spacer(modifier = Modifier.height(8.dp))
            Text(incident.status.uppercase(), style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.primary)
            
            Spacer(modifier = Modifier.height(12.dp))
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End) {
                if (incident.status == "reported") {
                    Button(onClick = onVerify, contentPadding = PaddingValues(horizontal = 12.dp, vertical = 4.dp)) {
                        Icon(Icons.Default.Check, contentDescription = null, modifier = Modifier.size(16.dp))
                        Spacer(Modifier.width(4.dp))
                        Text("Verify")
                    }
                } else if (incident.status == "verified") {
                    Button(
                        onClick = onDispatch, 
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF10B981)),
                        contentPadding = PaddingValues(horizontal = 12.dp, vertical = 4.dp)
                    ) {
                        Icon(Icons.AutoMirrored.Filled.Send, contentDescription = null, modifier = Modifier.size(16.dp))
                        Spacer(Modifier.width(4.dp))
                        Text("Dispatch Unit")
                    }
                }
            }
        }
    }
}

@Composable
fun DispatchDialog(
    incident: Incident,
    availableUnits: List<PdrrmoUnit>,
    onDismiss: () -> Unit,
    onConfirm: (String, Int, String) -> Unit
) {
    var selectedUnitId by remember { mutableStateOf("") }
    var eta by remember { mutableStateOf("15") }
    var notes by remember { mutableStateOf("") }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Dispatch Unit to ${incident.title}") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                if (availableUnits.isEmpty()) {
                    Text("No units currently available!", color = Color.Red)
                } else {
                    Text("Select a unit to respond from ${incident.municipality}")
                    
                    availableUnits.forEach { unit ->
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            RadioButton(
                                selected = selectedUnitId == unit.id,
                                onClick = { selectedUnitId = unit.id }
                            )
                            Text("${unit.call_sign} (${unit.type})")
                        }
                    }

                    OutlinedTextField(
                        value = eta,
                        onValueChange = { eta = it },
                        label = { Text("ETA (Minutes)") },
                        modifier = Modifier.fillMaxWidth()
                    )

                    OutlinedTextField(
                        value = notes,
                        onValueChange = { notes = it },
                        label = { Text("Dispatch Notes") },
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            }
        },
        confirmButton = {
            Button(
                enabled = selectedUnitId.isNotEmpty(),
                onClick = { onConfirm(selectedUnitId, eta.toIntOrNull() ?: 15, notes) }
            ) {
                Text("Confirm Dispatch")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("Cancel") }
        }
    )
}
