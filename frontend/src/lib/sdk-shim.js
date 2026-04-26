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
              { id: '1', title: 'PAGASA: Tropical Cyclone Wind Signal #1', severity: 'moderate', type: 'typhoon', status: 'active', issued_at: new Date().toISOString(), latitude: 14.1122, longitude: 122.9553 },
              { id: '2', title: 'PHIVOLCS: Magnitude 4.2 Earthquake - Vinzons', severity: 'high', type: 'earthquake', status: 'monitoring', issued_at: new Date().toISOString(), latitude: 14.1789, longitude: 122.9123 }
            ];

            if (entityName === 'Facility') items = [
              { id: 'f1', name: 'CamNorte Provincial Hospital', type: 'hospital', municipality: 'Daet', latitude: 14.1125, longitude: 122.9550, status: 'operational' },
              { id: 'f2', name: 'Daet Elementary Evacuation Center', type: 'evacuation_center', municipality: 'Daet', latitude: 14.1200, longitude: 122.9500, status: 'operational', current_occupancy: 45 }
            ];

            if (entityName === 'HazardLayer') items = [
              { id: 'l1', name: 'Flood Susceptibility (MGB)', type: 'flood', format: 'geojson', is_active: true, file_url: 'https://raw.githubusercontent.com/gynvael/geojson-repository/master/camarines_norte_sample.geojson' },
              { id: 'l2', name: 'Bagasbas High Risk Area', type: 'flood', format: 'geojson', is_active: true, file_url: 'data:application/json;base64,eyJ0eXBlIjogIkZlYXR1cmVDb2xsZWN0aW9uIiwgImZlYXR1cmVzIjogW3sidHlwZSI6ICJGZWF0dXJlIiwgInByb3BlcnRpZXMiOiB7Im5hbWUiOiAiSGlnaCBSaXNrIFB1cm9rIDEiLCAiYmFyYW5nYXkiOiAiQmFnYXNiYXMiLCAic3VzY2VwdGliaWxpdHkiOiAidmVyeV9oaWdoIn0sICJnZW9tZXRyeSI6IHsidHlwZSI6ICJQb2x5Z29uIiwgImNvb3JkaW5hdGVzIjogW1tbMTIyLjk4LCAxNC4xMl0sIFsxMjIuOTksIDE0LjEyXSwgWzEyMi45OSwgMTQuMTNdLCBbMTIyLjk4LCAxNC4xM10sIFsxMjIuOTgsIDE0LjEyXV1dfX1dfQ==' },
              { id: 'l3', name: 'Provincial Infrastructure (OSM)', type: 'infrastructure', format: 'geojson', is_active: true, source: 'OpenStreetMap', file_url: 'https://raw.githubusercontent.com/shaughnexiababe/CNPDRRMCEOC-/main/infrastructure_base.geojson' }
            ];

            if (entityName === 'User') items = [
              { id: 'super-admin', name: 'Sam (Admin)', email: 'i.am.sam052408@gmail.com', role: 'admin' }
            ];

            saveCache(entityName, items);
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
