package com.example.cnpdrrmoeoc.data.local

import android.content.Context
import android.content.SharedPreferences
import com.example.cnpdrrmoeoc.data.User
import com.example.cnpdrrmoeoc.data.UserRole
import com.google.gson.Gson
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class UserSession @Inject constructor(
    @ApplicationContext context: Context
) {
    private val prefs: SharedPreferences = context.getSharedPreferences("pdrrmo_user_prefs", Context.MODE_PRIVATE)
    private val gson = Gson()

    fun saveUser(user: User) {
        val json = gson.toJson(user)
        prefs.edit().putString("current_user", json).apply()
    }

    fun getUser(): User? {
        val json = prefs.getString("current_user", null) ?: return null
        return try {
            gson.fromJson(json, User::class.java)
        } catch (e: Exception) {
            null
        }
    }

    fun clear() {
        prefs.edit().remove("current_user").apply()
    }
}
