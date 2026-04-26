import axios from 'axios';

// Mocking the axios client creator
export const createAxiosClient = ({ baseURL, headers, token }) => {
  const instance = axios.create({
    baseURL,
    headers: {
      ...headers,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  instance.interceptors.response.use(
    response => response.data,
    error => Promise.reject(error.response || error)
  );

  return instance;
};

// Mocking the main SDK client
export const createClient = ({ appId, token, appBaseUrl }) => {
  const entityHandler = {
    get: (target, entityName) => {
      return {
        list: async (order, limit) => {
          console.log(`Mock: Listing ${entityName} from cnpdrrmceoc backend`);

          if (entityName === 'HazardAlert') return [
            { id: '1', title: 'PAGASA: Tropical Cyclone Wind Signal #1', severity: 'moderate', type: 'typhoon', status: 'active', issued_at: new Date().toISOString(), latitude: 14.1122, longitude: 122.9553 },
            { id: '2', title: 'PHIVOLCS: Magnitude 4.2 Earthquake - Vinzons', severity: 'high', type: 'earthquake', status: 'monitoring', issued_at: new Date().toISOString(), latitude: 14.1789, longitude: 122.9123 }
          ];

          if (entityName === 'Facility') return [
            { id: 'f1', name: 'CamNorte Provincial Hospital', type: 'hospital', municipality: 'Daet', latitude: 14.1125, longitude: 122.9550, capacity: '200 beds' },
            { id: 'f2', name: 'Daet Elementary Evacuation Center', type: 'evacuation_center', municipality: 'Daet', latitude: 14.1200, longitude: 122.9500, current_occupancy: 45 },
            { id: 'f3', name: 'Labo Regional School', type: 'school', municipality: 'Labo', latitude: 14.1527, longitude: 122.8312 },
            { id: 'f4', name: 'Mercedes Fish Port Shelter', type: 'evacuation_center', municipality: 'Mercedes', latitude: 14.1089, longitude: 123.0156, current_occupancy: 12 },
            { id: 'f5', name: 'Paracale Fire Station', type: 'fire_station', municipality: 'Paracale', latitude: 14.2769, longitude: 122.7889 }
          ];

          if (entityName === 'IncidentReport') return [
            { id: 'i1', title: 'Flooded Crossing', type: 'Flood', municipality: 'Labo', status: 'reported', priority: 'high', latitude: 14.1600, longitude: 122.8400 },
            { id: 'i2', title: 'Landslide Warning', type: 'Landslide', municipality: 'Basud', status: 'verified', priority: 'critical', latitude: 14.0673, longitude: 122.9741 }
          ];

          if (entityName === 'User') return [
            { id: 'super-admin', name: 'Sam (Admin)', email: 'i.am.sam052408@gmail.com', role: 'admin' },
            { id: 'eoc-1', name: 'EOC Responder', email: 'eoc@camnorte.gov.ph', role: 'eoc_personnel' },
            { id: 'cit-1', name: 'Juan Dela Cruz', email: 'citizen@gmail.com', role: 'citizen' }
          ];

          return [];
        },
        get: async (id) => ({ id }),
        create: async (data) => ({ id: Math.random().toString(36).substr(2, 9), ...data, created_date: new Date().toISOString() }),
        update: async (id, data) => ({ id, ...data }),
        delete: async (id) => ({ id }),
      };
    }
  };

  return {
    auth: {
      me: async () => {
        const storedUser = localStorage.getItem('pdrrmo_user');
        return storedUser ? JSON.parse(storedUser) : null;
      },
      login: async (email, password) => {
        let role = 'citizen';
        if (email.includes('admin') || email === 'i.am.sam052408@gmail.com') role = 'admin';
        if (email.includes('eoc')) role = 'eoc_personnel';

        const user = {
          id: email === 'i.am.sam052408@gmail.com' ? 'super-admin' : 'cit-1',
          name: email === 'i.am.sam052408@gmail.com' ? 'Sam (Admin)' : 'User',
          role,
          email
        };

        localStorage.setItem('pdrrmo_user', JSON.stringify(user));
        return { user, token: 'token-' + user.role };
      },
      register: async (data) => {
        const role = data.email === 'i.am.sam052408@gmail.com' ? 'admin' : 'citizen';
        const user = { id: Math.random().toString(36).substr(2, 9), ...data, role };
        localStorage.setItem('pdrrmo_user', JSON.stringify(user));
        return user;
      },
      logout: (url) => {
        localStorage.removeItem('pdrrmo_user');
        if (url) window.location.href = url; else window.location.reload();
      },
      redirectToLogin: (url) => {
        window.location.href = '/login';
      }
    },
    entities: new Proxy({}, entityHandler),
    integrations: {
      Core: {
        UploadFile: async ({ file }) => {
          console.log('Mock: Uploading file', file.name);
          return { file_url: `https://mock-storage.com/${file.name}` };
        }
      }
    }
  };
};
