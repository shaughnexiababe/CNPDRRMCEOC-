package com.example.cnpdrrmoeoc.data.repository

import com.example.cnpdrrmoeoc.data.User
import com.example.cnpdrrmoeoc.data.UserRole
import com.example.cnpdrrmoeoc.data.local.UserSession
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AuthRepository @Inject constructor(
    private val userSession: UserSession
) {
    private val _currentUser = MutableStateFlow<User?>(userSession.getUser())
    val currentUser: StateFlow<User?> = _currentUser.asStateFlow()

    fun login(email: String): User {
        // Logic mirroring web's email pattern role assignment
        val role = when {
            email.contains("admin") || email == "i.am.sam052408@gmail.com" -> UserRole.ADMIN
            email.contains("eoc") || email.contains("staff") -> UserRole.EOC_PERSONNEL
            else -> UserRole.CITIZEN
        }
        
        val user = User(
            id = java.util.UUID.randomUUID().toString(),
            name = if (role == UserRole.CITIZEN) "Citizen User" else "Staff User",
            email = email,
            role = role
        )
        
        userSession.saveUser(user)
        _currentUser.value = user
        return user
    }

    fun register(name: String, email: String, role: UserRole = UserRole.CITIZEN): User {
        val user = User(
            id = java.util.UUID.randomUUID().toString(),
            name = name,
            email = email,
            role = role
        )
        userSession.saveUser(user)
        _currentUser.value = user
        return user
    }

    fun logout() {
        userSession.clear()
        _currentUser.value = null
    }
}
