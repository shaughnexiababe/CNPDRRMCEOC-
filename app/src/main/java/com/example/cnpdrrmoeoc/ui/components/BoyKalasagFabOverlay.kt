package com.example.cnpdrrmoeoc.ui.components

import androidx.compose.animation.*
import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Send
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Face
import androidx.compose.material.icons.filled.Security
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.airbnb.lottie.compose.*
import com.example.cnpdrrmoeoc.R
import com.example.cnpdrrmoeoc.ui.ChatMessage
import com.example.cnpdrrmoeoc.ui.ChatViewModel
import com.example.cnpdrrmoeoc.ui.GisViewModel

@Composable
fun BoyKalasagFabOverlay(
    gisViewModel: GisViewModel,
    chatViewModel: ChatViewModel = hiltViewModel(),
    onNavigate: (String) -> Unit = {}
) {
    val isChatOpen by chatViewModel.isChatOpen.collectAsState()
    val location by gisViewModel.currentLocation.collectAsState()
    val activeIncidents by gisViewModel.activeIncidents.collectAsState()

    Box(modifier = Modifier.fillMaxSize()) {
        if (isChatOpen) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(Color.Black.copy(alpha = 0.3f))
                    .clickable { chatViewModel.setChatOpen(false) }
            )
        }

        AnimatedContent(
            targetState = isChatOpen,
            transitionSpec = {
                (fadeIn(animationSpec = tween(300)) + scaleIn(initialScale = 0.8f))
                    .togetherWith(fadeOut(animationSpec = tween(300)) + scaleOut(targetScale = 0.8f))
            },
            modifier = Modifier.align(Alignment.BottomEnd).padding(16.dp),
            label = "ChatTransition"
        ) { open ->
            if (open) {
                ChatWindow(
                    chatViewModel = chatViewModel,
                    location = location,
                    activeIncidents = activeIncidents.size,
                    onClose = { chatViewModel.setChatOpen(false) },
                    onTriggerSOS = {
                        gisViewModel.triggerSOS(location?.first, location?.second)
                    },
                    onNavigate = { route: String ->
                        chatViewModel.setChatOpen(false)
                        onNavigate(route)
                    }
                )
            } else {
                BoyKalasagFab(onClick = { chatViewModel.setChatOpen(true) })
            }
        }
    }
}

@Composable
fun BoyKalasagFab(onClick: () -> Unit) {
    FloatingActionButton(
        onClick = onClick,
        containerColor = Color(0xFFD32F2F), // PDRRMO Red
        contentColor = Color.White,
        shape = CircleShape,
        modifier = Modifier.size(64.dp)
    ) {
        val composition by rememberLottieComposition(LottieCompositionSpec.RawRes(R.raw.boy_kalasag))
        val progress by animateLottieCompositionAsState(composition, iterations = LottieConstants.IterateForever)

        if (composition != null) {
            LottieAnimation(
                composition = composition,
                progress = { progress },
                modifier = Modifier.size(56.dp)
            )
        } else {
            // Fallback if Lottie fails to load
            Icon(
                Icons.Default.Security,
                contentDescription = "Boy Kalasag AI",
                modifier = Modifier.size(40.dp)
            )
        }
    }
}

@Composable
fun ChatWindow(
    chatViewModel: ChatViewModel,
    location: Pair<Double, Double>?,
    activeIncidents: Int,
    onClose: () -> Unit,
    onTriggerSOS: () -> Unit,
    onNavigate: (String) -> Unit
) {
    val messages by chatViewModel.messages.collectAsState()
    var inputText by remember { mutableStateOf("") }
    val snackbarHostState = remember { SnackbarHostState() }

    LaunchedEffect(messages) {
        messages.lastOrNull()?.let { lastMsg ->
            if (!lastMsg.isUser) {
                if (lastMsg.text.contains("[TRIGGER_SOS]")) {
                    onTriggerSOS()
                    snackbarHostState.showSnackbar("SOS Triggered! Dispatching help...")
                }
                if (lastMsg.text.contains("[NAVIGATE_MAP]")) {
                    onNavigate("safetymap")
                }
            }
        }
    }

    Scaffold(
        modifier = Modifier
            .fillMaxWidth(0.9f)
            .fillMaxHeight(0.8f),
        snackbarHost = { SnackbarHost(snackbarHostState) },
        topBar = {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(Color(0xFFD32F2F)) // PDRRMO Red
                    .padding(8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(Icons.Default.Face, contentDescription = null, tint = Color.White, modifier = Modifier.padding(8.dp))
                Text(
                    "Boy Kalasag",
                    color = Color.White,
                    style = MaterialTheme.typography.titleMedium,
                    modifier = Modifier.weight(1f)
                )
                IconButton(onClick = onClose) {
                    Icon(Icons.Default.Close, contentDescription = "Close", tint = Color.White)
                }
            }
        },
        bottomBar = {
            Surface(tonalElevation = 2.dp) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    OutlinedTextField(
                        value = inputText,
                        onValueChange = { inputText = it },
                        placeholder = { Text("Magtanong kay Boy Kalasag...") },
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(24.dp)
                    )
                    Spacer(Modifier.width(8.dp))
                    IconButton(
                        onClick = {
                            if (inputText.isNotBlank()) {
                                val locStr = location?.let { "${it.first}, ${it.second}" } ?: "Unknown location"
                                chatViewModel.sendMessage(inputText, locStr, "$activeIncidents active incidents")
                                inputText = ""
                            }
                        },
                        enabled = inputText.isNotBlank()
                    ) {
                        Icon(Icons.AutoMirrored.Filled.Send, contentDescription = "Send", tint = Color(0xFFEF6C00)) // Orange
                    }
                }
            }
        }
    ) { padding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(12.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            items(messages) { msg ->
                ChatBubble(msg)
            }
        }
    }
}

@Composable
fun ChatBubble(message: ChatMessage) {
    val isUser = message.isUser
    val alignment = if (isUser) Alignment.End else Alignment.Start
    val color = if (isUser) Color(0xFFEF6C00) else Color(0xFFF5F5F5)
    val textColor = if (isUser) Color.White else Color.Black

    Column(modifier = Modifier.fillMaxWidth(), horizontalAlignment = alignment) {
        Surface(
            color = color,
            shape = RoundedCornerShape(
                topStart = 16.dp,
                topEnd = 16.dp,
                bottomStart = if (isUser) 16.dp else 0.dp,
                bottomEnd = if (isUser) 0.dp else 16.dp
            )
        ) {
            Text(
                text = message.text.replace("[TRIGGER_SOS]", "").replace("[NAVIGATE_MAP]", "").trim(),
                modifier = Modifier.padding(12.dp),
                color = textColor,
                style = MaterialTheme.typography.bodyMedium
            )
        }
    }
}
