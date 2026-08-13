package com.example.cnpdrrmoeoc.ui

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.example.cnpdrrmoeoc.data.CriticalFacility
import com.google.firebase.firestore.FirebaseFirestore
import kotlinx.coroutines.tasks.await

@Composable
fun EvacuationCentersView(viewModel: GisViewModel) {
    val user by viewModel.currentUser.collectAsState()
    val currentLocation by viewModel.currentLocation.collectAsState()
    
    var centers by remember { mutableStateOf<List<CriticalFacility>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }

    LaunchedEffect(user?.municipality) {
        if (user != null) {
            isLoading = true
            try {
                val db = FirebaseFirestore.getInstance()
                val snapshot = db.collection("facilities")
                    .whereEqualTo("type", "evacuation_center")
                    .whereEqualTo("status", "operational")
                    .get()
                    .await()
                
                centers = snapshot.toObjects(CriticalFacility::class.java)
                    // If citizen, we might want to prioritize their municipality or just sort by distance
                    .sortedBy { center ->
                        currentLocation?.let { (lat, lon) ->
                            // Simple Euclidean distance for sorting
                            val dx = center.longitude - lon
                            val dy = center.latitude - lat
                            dx * dx + dy * dy
                        } ?: 0.0
                    }
            } catch (e: Exception) {
                e.printStackTrace()
            } finally {
                isLoading = false
            }
        }
    }

    Column(modifier = Modifier.fillMaxSize().padding(16.dp)) {
        Text("Nearest Evacuation Centers", style = MaterialTheme.typography.headlineSmall)
        Text(
            "Showing operational centers near ${user?.municipality ?: "your area"}", 
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.secondary
        )
        Spacer(modifier = Modifier.height(16.dp))

        if (isLoading) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator()
            }
        } else if (centers.isEmpty()) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Text("No operational centers found.")
            }
        } else {
            LazyColumn(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                items(centers) { center ->
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
                    ) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(center.name, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                                Badge(
                                    containerColor = if (center.current_occupancy < (center.capacity ?: Int.MAX_VALUE)) 
                                        Color(0xFF22C55E) else Color.Red
                                ) {
                                    Text(
                                        if (center.current_occupancy < (center.capacity ?: Int.MAX_VALUE)) 
                                            "AVAILABLE" else "FULL",
                                        color = Color.White
                                    )
                                }
                            }
                            Spacer(modifier = Modifier.height(8.dp))
                            
                            val occupancy = center.current_occupancy
                            val capacity = center.capacity ?: 0
                            val percent = if (capacity > 0) occupancy.toFloat() / capacity else 0f
                            
                            Text("Occupancy: $occupancy / ${if (capacity > 0) capacity else "N/A"}", style = MaterialTheme.typography.bodySmall)
                            Spacer(modifier = Modifier.height(4.dp))
                            LinearProgressIndicator(
                                progress = { percent },
                                modifier = Modifier.fillMaxWidth().height(8.dp),
                                color = if (percent > 0.9f) Color.Red else MaterialTheme.colorScheme.primary
                            )
                            
                            Spacer(modifier = Modifier.height(12.dp))
                            Button(
                                onClick = { /* Navigate logic */ },
                                modifier = Modifier.align(Alignment.End),
                                contentPadding = PaddingValues(horizontal = 12.dp, vertical = 4.dp)
                            ) {
                                Icon(Icons.Default.LocationOn, contentDescription = null, modifier = Modifier.size(16.dp))
                                Spacer(Modifier.width(4.dp))
                                Text("Get Directions")
                            }
                        }
                    }
                }
            }
        }
    }
}
