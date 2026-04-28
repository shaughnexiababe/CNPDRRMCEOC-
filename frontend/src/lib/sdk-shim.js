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

// Helper for local storage persistence in mock mode
const getCache = (key) => JSON.parse(localStorage.getItem(`pdrrmo_cache_${key}`) || '[]');
const saveCache = (key, data) => localStorage.setItem(`pdrrmo_cache_${key}`, JSON.stringify(data));

// Mocking the main SDK client
export const createClient = ({ appId, token, appBaseUrl }) => {
  const entityHandler = {
    get: (target, entityName) => {
      return {
        list: async (order, limit) => {
          console.log(`Mock: Listing ${entityName} from cnpdrrmceoc backend`);
          let items = getCache(entityName);

          if (items.length === 0) {
            if (entityName === 'HazardAlert') items = [
              { id: '1', title: 'PAGASA: Tropical Cyclone Wind Signal #1', severity: 'moderate', type: 'typhoon', status: 'active', issued_at: new Date().toISOString(), latitude: 14.1122, longitude: 122.9553, source_url: 'https://www.pagasa.dost.gov.ph/tropical-cyclone/severe-weather-bulletin' },
              { id: '2', title: 'PHIVOLCS: Magnitude 4.2 Earthquake - Vinzons', severity: 'high', type: 'earthquake', status: 'monitoring', issued_at: new Date().toISOString(), latitude: 14.1789, longitude: 122.9123, source_url: 'https://www.phivolcs.dost.gov.ph/index.php/earthquake/earthquake-information3' }
            ];

            if (entityName === 'Facility') items = [
              { id: 'f1', name: 'CamNorte Provincial Hospital', type: 'hospital', municipality: 'Daet', latitude: 14.1125, longitude: 122.9550, status: 'operational' },
              { id: 'f2', name: 'Daet Elementary Evacuation Center', type: 'evacuation_center', municipality: 'Daet', latitude: 14.1200, longitude: 122.9500, status: 'operational', current_occupancy: 45 }
            ];

            if (entityName === 'HazardLayer') items = [
              { id: 'l1', name: 'Flood Hazard (Local Data)', type: 'flood', format: 'geojson', is_active: true, file_url: '/data/hazards/flood_camnorte.json' },
              { id: 'l2', name: 'Landslide Hazard (Local Data)', type: 'landslide', format: 'geojson', is_active: true, file_url: '/data/hazards/landslide_camnorte.json' },
              { id: 'l3', name: 'Storm Surge (Local Data)', type: 'storm_surge', format: 'geojson', is_active: true, file_url: '/data/hazards/storm_surge_camnorte.json' },
              { id: 'l4', name: 'Active Faults (Local Data)', type: 'fault_line', format: 'geojson', is_active: true, file_url: '/data/hazards/active_faults_camnorte.json' },
              { id: 'l5', name: 'Bagasbas High Risk Area (Overlay)', type: 'flood', format: 'geojson', is_active: true, file_url: 'data:application/json;base64,eyJ0eXBlIjogIkZlYXR1cmVDb2xsZWN0aW9uIiwgImZlYXR1cmVzIjogW3sidHlwZSI6ICJGZWF0dXJlIiwgInByb3BlcnRpZXMiOiB7Im5hbWUiOiAiSGlnaCBSaXNrIFB1cm9rIDEiLCAiYmFyYW5nYXkiOiAiQmFnYXNiYXMiLCAic3VzY2VwdGliaWxpdHkiOiAidmVyeV9oaWdoIn0sICJnZW9tZXRyeSI6IHsidHlwZSI6ICJQb2x5Z29uIiwgImNvb3JkaW5hdGVzIjogW1tbMTIyLjk4LCAxNC4xMl0sIFsxMjIuOTksIDE0LjEyXSwgWzEyMi45OSwgMTQuMTNdLCBbMTIyLjk4LCAxNC4xM10sIFsxMjIuOTgsIDE0LjEyXV1dfX1dfQ==' }
            ];

            if (entityName === 'User') items = [
              { id: 'super-admin', name: 'Sam (Admin)', email: 'i.am.sam052408@gmail.com', role: 'admin' }
            ];

            saveCache(entityName, items);
          }

          // Simple ordering logic
          if (order) {
            const field = order.startsWith('-') ? order.substring(1) : order;
            const dir = order.startsWith('-') ? -1 : 1;
            items = [...items].sort((a, b) => {
              if (a[field] < b[field]) return -1 * dir;
              if (a[field] > b[field]) return 1 * dir;
              return 0;
            });
          }

          // Apply limit
          if (limit) {
            items = items.slice(0, limit);
          }

          return items;
        },
        create: async (data) => {
           const id = Math.random().toString(36).substr(2, 9);
           const item = { id, ...data, created_date: new Date().toISOString() };
           const items = getCache(entityName);
           items.unshift(item);
           saveCache(entityName, items);
           return item;
        },
        createMany: async (dataArray) => {
           const items = getCache(entityName);
           const newItems = dataArray.map(data => ({
             id: Math.random().toString(36).substr(2, 9),
             ...data,
             created_date: new Date().toISOString()
           }));
           const updated = [...newItems, ...items];
           saveCache(entityName, updated);
           return newItems;
        },
        update: async (id, data) => {
           const items = getCache(entityName);
           const index = items.findIndex(i => i.id === id);
           if (index > -1) {
             items[index] = { ...items[index], ...data };
             saveCache(entityName, items);
             return items[index];
           }
           return { id, ...data };
        },
        delete: async (id) => {
           const items = getCache(entityName);
           const newItems = items.filter(i => i.id !== id);
           saveCache(entityName, newItems);
           return { id };
        },
      };
    }
  };

  return {
    auth: {
      me: async () => JSON.parse(localStorage.getItem('pdrrmo_user')),
      login: async (email, password) => {
        let role = 'citizen';
        if (email.includes('admin') || email === 'i.am.sam052408@gmail.com') role = 'admin';
        const user = { id: 'u1', name: 'Sam (Admin)', role, email };
        localStorage.setItem('pdrrmo_user', JSON.stringify(user));
        return { user, token: 'token' };
      },
      register: async (data) => {
        const role = data.email === 'i.am.sam052408@gmail.com' ? 'admin' : 'citizen';
        const user = { id: Math.random().toString(36).substr(2, 9), ...data, role };
        localStorage.setItem('pdrrmo_user', JSON.stringify(user));
        return user;
      },
      logout: (url) => {
        localStorage.removeItem('pdrrmo_user');
        window.location.reload();
      }
    },
    entities: new Proxy({}, entityHandler),
    integrations: {
      Core: {
        UploadFile: async ({ file }) => {
          return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve({ file_url: e.target.result });
            reader.readAsDataURL(file);
          });
        }
      }
    }
  };
};
