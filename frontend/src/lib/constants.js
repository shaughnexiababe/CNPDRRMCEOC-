export const MUNICIPALITIES = [
  "Basud", "Capalonga", "Daet", "Jose Panganiban", "Labo", "Mercedes",
  "Paracale", "San Lorenzo Ruiz", "San Vicente", "Santa Elena", "Talisay", "Vinzons"
];

/**
 * 2020 Census Population and Hazard Profile Data for Camarines Norte
 */
export const MUNICIPALITY_DATA = {
  "Basud": {
    population: 45133,
    barangayCount: 29,
    hazards: { flood: "medium", landslide: "high", storm_surge: "medium", tsunami: "high" },
    coastal: true
  },
  "Capalonga": {
    population: 36223,
    barangayCount: 22,
    hazards: { flood: "medium", landslide: "high", storm_surge: "high", tsunami: "high" },
    coastal: true
  },
  "Daet": {
    population: 111700,
    barangayCount: 25,
    hazards: { flood: "very_high", landslide: "low", storm_surge: "high", tsunami: "very_high" },
    coastal: true
  },
  "Jose Panganiban": {
    population: 63662,
    barangayCount: 27,
    hazards: { flood: "medium", landslide: "high", storm_surge: "high", tsunami: "high" },
    coastal: true
  },
  "Labo": {
    population: 109245,
    barangayCount: 52,
    hazards: { flood: "high", landslide: "very_high", storm_surge: "none", tsunami: "none" },
    coastal: false
  },
  "Mercedes": {
    population: 55334,
    barangayCount: 26,
    hazards: { flood: "high", landslide: "medium", storm_surge: "very_high", tsunami: "very_high" },
    coastal: true
  },
  "Paracale": {
    population: 60198,
    barangayCount: 27,
    hazards: { flood: "medium", landslide: "high", storm_surge: "high", tsunami: "high" },
    coastal: true
  },
  "San Lorenzo Ruiz": {
    population: 15757,
    barangayCount: 12,
    hazards: { flood: "medium", landslide: "very_high", storm_surge: "none", tsunami: "none" },
    coastal: false
  },
  "San Vicente": {
    population: 12579,
    barangayCount: 9,
    hazards: { flood: "medium", landslide: "high", storm_surge: "none", tsunami: "none" },
    coastal: false
  },
  "Santa Elena": {
    population: 43582,
    barangayCount: 19,
    hazards: { flood: "high", landslide: "medium", storm_surge: "high", tsunami: "high" },
    coastal: true
  },
  "Talisay": {
    population: 27244,
    barangayCount: 15,
    hazards: { flood: "high", landslide: "low", storm_surge: "high", tsunami: "high" },
    coastal: true
  },
  "Vinzons": {
    population: 49042,
    barangayCount: 19,
    hazards: { flood: "high", landslide: "medium", storm_surge: "high", tsunami: "very_high" },
    coastal: true
  }
};

export const MUNICIPALITY_BBOXES = {
  "Basud": [122.9, 13.9, 123.1, 14.1],
  "Capalonga": [122.3, 14.1, 122.6, 14.4],
  "Daet": [122.9, 14.0, 123.0, 14.2],
  "Jose Panganiban": [122.6, 14.2, 122.8, 14.4],
  "Labo": [122.6, 14.0, 122.9, 14.2],
  "Mercedes": [123.0, 13.9, 123.2, 14.1],
  "Paracale": [122.7, 14.2, 122.9, 14.4],
  "San Lorenzo Ruiz": [122.8, 13.9, 123.0, 14.1],
  "San Vicente": [122.9, 14.1, 123.0, 14.2],
  "Santa Elena": [122.3, 14.0, 122.6, 14.2],
  "Talisay": [122.9, 14.1, 123.0, 14.2],
  "Vinzons": [122.8, 14.1, 123.0, 14.3],
};

export const HAZARD_TYPES = [
  { value: "flood", label: "Flood", color: "#3B82F6" },
  { value: "landslide", label: "Landslide", color: "#A855F7" },
  { value: "storm_surge", label: "Storm Surge", color: "#06B6D4" },
  { value: "typhoon", label: "Typhoon", color: "#EF4444" },
  { value: "earthquake", label: "Earthquake", color: "#F59E0B" },
  { value: "tsunami", label: "Tsunami", color: "#6366F1" },
];

export const SEVERITY_LEVELS = [
  { value: "none", label: "No Risk", color: "#94A3B8" },
  { value: "low", label: "Low", color: "#22C55E" },
  { value: "medium", label: "Medium", color: "#F59E0B" },
  { value: "high", label: "High", color: "#F97316" },
  { value: "very_high", label: "Very High", color: "#EF4444" },
];

export const FACILITY_TYPES = [
  { value: "hospital", label: "Hospital", icon: "Hospital" },
  { value: "school", label: "School", icon: "GraduationCap" },
  { value: "evacuation_center", label: "Evacuation Center", icon: "Home" },
  { value: "fire_station", label: "Fire Station", icon: "Flame" },
  { value: "police_station", label: "Police Station", icon: "Shield" },
  { value: "barangay_hall", label: "Barangay Hall", icon: "Building2" },
  { value: "government_building", label: "Government Building", icon: "Landmark" },
  { value: "bridge", label: "Bridge", icon: "ArrowLeftRight" },
];

// Camarines Norte center coordinates
export const MAP_CENTER = [14.1389, 122.7631];
export const MAP_ZOOM = 11;

export const MUNICIPALITY_COORDINATES = {
  "Daet":               [14.1122, 122.9553],
  "Mercedes":           [14.1089, 123.0156],
  "Talisay":            [14.1256, 122.9734],
  "Basud":              [14.0673, 122.9741],
  "San Vicente":        [14.1012, 122.8890],
  "San Lorenzo Ruiz":   [14.2145, 122.8523],
  "Labo":               [14.1527, 122.8312],
  "Jose Panganiban":    [14.2934, 122.6923],
  "Paracale":           [14.2769, 122.7889],
  "Vinzons":            [14.1789, 122.9123],
  "Capalonga":          [14.3312, 122.4867],
  "Santa Elena":        [14.1678, 122.4534],
};

// Full list of all 282 Barangays in Camarines Norte
export const BARANGAYS_BY_MUNICIPALITY = {
  "Basud": [
    "Angas", "Bactas", "Binatagan", "Caayunan", "Guinatungan", "Hinampacan", "Langa", "Laniton",
    "Lidong", "Mampili", "Mandazo", "Mangcamagong", "Manmuntay", "Mantugawe", "Matnog", "Mocong",
    "Oliva", "Pagsangahan", "Pinagwarasan", "Plaridel", "Poblacion 1", "Poblacion 2", "San Felipe",
    "San Jose", "San Pascual", "Taba-taba", "Tacad", "Taisan", "Tuaca"
  ],
  "Capalonga": [
    "Alayao", "Binawangan", "Calabaca", "Camagsaan", "Catabaguangan", "Catioan", "Del Pilar",
    "Itok", "Lucbananan", "Mabini", "Mactang", "Mataque", "Old Camp", "Poblacion", "Ramon Magsaysay",
    "San Antonio", "San Isidro", "San Roque", "Tanauan", "Ubang", "Villa Aurora", "Villa Belen"
  ],
  "Daet": [
    "Alawihao", "Awitan", "Bagasbas", "Barangay I", "Barangay II", "Barangay III", "Barangay IV",
    "Barangay V", "Barangay VI", "Barangay VII", "Barangay VIII", "Bibirao", "Borabod", "Calasgasan",
    "Camambugan", "Cobangbang", "Dogongan", "Gahonon", "Gubat", "Lag-on", "Magang", "Mambalite",
    "Mancruz", "Pamorangon", "San Isidro"
  ],
  "Jose Panganiban": [
    "Bagong Bayan", "Calero", "Dahican", "Dayhagan", "Larap", "Luklukan Norte", "Luklukan Sur",
    "Motherlode", "Nakalaya", "Osmeña", "Pag-asa", "Parang", "Plaridel", "North Poblacion",
    "South Poblacion", "Salvacion", "San Isidro", "San Jose", "San Martin", "San Pedro", "San Rafael",
    "Santa Cruz", "Santa Elena", "Santa Milagrosa", "Santa Rosa Norte", "Santa Rosa Sur", "Tamisan"
  ],
  "Labo": [
    "Anahaw", "Anameam", "Awitan", "Baay", "Bagacay", "Bagong Silang I", "Bagong Silang II",
    "Bagong Silang III", "Bakiad", "Bautista", "Bayabas", "Bayan-bayan", "Benit", "Bulhao",
    "Cabatuhan", "Cabusay", "Calabasa", "Canapawan", "Daguit", "Dalas", "Dumagmang", "Exciban",
    "Fundado", "Guinacutan", "Guisican", "Gumamela", "Iberica", "Kalamunding", "Lugui", "Mabilo I",
    "Mabilo II", "Macogon", "Mahawan-hawan", "Malangcao-Basud", "Malasugui", "Malatap", "Malaya",
    "Malibago", "Maot", "Masalong", "Matanlang", "Napaod", "Pag-asa", "Pangpang", "Pinya", "San Antonio",
    "San Francisco", "Santa Cruz", "Submakin", "Talobatib", "Tigbinan", "Tulay na Lupa"
  ],
  "Mercedes": [
    "Apuao", "Barangay I", "Barangay II", "Barangay III", "Barangay IV", "Barangay V", "Barangay VI",
    "Barangay VII", "Caringo", "Catandunganon", "Cayucyucan", "Colasi", "Del Rosario", "Gaboc",
    "Hamoraon", "Hinipaan", "Lalawigan", "Lanot", "Mambungalon", "Manguisoc", "Masalongsalong",
    "Matoogtoog", "Pambuhan", "Quinapaguian", "San Roque", "Tarum"
  ],
  "Paracale": [
    "Awitan", "Bagumbayan", "Bakal", "Batobalani", "Calaburnay", "Capacuan", "Casalugan", "Dagang",
    "Dalnac", "Dancalan", "Gumaus", "Labnig", "Macolabo Island", "Malacbang", "Malaguit", "Mampungo",
    "Mangkasay", "Maybato", "Palanas", "Pinagbirayan Malaki", "Pinagbirayan Munti", "Poblacion Norte",
    "Poblacion Sur", "Tabas", "Talusan", "Tawig", "Tugos"
  ],
  "San Lorenzo Ruiz": [
    "Daculang Bolo", "Dagotdotan", "Langga", "Laniton", "Maisog", "Mampurog", "Manlimonsito",
    "Matacong (Poblacion)", "Salvacion", "San Antonio", "San Isidro", "San Ramon"
  ],
  "San Vicente": [
    "Asdum", "Cabanbanan", "Calabagas", "Fabrica", "Iraya Sur", "Man-ogob", "Poblacion District I",
    "Poblacion District II", "San Jose"
  ],
  "Santa Elena": [
    "Basiad", "Bulala", "Don Tomas", "Guitol", "Kabuluan", "Kagtalaba", "Maulawin", "Patag Ibaba",
    "Patag Ilaya", "Plaridel", "Polungguitguit", "Rizal", "Salvacion", "San Lorenzo", "San Pedro",
    "San Vicente", "Santa Elena (Poblacion)", "Tabugon", "Villa San Isidro"
  ],
  "Talisay": [
    "Binanuaan", "Caawigan", "Cahabaan", "Calintaan", "Del Carmen", "Gabon", "Itomang", "Poblacion",
    "San Francisco", "San Isidro", "San Jose", "San Nicolas", "Santa Cruz", "Santa Elena", "Santo Niño"
  ],
  "Vinzons": [
    "Aguit-it", "Banocboc", "Barangay I", "Barangay II", "Barangay III", "Cagbalogo", "Calangcawan Norte",
    "Calangcawan Sur", "Guinacutan", "Mangcawayan", "Mangcayo", "Manlucugan", "Matango", "Napilihan",
    "Pinagtigasan", "Sabang", "Santo Domingo", "Singi", "Sula"
  ]
};
