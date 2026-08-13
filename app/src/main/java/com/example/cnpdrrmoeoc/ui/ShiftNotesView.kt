package com.example.cnpdrrmoeoc.ui

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.google.firebase.Timestamp
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.Query
import kotlinx.coroutines.tasks.await

data class ShiftNote(
    val id: String = "",
    val author_id: String = "",
    val author_name: String = "",
    val content: String = "",
    val created_at: Timestamp? = null
)

@Composable
fun ShiftNotesView(viewModel: GisViewModel) {
    val currentUser by viewModel.currentUser.collectAsState()
    var notes by remember { mutableStateOf<List<ShiftNote>>(emptyList()) }
    var newNoteText by remember { mutableStateOf("") }
    var isLoading by remember { mutableStateOf(true) }

    val db = FirebaseFirestore.getInstance()

    LaunchedEffect(Unit) {
        isLoading = true
        try {
            val snapshot = db.collection("shift_notes")
                .orderBy("created_at", Query.Direction.DESCENDING)
                .limit(20)
                .get()
                .await()
            notes = snapshot.toObjects(ShiftNote::class.java)
        } catch (e: Exception) {
            e.printStackTrace()
        } finally {
            isLoading = false
        }
    }

    Column(modifier = Modifier.fillMaxSize().padding(16.dp)) {
        Text("Shift Handoff Log", style = MaterialTheme.typography.headlineSmall)
        Spacer(modifier = Modifier.height(16.dp))

        Card(modifier = Modifier.fillMaxWidth()) {
            Column(modifier = Modifier.padding(12.dp)) {
                OutlinedTextField(
                    value = newNoteText,
                    onValueChange = { newNoteText = it },
                    label = { Text("Add context for the next shift...") },
                    modifier = Modifier.fillMaxWidth(),
                    minLines = 2
                )
                Spacer(modifier = Modifier.height(8.dp))
                Button(
                    onClick = {
                        if (newNoteText.isNotBlank() && currentUser != null) {
                            val note = ShiftNote(
                                author_id = currentUser!!.id,
                                author_name = currentUser!!.full_name,
                                content = newNoteText,
                                created_at = Timestamp.now()
                            )
                            db.collection("shift_notes").add(note)
                            newNoteText = ""
                            // Refresh logic stub
                        }
                    },
                    modifier = Modifier.align(Alignment.End)
                ) {
                    Text("Post Entry")
                }
            }
        }

        Spacer(modifier = Modifier.height(24.dp))

        if (isLoading) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator()
            }
        } else {
            LazyColumn(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                items(notes) { note ->
                    Card(modifier = Modifier.fillMaxWidth()) {
                        Column(modifier = Modifier.padding(12.dp)) {
                            Text(note.author_name, style = MaterialTheme.typography.labelLarge)
                            Text(note.content, style = MaterialTheme.typography.bodyMedium)
                            Text(
                                note.created_at?.toDate()?.toString() ?: "", 
                                style = MaterialTheme.typography.bodySmall,
                                color = androidx.compose.ui.graphics.Color.Gray
                            )
                        }
                    }
                }
            }
        }
    }
}
