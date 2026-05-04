package com.example.cnpdrrmoeoc.ui.components

import androidx.compose.animation.*
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.airbnb.lottie.compose.*
import com.example.cnpdrrmoeoc.R
import com.example.cnpdrrmoeoc.ui.BotAction
import com.example.cnpdrrmoeoc.ui.ChatMessage
import com.example.cnpdrrmoeoc.ui.ChatUiState
import com.example.cnpdrrmoeoc.ui.ChatViewModel
import com.example.cnpdrrmoeoc.ui.GisViewModel

@Composable
fun BantayFabOverlay(
    gisViewModel: GisViewModel,
    chatViewModel: ChatViewModel = hiltViewModel(),
    onNavigate: (String) -> Unit = {}
) {
    val isChatOpen by chatViewModel.isChatOpen.collectAsState()
    val botAction by chatViewModel.botAction.collectAsState()
    val location by gisViewModel.currentLocation.collectAsState()
    val activeIncidents by gisViewModel.activeIncidents.collectAsState()

    // Handle Deep Linking / Bot Actions
    LaunchedEffect(botAction) {
        botAction?.let { action ->
            when (action) {
                is BotAction.OpenSOS -> {
                    gisViewModel.triggerSOS(location?.first, location?.second)
                }
                is BotAction.NavigateToMap -> {
                    onNavigate("safetymap")
                    chatViewModel.setChatOpen(false)
                }
                is BotAction.NavigateToAlerts -> {
                    onNavigate("alerts")
                    chatViewModel.setChatOpen(false)
                }
            }
            chatViewModel.clearAction()
        }
    }

    Box(modifier = Modifier.fillMaxSize()) {
        // Dim background when chat is open
        if (isChatOpen) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(Color.Black.copy(alpha = 0.4f))
                    .clickable { chatViewModel.setChatOpen(false) }
            )
        }

        AnimatedContent(
            targetState = isChatOpen,
            transitionSpec = {
                (slideInVertically { it } + fadeIn())
                    .togetherWith(slideOutVertically { it } + fadeOut())
            },
            modifier = Modifier.align(Alignment.BottomEnd),
            label = "ChatTransition"
        ) { open ->
            if (open) {
                ChatBottomSheet(
                    chatViewModel = chatViewModel,
                    location = location,
                    activeIncidents = activeIncidents.size,
                    onClose = { chatViewModel.setChatOpen(false) }
                )
            } else {
                BantayFAB(onClick = { chatViewModel.setChatOpen(true) })
            }
        }
    }
}

@Composable
fun BantayFAB(onClick: () -> Unit) {
    Box(modifier = Modifier.padding(16.dp)) {
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
                Icon(
                    Icons.Default.Security,
                    contentDescription = "Bantay AI",
                    modifier = Modifier.size(40.dp)
                )
            }
        }
    }
}

@Composable
fun ChatBottomSheet(
    chatViewModel: ChatViewModel,
    location: Pair<Double, Double>?,
    activeIncidents: Int,
    onClose: () -> Unit
) {
    val messages by chatViewModel.messages.collectAsState()
    val uiState by chatViewModel.uiState.collectAsState()
    var inputText by remember { mutableStateOf("") }

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .fillMaxHeight(0.8f)
            .padding(top = 8.dp),
        shape = RoundedCornerShape(topStart = 28.dp, topEnd = 28.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 8.dp)
    ) {
        Column(modifier = Modifier.fillMaxSize()) {
            // Header
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(Color(0xFFD32F2F))
                    .padding(16.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(Icons.Default.Face, contentDescription = null, tint = Color.White)
                Spacer(Modifier.width(12.dp))
                Column(modifier = Modifier.weight(1f)) {
                    Text("Bantay AI", color = Color.White, fontWeight = FontWeight.Bold)
                    Text("PDRRMO Response Wingman", color = Color.White.copy(alpha = 0.8f), style = MaterialTheme.typography.labelSmall)
                }
                IconButton(onClick = onClose) {
                    Icon(Icons.Default.Close, contentDescription = "Close", tint = Color.White)
                }
            }

            // Messages
            LazyColumn(
                modifier = Modifier
                    .weight(1f)
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp),
                reverseLayout = false,
                contentPadding = PaddingValues(vertical = 16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                items(messages) { msg ->
                    BantayChatBubble(msg)
                }
                if (uiState is ChatUiState.Loading) {
                    item {
                        Text(
                            "Nagiisip si Bantay...",
                            style = MaterialTheme.typography.labelSmall,
                            color = Color.Gray,
                            modifier = Modifier.padding(start = 8.dp)
                        )
                    }
                }
            }

            // Input
            Surface(
                tonalElevation = 4.dp,
                shadowElevation = 8.dp,
                color = Color.White
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    OutlinedTextField(
                        value = inputText,
                        onValueChange = { inputText = it },
                        placeholder = { Text("Ask Bantay about safety...") },
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(24.dp),
                        maxLines = 3,
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = Color(0xFFD32F2F),
                            unfocusedBorderColor = Color.LightGray
                        )
                    )
                    Spacer(Modifier.width(8.dp))
                    FloatingActionButton(
                        onClick = {
                            if (inputText.isNotBlank()) {
                                val locStr = location?.let { "${it.first}, ${it.second}" } ?: "Unknown"
                                chatViewModel.sendMessage(inputText, locStr, "$activeIncidents active reports")
                                inputText = ""
                            }
                        },
                        containerColor = Color(0xFFEF6C00), // Orange
                        contentColor = Color.White,
                        shape = CircleShape,
                        modifier = Modifier.size(48.dp)
                    ) {
                        Icon(Icons.AutoMirrored.Filled.Send, contentDescription = "Send", modifier = Modifier.size(20.dp))
                    }
                }
            }
        }
    }
}

@Composable
fun BantayChatBubble(message: ChatMessage) {
    val isUser = message.isUser
    val alignment = if (isUser) Alignment.End else Alignment.Start
    val bgColor = if (isUser) Color(0xFFEF6C00) else Color(0xFFF5F5F5)
    val textColor = if (isUser) Color.White else Color.Black

    Column(modifier = Modifier.fillMaxWidth(), horizontalAlignment = alignment) {
        Surface(
            color = bgColor,
            shape = RoundedCornerShape(
                topStart = 16.dp,
                topEnd = 16.dp,
                bottomStart = if (isUser) 16.dp else 2.dp,
                bottomEnd = if (isUser) 2.dp else 16.dp
            ),
            tonalElevation = 1.dp
        ) {
            Text(
                text = message.text.replace("[TRIGGER_SOS]", "").replace("[NAVIGATE_MAP]", "").replace("[NAVIGATE_ALERTS]", "").trim(),
                modifier = Modifier.padding(12.dp),
                color = textColor,
                style = MaterialTheme.typography.bodyMedium
            )
        }
    }
}
