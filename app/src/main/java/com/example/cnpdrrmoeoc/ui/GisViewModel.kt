package com.example.cnpdrrmoeoc.ui

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.cnpdrrmoeoc.data.*
import com.example.cnpdrrmoeoc.data.Unit
import com.example.cnpdrrmoeoc.data.repository.AuthRepository
import com.example.cnpdrrmoeoc.data.repository.GisRepository
import com.example.cnpdrrmoeoc.gis.CamNorteGeography
import com.google.firebase.Timestamp
import com.google.firebase.firestore.GeoPoint
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

@OptIn(ExperimentalCoroutinesApi::class)
@HiltViewModel
class GisViewModel @Inject constructor(
    private val repository: GisRepository,
    private val authRepository: AuthRepository
) : ViewModel() {

    val currentUser: StateFlow<User?> = authRepository.currentUser

    private val _floodLayerJson = MutableStateFlow<String?>(null)
    val floodLayerJson = _floodLayerJson.asStateFlow()

    private val _landslideLayerJson = MutableStateFlow<String?>(null)
    val landslideLayerJson = _landslideLayerJson.asStateFlow()

    // Real-time Incidents
    val activeIncidents: StateFlow<List<Incident>> = currentUser
        .flatMapLatest { user ->
            if (user == null) flowOf(emptyList())
            else repository.getIncidents(if (user.role == "citizen") user.municipality else null)
        }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    // Real-time Active Alerts
    val activeAlerts: StateFlow<List<HazardAlert>> = currentUser
        .flatMapLatest { user ->
            if (user == null) flowOf(emptyList())
            else repository.getActiveAlerts(if (user.role == "citizen") user.municipality else null)
        }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    // Real-time Units (EOC/Admin only)
    val units: StateFlow<List<Unit>> = currentUser
        .flatMapLatest { user ->
            if (user?.role != "citizen" && user != null) repository.getUnits()
            else flowOf(emptyList())
        }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    // Real-time Assignments (EOC/Admin only)
    val assignments: StateFlow<List<Assignment>> = currentUser
        .flatMapLatest { user ->
            if (user?.role != "citizen" && user != null) repository.getActiveAssignments()
            else flowOf(emptyList())
        }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    // Legacy support for AgencyAlert UI
    private val _latestAgencyAlerts = MutableStateFlow<List<AgencyAlert>>(emptyList())
    val latestAgencyAlerts = _latestAgencyAlerts.asStateFlow()

    private val _currentLocation = MutableStateFlow<Pair<Double, Double>?>(null)
    val currentLocation = _currentLocation.asStateFlow()

    fun updateLocation(lat: Double, lon: Double) {
        _currentLocation.value = lat to lon
    }

    private val _analyticsData = MutableStateFlow<AnalyticsResult?>(null)
    val analyticsData = _analyticsData.asStateFlow()

    private val _submissionStatus = MutableSharedFlow<Boolean>()
    val submissionStatus = _submissionStatus.asSharedFlow()

    private val _isAnalyzing = MutableStateFlow(false)
    val isAnalyzing = _isAnalyzing.asStateFlow()

    data class AnalyticsResult(
        val totalPopulation: Int,
        val totalExposedHH: Int,
        val infrastructureAtRisk: Int,
        val muniBreakdown: List<MuniExposure>
    )

    data class MuniExposure(val name: String, val exposedHH: Int, val percentage: Float)

    fun runProvincialAnalysis() {
        _isAnalyzing.value = true
        viewModelScope.launch {
            kotlinx.coroutines.delay(1500)
            
            val municipalities = CamNorteGeography.MUNICIPALITIES
            var totalPop = 0
            var totalExposed = 0
            val breakdown = mutableListOf<MuniExposure>()

            val getMultiplier = { risk: String ->
                when(risk) {
                    "very_high" -> 0.45f
                    "high" -> 0.30f
                    "medium" -> 0.15f
                    "low" -> 0.05f
                    else -> 0f
                }
            }

            municipalities.forEach { muni ->
                totalPop += muni.population
                val floodExp = (muni.population / 4.5f) * getMultiplier(muni.floodRisk)
                val landslideExp = (muni.population / 4.5f) * getMultiplier(muni.landslideRisk)
                val combinedExp = (floodExp + landslideExp).toInt()
                
                totalExposed += combinedExp
                breakdown.add(MuniExposure(muni.name, combinedExp, combinedExp.toFloat() / (muni.population / 4.5f)))
            }

            _analyticsData.value = AnalyticsResult(
                totalPopulation = totalPop,
                totalExposedHH = totalExposed,
                infrastructureAtRisk = (totalExposed / 1000) + 12, 
                muniBreakdown = breakdown.sortedByDescending { it.exposedHH }
            )
            
            _floodLayerJson.value = repository.fetchFloodData()
            _landslideLayerJson.value = repository.fetchLandslideData()
            
            _isAnalyzing.value = false
        }
    }

    fun submitReport(
        title: String,
        description: String,
        type: String,
        municipality: String,
        barangay: String = "",
        latitude: Double? = null,
        longitude: Double? = null
    ) {
        val user = currentUser.value ?: return
        viewModelScope.launch {
            val incident = Incident(
                title = title,
                description = description,
                type = type,
                municipality = municipality,
                barangay = barangay,
                location = if (latitude != null && longitude != null) GeoPoint(latitude, longitude) else null,
                status = "reported",
                priority = "medium",
                reported_by_id = user.id,
                created_at = Timestamp.now(),
                updated_at = Timestamp.now()
            )
            val success = repository.submitIncidentReport(incident)
            _submissionStatus.emit(success)
        }
    }

    fun verifyIncident(incidentId: String) {
        val user = currentUser.value ?: return
        viewModelScope.launch {
            repository.verifyIncident(incidentId, user.id)
        }
    }

    fun dispatchUnit(incidentId: String, unitId: String, etaMinutes: Int, notes: String) {
        val user = currentUser.value ?: return
        viewModelScope.launch {
            repository.dispatchUnit(
                incidentId = incidentId,
                unitId = unitId,
                dispatcherId = user.id,
                etaMinutes = etaMinutes,
                notes = notes
            )
        }
    }

    fun loadFloodHazard(bbox: String? = null) {
        viewModelScope.launch {
            val data = repository.fetchFloodData(bbox)
            _floodLayerJson.value = data
        }
    }

    fun loadFloodForMunicipality(name: String) {
        val bbox = CamNorteGeography.MUNICIPALITY_BBOXES[name] ?: CamNorteGeography.PROVINCE_BBOX
        loadFloodHazard(bbox)
    }

    fun fetchLatestAgencyAlerts() {
        viewModelScope.launch {
            val earthquakes = repository.fetchLatestEarthquakes()
            val weather = repository.fetchPagasaAlerts()
            
            val alerts = mutableListOf<AgencyAlert>()
            
            earthquakes?.let {
                alerts.add(AgencyAlert(
                    title = "Recent PHIVOLCS Earthquake Bulletin",
                    description = it.take(200) + "...",
                    source = "PHIVOLCS",
                    url = "https://www.phivolcs.dost.gov.ph/index.php/earthquake/earthquake-information3"
                ))
            }
            
            weather?.let {
                alerts.add(AgencyAlert(
                    title = "PAGASA Weather Update",
                    description = it.take(200) + "...",
                    source = "PAGASA",
                    url = "https://www.pagasa.dost.gov.ph/weather"
                ))
            }
            
            _latestAgencyAlerts.value = alerts
        }
    }

    fun login(email: String, password: String) {
        viewModelScope.launch {
            authRepository.login(email, password)
        }
    }

    fun register(fullName: String, email: String, password: String, municipality: String) {
        viewModelScope.launch {
            authRepository.register(fullName, email, password, municipality)
        }
    }

    fun triggerSOS(latitude: Double?, longitude: Double?) {
        val user = currentUser.value
        submitReport(
            title = "SOS EMERGENCY SIGNAL",
            description = "User triggered an SOS via Bantay AI Chatbot.",
            type = "Emergency",
            municipality = user?.municipality ?: "Unknown",
            latitude = latitude,
            longitude = longitude
        )
    }

    fun checkInSafe(alertId: String) {
        val user = currentUser.value ?: return
        viewModelScope.launch {
            repository.checkInSafe(
                userId = user.id,
                alertId = alertId,
                municipality = user.municipality,
                barangay = user.barangay
            )
        }
    }

    fun logout() {
        authRepository.logout()
    }
}
