package com.example.cnpdrrmoeoc.data

import com.google.firebase.Timestamp

data class ShiftNote(
    val id: String = "",
    val author_id: String = "",
    val author_name: String = "",
    val content: String = "",
    val created_at: Timestamp? = null
)
