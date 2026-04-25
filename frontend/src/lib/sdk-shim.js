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
          // Simulated data for some entities
          if (entityName === 'HazardAlert') return [
            { id: '1', title: 'PAGASA: Tropical Cyclone Wind Signal #1', severity: 'moderate', type: 'typhoon', status: 'active', issued_at: new Date().toISOString() },
            { id: '2', title: 'PHIVOLCS: Magnitude 4.2 Earthquake - Vinzons', severity: 'high', type: 'earthquake', status: 'monitoring', issued_at: new Date().toISOString() }
          ];
          return [];
        },
        get: async (id) => ({ id }),
        create: async (data) => data,
        update: async (id, data) => ({ id, ...data }),
        delete: async (id) => ({ id }),
      };
    }
  };

  return {
    auth: {
      me: async () => ({ id: 'mock-user', name: 'Demo User', role: 'admin' }),
      logout: (url) => {
        localStorage.clear();
        if (url) window.location.href = url;
      },
      redirectToLogin: (url) => {
        alert('Authentication Required (Mock)');
      }
    },
    entities: new Proxy({}, entityHandler),

    // Mocking common integrations
    integrations: {
      Core: {
        UploadFile: async ({ file }) => {
          console.log('Mock: Uploading file', file.name);
          return { file_url: `https://mock-storage.com/${file.name}` };
        }
      }
    },

    // Custom integration methods for Government Agencies
    external: {
      getMgbFloodHazard: async (municipality) => {
        console.log(`Fetching MGB Flood data for ${municipality}...`);
        // In a real app, this would call:
        // https://controlmap.mgb.gov.ph/arcgis/rest/services/MGBPublic/Flood/MapServer/0/query?...
        return { source: 'MGB', type: 'Flood', data: {} };
      },
      getPhivolcsLatest: async () => {
        console.log('Fetching latest PHIVOLCS Earthquake RSS...');
        return [];
      },
      getPagasaForecast: async () => {
        console.log('Fetching PAGASA Weather Forecast...');
        return {};
      }
    }
  };
};
