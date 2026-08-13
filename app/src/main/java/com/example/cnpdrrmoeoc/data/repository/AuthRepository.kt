package com.example.cnpdrrmoeoc.data.repository

import com.example.cnpdrrmoeoc.data.User
import com.example.cnpdrrmoeoc.data.local.UserSession
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.messaging.FirebaseMessaging
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.tasks.await
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AuthRepository @Inject constructor(
    private val auth: FirebaseAuth,
    private val firestore: FirebaseFirestore,
    private val messaging: FirebaseMessaging,
    private val userSession: UserSession
) {
    private val _currentUser = MutableStateFlow<User?>(userSession.getUser())
    val currentUser: StateFlow<User?> = _currentUser.asStateFlow()

    init {
        auth.addAuthStateListener { firebaseAuth ->
            val firebaseUser = firebaseAuth.currentUser
            if (firebaseUser == null) {
                val oldUser = _currentUser.value
                oldUser?.municipality?.let { unsubscribeFromAlerts(it) }
                userSession.clear()
                _currentUser.value = null
            }
        }
        
        // Ensure subscription on startup if user is cached
        _currentUser.value?.municipality?.let { subscribeToAlerts(it) }
    }

    suspend fun login(email: String, password: String): Result<User> {
        return try {
            val result = auth.signInWithEmailAndPassword(email, password).await()
            val firebaseUser = result.user ?: return Result.failure(Exception("Login failed"))
            
            val doc = firestore.collection("users").document(firebaseUser.uid).get().await()
            if (!doc.exists()) {
                auth.signOut()
                return Result.failure(Exception("User profile not found in system"))
            }
            
            val user = doc.toObject(User::class.java)?.copy(id = firebaseUser.uid) 
                ?: return Result.failure(Exception("Malformed user profile"))
            
            subscribeToAlerts(user.municipality)
            userSession.saveUser(user)
            _currentUser.value = user
            Result.success(user)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun register(fullName: String, email: String, password: String, municipality: String): Result<User> {
        return try {
            val result = auth.createUserWithEmailAndPassword(email, password).await()
            val firebaseUser = result.user ?: return Result.failure(Exception("Registration failed"))
            
            val newUser = User(
                id = firebaseUser.uid,
                full_name = fullName,
                email = email,
                role = "citizen",
                municipality = municipality,
                created_at = com.google.firebase.Timestamp.now()
            )
            
            firestore.collection("users").document(firebaseUser.uid).set(newUser).await()
            
            subscribeToAlerts(municipality)
            userSession.saveUser(newUser)
            _currentUser.value = newUser
            Result.success(newUser)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    private fun subscribeToAlerts(municipality: String) {
        if (municipality.isBlank()) return
        val topicSlug = municipality.lowercase().replace(Regex("[^a-z0-9]"), "_")
        val topic = "alerts_$topicSlug"
        messaging.subscribeToTopic(topic)
        messaging.subscribeToTopic("alerts_province") // Always subscribed to provincial alerts
    }

    private fun unsubscribeFromAlerts(municipality: String) {
        if (municipality.isBlank()) return
        val topicSlug = municipality.lowercase().replace(Regex("[^a-z0-9]"), "_")
        val topic = "alerts_$topicSlug"
        messaging.unsubscribeFromTopic(topic)
    }

    fun logout() {
        _currentUser.value?.municipality?.let { unsubscribeFromAlerts(it) }
        auth.signOut()
        userSession.clear()
        _currentUser.value = null
    }

    suspend fun refreshProfile() {
        val firebaseUser = auth.currentUser ?: return
        try {
            val doc = firestore.collection("users").document(firebaseUser.uid).get().await()
            if (doc.exists()) {
                val user = doc.toObject(User::class.java)?.copy(id = firebaseUser.uid)
                user?.let {
                    if (it.municipality != _currentUser.value?.municipality) {
                        _currentUser.value?.municipality?.let { old -> unsubscribeFromAlerts(old) }
                        subscribeToAlerts(it.municipality)
                    }
                    userSession.saveUser(it)
                    _currentUser.value = it
                }
            }
        } catch (e: Exception) {
        }
    }
}
