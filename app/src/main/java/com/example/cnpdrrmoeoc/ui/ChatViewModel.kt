package com.example.cnpdrrmoeoc.ui

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
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

    private val _messages = MutableStateFlow<List<ChatMessage>>(
        listOf(ChatMessage("Dios Marhay na aldaw! I am Boy Kalasag, your PDRRMO AI defender. How can I help you today?", false))
    )
    val messages: StateFlow<List<ChatMessage>> = _messages

    private val _isChatOpen = MutableStateFlow(false)
    val isChatOpen: StateFlow<Boolean> = _isChatOpen

    fun setChatOpen(open: Boolean) {
        _isChatOpen.value = open
    }

    private val generativeModel = GenerativeModel(
        modelName = "gemini-1.5-flash",
        apiKey = "AIzaSyD0yM6OogXKluE1esMrPR7ciKMBPJcXCl0"
    )

    private val systemInstruction = """
        You are "Boy Kalasag", the AI defender and superhero wingman for the CNPDRRMEOC app. 
        Your mission is to protect the citizens of Camarines Norte by providing weather updates, disaster protocols, and emergency contacts. 
        "Kalasag" means shield, so act as their shield against disasters.
        Be brave, brief, use Bicolano-friendly Tagalog, and always prioritize safety.
        
        If the user says "SOS" or is in immediate danger, you MUST include the keyword "[TRIGGER_SOS]" in your response.
        If the user wants to see the map, include "[NAVIGATE_MAP]".
    """.trimIndent()

    fun sendMessage(userText: String, locationContext: String, activeIncidents: String) {
        val userMessage = ChatMessage(userText, isUser = true)
        _messages.value = _messages.value + userMessage
        
        viewModelScope.launch {
            _uiState.value = ChatUiState.Loading
            try {
                val response = generativeModel.generateContent(
                    content {
                        text(systemInstruction)
                        text("Context: User at $locationContext. Active incidents: $activeIncidents")
                        text("User: $userText")
                    }
                )
                
                val botText = response.text ?: "Pasensya na, may error sa pag-process."
                _messages.value = _messages.value + ChatMessage(botText, isUser = false)
                _uiState.value = ChatUiState.Idle
            } catch (e: Exception) {
                _messages.value = _messages.value + ChatMessage("Error: ${e.localizedMessage}", false)
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
