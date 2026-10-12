package com.example.cnpdrrmoeoc.ui

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.cnpdrrmoeoc.BuildConfig
import com.google.ai.client.generativeai.GenerativeModel
import com.google.ai.client.generativeai.type.content
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class ChatViewModel @Inject constructor() : ViewModel() {

    private val _uiState = MutableStateFlow<ChatUiState>(ChatUiState.Idle)
    val uiState: StateFlow<ChatUiState> = _uiState

    private val _messages = MutableStateFlow(
        listOf(ChatMessage("Dios Marhay na aldaw! I am Super Batang Kalasag, your CNPDRRMEOC AI wingman. How can I help you protect Camarines Norte today?", isUser = false))
    )
    val messages: StateFlow<List<ChatMessage>> = _messages

    private val _isChatOpen = MutableStateFlow(false)
    val isChatOpen: StateFlow<Boolean> = _isChatOpen

    private val _botAction = MutableStateFlow<BotAction?>(null)
    val botAction: StateFlow<BotAction?> = _botAction

    fun setChatOpen(open: Boolean) {
        _isChatOpen.value = open
    }

    fun clearAction() {
        _botAction.value = null
    }

    // API key is injected at build time from the GEMINI_API_KEY property in
    // local.properties / gradle.properties (see app/build.gradle.kts).
    // NEVER hardcode keys in source — anything committed to git must be
    // treated as leaked and rotated immediately.
    private val geminiApiKey: String = BuildConfig.GEMINI_API_KEY

    private val generativeModel: GenerativeModel? =
        if (geminiApiKey.isNotBlank()) {
            GenerativeModel(
                modelName = "gemini-2.0-flash",
                apiKey = geminiApiKey
            )
        } else null

    private val systemInstruction = """
        You are "Super Batang Kalasag", the AI wingman for the CNPDRRMEOC app. 
        Help citizens of Camarines Norte with weather updates, disaster protocols, and emergency contacts. 
        Be brief, use Bicolano-friendly Tagalog, and prioritize safety.
        
        CRITICAL INSTRUCTIONS:
        1. If the user is in immediate danger or needs emergency help, you MUST include the keyword "[TRIGGER_SOS]" in your text.
        2. If the user wants to see the map or check hazards spatially, include "[NAVIGATE_MAP]".
        3. If the user asks for alerts or notifications, include "[NAVIGATE_ALERTS]".
        
        Context will be provided for location and active incidents. Use it to give specific advice.
    """.trimIndent()

    fun sendMessage(userText: String, locationContext: String, activeIncidents: String) {
        val userMessage = ChatMessage(userText, isUser = true)
        _messages.value += userMessage

        val model = generativeModel
        if (model == null) {
            _messages.value += ChatMessage(
                "Pasensya na — the AI service is not configured on this build (missing Gemini API key). " +
                    "For emergencies, call the PDRRMO hotline: (054) 440-1234.",
                isUser = false
            )
            return
        }

        viewModelScope.launch {
            _uiState.value = ChatUiState.Loading
            try {
                val response = model.generateContent(
                    content {
                        text(systemInstruction)
                        text("User Location: $locationContext")
                        text("Active Incidents in Province: $activeIncidents")
                        text("User Input: $userText")
                    }
                )
                
                val botText = response.text ?: "Pasensya na, may error sa pag-process. Mag-ingat pirmi!"
                
                // Process actions from bot response
                when {
                    botText.contains("[TRIGGER_SOS]") -> _botAction.value = BotAction.OpenSOS
                    botText.contains("[NAVIGATE_MAP]") -> _botAction.value = BotAction.NavigateToMap
                    botText.contains("[NAVIGATE_ALERTS]") -> _botAction.value = BotAction.NavigateToAlerts
                }

                _messages.value += ChatMessage(botText, isUser = false)
                _uiState.value = ChatUiState.Idle
            } catch (_: Exception) {
                _messages.value += ChatMessage("Maugma! May sadit na problema sa signal ko. Mag-ingat kamo!", false)
                _uiState.value = ChatUiState.Idle
            }
        }
    }
}

data class ChatMessage(val text: String, val isUser: Boolean)

sealed class ChatUiState {
    object Idle : ChatUiState()
    object Loading : ChatUiState()
    data class Error(val message: String) : ChatUiState()
}

sealed class BotAction {
    object OpenSOS : BotAction()
    object NavigateToMap : BotAction()
    object NavigateToAlerts : BotAction()
}
