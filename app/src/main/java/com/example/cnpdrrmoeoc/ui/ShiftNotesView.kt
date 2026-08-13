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
import com.example.cnpdrrmoeoc.data.ShiftNote

@Composable
fun ShiftNotesView(viewModel: GisViewModel) {
    val currentUser by viewModel.currentUser.collectAsState()
    val notes by viewModel.shiftNotes.collectAsState()
    var newNoteText by remember { mutableStateOf("") }
    var isLoading by remember { mutableStateOf(false) }

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
                            viewModel.addShiftNote(newNoteText)
                            newNoteText = ""
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
