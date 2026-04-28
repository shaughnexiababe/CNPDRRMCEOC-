package com.example.cnpdrrmoeoc.ui

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.cnpdrrmoeoc.data.AgencyAlert
import com.example.cnpdrrmoeoc.data.IncidentReport
import com.example.cnpdrrmoeoc.data.User
import com.example.cnpdrrmoeoc.data.repository.AuthRepository
import com.example.cnpdrrmoeoc.data.repository.GisRepository
import com.example.cnpdrrmoeoc.gis.CamNorteGeography
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

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

    private val _latestAlerts = MutableStateFlow<List<AgencyAlert>>(emptyList())
    val latestAlerts = _latestAlerts.asStateFlow()

    private val _activeIncidents = MutableStateFlow<List<IncidentReport>>(emptyList())
    val activeIncidents = _activeIncidents.asStateFlow()

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
            // Simulate the "Sync-and-Cache" delay of the web app
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
                breakdown.add(MuniExposure(muni.name, combinedExp, combinedExp.toFloat()))
            }

            _analyticsData.value = AnalyticsResult(
                totalPopulation = totalPop,
                totalExposedHH = totalExposed,
                infrastructureAtRisk = (totalExposed / 1000) + 12, 
                muniBreakdown = breakdown.sortedByDescending { it.exposedHH }
            )
            
            // Also load the map data locally
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
        barangay: String? = null,
        latitude: Double? = null,
        longitude: Double? = null
    ) {
        viewModelScope.launch {
            val report = IncidentReport(
                title = title,
                description = description,
                type = type,
                municipality = municipality,
                barangay = barangay,
                latitude = latitude, 
                longitude = longitude
            )
            val success = repository.submitIncidentReport(report)
            _submissionStatus.emit(success)
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
            
            _latestAlerts.value = alerts
        }
    }

    fun fetchActiveIncidents() {
        viewModelScope.launch {
            // In a real app, we'd fetch from repository. For now, empty or mock if needed.
            // _activeIncidents.value = repository.getActiveIncidents()
        }
    }

    fun login(email: String) {
        authRepository.login(email)
    }

    fun register(name: String, email: String) {
        authRepository.register(name, email)
    }

    fun logout() {
        authRepository.logout()
    }
}
