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
            // ... (Seeding code same as before but keeping it clean)
            if (entityName === 'HazardLayer') items = [
              { id: 'l1', name: 'Flood Susceptibility (MGB)', type: 'flood', format: 'geojson', is_active: true, file_url: 'https://raw.githubusercontent.com/gynvael/geojson-repository/master/camarines_norte_sample.geojson' },
              {
                id: 'l2',
                name: 'Bagasbas High Risk Area',
                type: 'flood',
                format: 'geojson',
                is_active: true,
                file_url: 'data:application/json;base64,' + btoa(JSON.stringify({
                  "type": "FeatureCollection",
                  "features": [
                    {
                      "type": "Feature",
                      "properties": {
                        "name": "High Risk Purok 1",
                        "barangay": "Bagasbas",
                        "susceptibility": "very_high",
                        "info": "Frequent coastal flooding reported."
                      },
                      "geometry": {
                        "type": "Polygon",
                        "coordinates": [[[122.98, 14.12], [122.99, 14.12], [122.99, 14.13], [122.98, 14.13], [122.98, 14.12]]]
                      }
                    }
                  ]
                }))
              }
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
      logout: (url) => {
        localStorage.removeItem('pdrrmo_user');
        window.location.reload();
      }
    },
    entities: new Proxy({}, entityHandler),
    integrations: {
      Core: {
        UploadFile: async ({ file }) => {
          // IMPORTANT: To see real shapes, we read the actual uploaded file content
          return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
              const content = e.target.result;
              // We store the actual GeoJSON content in the "URL" for the mock to read later
              resolve({ file_url: `data:application/json;base64,${btoa(content)}` });
            };
            reader.readAsText(file);
          });
        }
      }
    }
  };
};
