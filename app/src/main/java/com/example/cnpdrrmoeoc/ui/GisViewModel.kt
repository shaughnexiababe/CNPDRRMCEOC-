package com.example.cnpdrrmoeoc.ui

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.cnpdrrmoeoc.data.IncidentReport
import com.example.cnpdrrmoeoc.data.repository.GisRepository
import com.example.cnpdrrmoeoc.gis.CamNorteGeography
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class GisViewModel @Inject constructor(
    private val repository: GisRepository
) : ViewModel() {

    private val _floodLayerJson = MutableStateFlow<String?>(null)
    val floodLayerJson = _floodLayerJson.asStateFlow()

    private val _latestAlerts = MutableStateFlow<String?>(null)
    val latestAlerts = _latestAlerts.asStateFlow()

    private val _submissionStatus = MutableSharedFlow<Boolean>()
    val submissionStatus = _submissionStatus.asSharedFlow()

    fun submitReport(
        title: String,
        description: String,
        type: String,
        municipality: String,
        barangay: String? = null
    ) {
        viewModelScope.launch {
            val report = IncidentReport(
                title = title,
                description = description,
                type = type,
                municipality = municipality,
                barangay = barangay,
                latitude = null, 
                longitude = null
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
            _latestAlerts.value = "Earthquakes: $earthquakes \n Weather: $weather"
        }
    }
}
