package com.example.cnpdrrmoeoc.gis

/**
 * Geographic and Demographic data for Camarines Norte and its 12 municipalities.
 * Data based on 2020 Census of Population (PSA) and general hazard profiles.
 */
object CamNorteGeography {
    const val PROVINCE_BBOX = "122.3,13.8,123.1,14.5"

    data class MunicipalityInfo(
        val name: String,
        val bbox: String,
        val population: Int,
        val barangayCount: Int,
        val isCoastal: Boolean,
        val floodRisk: String, // "low", "medium", "high", "very_high"
        val landslideRisk: String
    )

    val MUNICIPALITIES = listOf(
        MunicipalityInfo("Basud", "122.9,13.9,123.1,14.1", 45133, 29, true, "medium", "high"),
        MunicipalityInfo("Capalonga", "122.3,14.1,122.6,14.4", 36223, 22, true, "medium", "high"),
        MunicipalityInfo("Daet", "122.9,14.0,123.0,14.2", 111700, 25, true, "very_high", "low"),
        MunicipalityInfo("Jose Panganiban", "122.6,14.2,122.8,14.4", 63662, 27, true, "medium", "high"),
        MunicipalityInfo("Labo", "122.6,14.0,122.9,14.2", 109245, 52, false, "high", "very_high"),
        MunicipalityInfo("Mercedes", "123.0,13.9,123.2,14.1", 55334, 26, true, "high", "medium"),
        MunicipalityInfo("Paracale", "122.7,14.2,122.9,14.4", 60198, 27, true, "medium", "high"),
        MunicipalityInfo("San Lorenzo Ruiz", "122.8,13.9,123.0,14.1", 15757, 12, false, "medium", "very_high"),
        MunicipalityInfo("San Vicente", "122.9,14.1,123.0,14.2", 12579, 9, false, "medium", "high"),
        MunicipalityInfo("Santa Elena", "122.3,14.0,122.6,14.2", 43582, 19, true, "high", "medium"),
        MunicipalityInfo("Talisay", "122.9,14.1,123.0,14.2", 27244, 15, true, "high", "low"),
        MunicipalityInfo("Vinzons", "122.8,14.1,123.0,14.3", 49042, 19, true, "high", "medium")
    )

    // Legacy Map access for existing code compatibility
    val MUNICIPALITY_BBOXES = MUNICIPALITIES.associate { it.name to it.bbox }
    
    val BARANGAYS = mapOf(
        "Basud" to listOf("Angas", "Bactas", "Binatagan", "Caayunan", "Guinatungan", "Hinampacan", "Langa", "Laniton", "Lidong", "Mampili", "Mandazo", "Mangcamagong", "Manmuntay", "Mantugawe", "Matnog", "Mocong", "Oliva", "Pagsangahan", "Pinagwarasan", "Plaridel", "Poblacion 1", "Poblacion 2", "San Felipe", "San Jose", "San Pascual", "Taba-taba", "Tacad", "Taisan", "Tuaca"),
        "Capalonga" to listOf("Alayao", "Binawangan", "Calabaca", "Camagsaan", "Catabaguangan", "Catioan", "Del Pilar", "Itok", "Lucbananan", "Mabini", "Mactang", "Mataque", "Old Camp", "Poblacion", "Ramon Magsaysay", "San Antonio", "San Isidro", "San Roque", "Tanauan", "Ubang", "Villa Aurora", "Villa Belen"),
        "Daet" to listOf("Alawihao", "Awitan", "Bagasbas", "Barangay I", "Barangay II", "Barangay III", "Barangay IV", "Barangay V", "Barangay VI", "Barangay VII", "Barangay VIII", "Bibirao", "Borabod", "Calasgasan", "Camambugan", "Cobangbang", "Dogongan", "Gahonon", "Gubat", "Lag-on", "Magang", "Mambalite", "Mancruz", "Pamorangon", "San Isidro"),
        "Jose Panganiban" to listOf("Bagong Bayan", "Calero", "Dahican", "Dayhagan", "Larap", "Luklukan Norte", "Luklukan Sur", "Motherlode", "Nakalaya", "Osmeña", "Pag-asa", "Parang", "Plaridel", "North Poblacion", "South Poblacion", "Salvacion", "San Isidro", "San Jose", "San Martin", "San Pedro", "San Rafael", "Santa Cruz", "Santa Elena", "Santa Milagrosa", "Santa Rosa Norte", "Santa Rosa Sur", "Tamisan"),
        "Labo" to listOf("Anahaw", "Anameam", "Awitan", "Baay", "Bagacay", "Bagong Silang I", "Bagong Silang II", "Bagong Silang III", "Bakiad", "Bautista", "Bayabas", "Bayan-bayan", "Benit", "Bulhao", "Cabatuhan", "Cabusay", "Calabasa", "Canapawan", "Daguit", "Dalas", "Dumagmang", "Exciban", "Fundado", "Guinacutan", "Guisican", "Gumamela", "Iberica", "Kalamunding", "Lugui", "Mabilo I", "Mabilo II", "Macogon", "Mahawan-hawan", "Malangcao-Basud", "Malasugui", "Malatap", "Malaya", "Malibago", "Maot", "Masalong", "Matanlang", "Napaod", "Pag-asa", "Pangpang", "Pinya", "San Antonio", "San Francisco", "Santa Cruz", "Submakin", "Talobatib", "Tigbinan", "Tulay na Lupa"),
        "Mercedes" to listOf("Apuao", "Barangay I", "Barangay II", "Barangay III", "Barangay IV", "Barangay V", "Barangay VI", "Barangay VII", "Caringo", "Catandunganon", "Cayucyucan", "Colasi", "Del Rosario", "Gaboc", "Hamoraon", "Hinipaan", "Lalawigan", "Lanot", "Mambungalon", "Manguisoc", "Masalongsalong", "Matoogtoog", "Pambuhan", "Quinapaguian", "San Roque", "Tarum"),
        "Paracale" to listOf("Awitan", "Bagumbayan", "Bakal", "Batobalani", "Calaburnay", "Capacuan", "Casalugan", "Dagang", "Dalnac", "Dancalan", "Gumaus", "Labnig", "Macolabo Island", "Malacbang", "Malaguit", "Mampungo", "Mangkasay", "Maybato", "Palanas", "Pinagbirayan Malaki", "Pinagbirayan Munti", "Poblacion Norte", "Poblacion Sur", "Tabas", "Talusan", "Tawig", "Tugos"),
        "San Lorenzo Ruiz" to listOf("Daculang Bolo", "Dagotdotan", "Langga", "Laniton", "Maisog", "Mampurog", "Manlimonsito", "Matacong (Poblacion)", "Salvacion", "San Antonio", "San Isidro", "San Ramon"),
        "San Vicente" to listOf("Asdum", "Cabanbanan", "Calabagas", "Fabrica", "Iraya Sur", "Man-ogob", "Poblacion District I", "Poblacion District II", "San Jose"),
        "Santa Elena" to listOf("Basiad", "Bulala", "Don Tomas", "Guitol", "Kabuluan", "Kagtalaba", "Maulawin", "Patag Ibaba", "Patag Ilaya", "Plaridel", "Polungguitguit", "Rizal", "Salvacion", "San Lorenzo", "San Pedro", "San Vicente", "Santa Elena (Poblacion)", "Tabugon", "Villa San Isidro"),
        "Talisay" to listOf("Binanuaan", "Caawigan", "Cahabaan", "Calintaan", "Del Carmen", "Gabon", "Itomang", "Poblacion", "San Francisco", "San Isidro", "San Jose", "San Nicolas", "Santa Cruz", "Santa Elena", "Santo Niño"),
        "Vinzons" to listOf("Aguit-it", "Banocboc", "Barangay I", "Barangay II", "Barangay III", "Cagbalogo", "Calangcawan Norte", "Calangcawan Sur", "Guinacutan", "Mangcawayan", "Mangcayo", "Manlucugan", "Matango", "Napilihan", "Pinagtigasan", "Sabang", "Santo Domingo", "Singi", "Sula")
    )
}
