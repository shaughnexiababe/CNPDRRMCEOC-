package com.example.cnpdrrmoeoc.util

/**
 * Canonical emergency contact numbers for Camarines Norte PDRRMO and LGUs.
 * NOTE [HUMAN]: Real hotline numbers must be confirmed by PDRRMO leadership.
 */
object EmergencyContacts {
    const val PDRRMO_HOTLINE = "0998-555-2673"
    const val PDRRMO_LANDLINE = "(054) 885-1234"
    const val PNP_PROVINCIAL = "0998-598-6123"
    const val BFP_PROVINCIAL = "0915-456-7890"
    const val RED_CROSS = "0920-987-6543"

    fun formatEmergencySMS(incidentType: String, municipality: String, barangay: String, lat: Double?, lng: Double?): String {
        val coords = if (lat != null && lng != null) " [GPS: %.4f, %.4f]".format(lat, lng) else ""
        val location = if (barangay.isNotBlank()) "$barangay, $municipality" else municipality
        return "EMERGENCY SOS: ${incidentType.uppercase()} at $location$coords. Needs immediate assistance!"
    }
}
