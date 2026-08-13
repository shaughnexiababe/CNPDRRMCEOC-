package com.example.cnpdrrmoeoc.ui

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.example.cnpdrrmoeoc.data.User
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.Query
import kotlinx.coroutines.tasks.await

@Composable
fun UserManagementView(viewModel: GisViewModel) {
    val currentUser by viewModel.currentUser.collectAsState()
    var users by remember { mutableStateOf<List<User>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }
    
    var selectedUserForRole by remember { mutableStateOf<User?>(null) }

    LaunchedEffect(Unit) {
        isLoading = true
        try {
            val db = FirebaseFirestore.getInstance()
            val snapshot = db.collection("users")
                .orderBy("created_at", Query.Direction.DESCENDING)
                .get()
                .await()
            users = snapshot.toObjects(User::class.java).mapIndexed { index, user ->
                user.copy(id = snapshot.documents[index].id)
            }
        } catch (e: Exception) {
            e.printStackTrace()
        } finally {
            isLoading = false
        }
    }

    Column(modifier = Modifier.fillMaxSize().padding(16.dp)) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text("User Management", style = MaterialTheme.typography.headlineSmall)
            Button(onClick = { /* Invite logic stub */ }, enabled = false) {
                Text("Invite Staff")
            }
        }
        Spacer(modifier = Modifier.height(16.dp))

        if (isLoading) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator()
            }
        } else {
            LazyColumn(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                items(users) { user ->
                    UserItem(
                        user = user,
                        isSelf = user.id == currentUser?.id,
                        onEditRole = { selectedUserForRole = user }
                    )
                }
            }
        }
    }

    selectedUserForRole?.let { user ->
        RoleDialog(
            user = user,
            onDismiss = { selectedUserForRole = null },
            onConfirm = { newRole ->
                // Update logic
                FirebaseFirestore.getInstance().collection("users")
                    .document(user.id)
                    .update("role", newRole)
                selectedUserForRole = null
                // Ideally refresh list
            }
        )
    }
}

@Composable
fun UserItem(user: User, isSelf: Boolean, onEditRole: () -> Unit) {
    Card(modifier = Modifier.fillMaxWidth()) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(user.full_name, style = MaterialTheme.typography.titleMedium)
                Text(user.email, style = MaterialTheme.typography.bodySmall)
                Spacer(modifier = Modifier.height(4.dp))
                Badge(
                    containerColor = when(user.role) {
                        "admin" -> Color.Red
                        "eoc_personnel" -> Color(0xFF3B82F6)
                        else -> Color.Gray
                    }
                ) {
                    Text(user.role.uppercase(), color = Color.White)
                }
            }
            
            if (!isSelf) {
                IconButton(onClick = onEditRole) {
                    Icon(Icons.Default.Edit, contentDescription = "Change Role")
                }
            }
        }
    }
}

@Composable
fun RoleDialog(user: User, onDismiss: () -> Unit, onConfirm: (String) -> Unit) {
    val roles = listOf("citizen", "eoc_personnel", "admin")
    var selectedRole by remember { mutableStateOf(user.role) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Change Role for ${user.full_name}") },
        text = {
            Column {
                roles.forEach { role ->
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        RadioButton(
                            selected = selectedRole == role,
                            onClick = { selectedRole = role }
                        )
                        Text(role.uppercase())
                    }
                }
            }
        },
        confirmButton = {
            Button(onClick = { onConfirm(selectedRole) }) {
                Text("Update Role")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("Cancel") }
        }
    )
}
