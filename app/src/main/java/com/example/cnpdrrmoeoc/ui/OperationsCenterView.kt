package com.example.cnpdrrmoeoc.ui

import android.media.RingtoneManager
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.example.cnpdrrmoeoc.ui.components.MapViewContainer
import kotlinx.coroutines.delay

@Composable
fun OperationsCenterView(viewModel: GisViewModel = hiltViewModel()) {
    val activeIncidents by viewModel.activeIncidents.collectAsState()
    val context = LocalContext.current
    
    // Logic to play alarm when a new incident is received
    var lastIncidentCount by remember { mutableIntStateOf(activeIncidents.size) }
    
    LaunchedEffect(activeIncidents.size) {
        if (activeIncidents.size > lastIncidentCount) {
            // Play Emergency Alarm Sound
            try {
                val alarmUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)
                    ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
                val r = RingtoneManager.getRingtone(context, alarmUri)
                r.play()
                delay(4000) // Play for 4 seconds
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
            StatCard(modifier = Modifier.weight(1f), label = "Alerts", value = "4", color = Color(0xFFEF4444))
            StatCard(modifier = Modifier.weight(1f), label = "Incidents", value = activeIncidents.size.toString(), color = Color(0xFF3B82F6))
            StatCard(modifier = Modifier.weight(1f), label = "In Evac", value = "1,204", color = Color(0xFFF59E0B))
            StatCard(modifier = Modifier.weight(1f), label = "Centers", value = "15", color = Color(0xFF10B981))
        }

        Card(
            modifier = Modifier.fillMaxWidth().height(250.dp).padding(8.dp),
            elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
        ) {
            Box(modifier = Modifier.fillMaxSize()) {
                MapViewContainer(modifier = Modifier.fillMaxSize(), onMapReady = {})
                Surface(
                    modifier = Modifier.padding(8.dp).align(Alignment.TopEnd),
                    color = MaterialTheme.colorScheme.surface.copy(alpha = 0.8f),
                    shape = MaterialTheme.shapes.extraSmall
                ) {
                    Text("LIVE OPS MAP", modifier = Modifier.padding(4.dp), style = MaterialTheme.typography.labelSmall)
                }
            }
        }

        Text(
            "Live Incident Feed",
            modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
            style = MaterialTheme.typography.titleMedium
        )

        LazyColumn(
            modifier = Modifier.fillMaxSize().padding(horizontal = 8.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
            contentPadding = PaddingValues(bottom = 16.dp)
        ) {
            if (activeIncidents.isEmpty()) {
                item {
                    Box(modifier = Modifier.fillMaxWidth().padding(32.dp), contentAlignment = Alignment.Center) {
                        Text("No active incidents", style = MaterialTheme.typography.bodySmall, color = Color.Gray)
                    }
                }
            } else {
                items(activeIncidents) { incident ->
                    IncidentFeedItem(incident.title, incident.status, incident.priority)
                }
            }
        }
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
fun IncidentFeedItem(title: String, status: String, priority: String) {
    Card(modifier = Modifier.fillMaxWidth()) {
        Row(
            modifier = Modifier.padding(12.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(title, style = MaterialTheme.typography.bodyMedium)
                Text(status.uppercase(), style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.primary)
            }
            Badge(containerColor = if (priority == "high") Color.Red else Color.Gray) {
                Text(priority, color = Color.White)
            }
        }
    }
}
