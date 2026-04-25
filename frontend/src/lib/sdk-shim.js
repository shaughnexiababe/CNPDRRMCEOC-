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
            { id: '1', title: 'PAGASA: Tropical Cyclone Wind Signal #1', severity: 'moderate', type: 'typhoon', status: 'active', issued_at: new Date().toISOString() },
            { id: '2', title: 'PHIVOLCS: Magnitude 4.2 Earthquake - Vinzons', severity: 'high', type: 'earthquake', status: 'monitoring', issued_at: new Date().toISOString() }
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
        if (!storedUser && token) {
           // Default to admin if token exists but no user stored
           return { id: 'admin-1', name: 'PDRRMO Admin', role: 'admin', email: 'admin@camnorte.gov.ph' };
        }
        return storedUser ? JSON.parse(storedUser) : null;
      },
      login: async (email, password) => {
        let user = { id: 'cit-1', name: 'Juan Dela Cruz', role: 'citizen', email };
        if (email.includes('admin')) user = { id: 'admin-1', name: 'PDRRMO Admin', role: 'admin', email };
        if (email.includes('eoc')) user = { id: 'eoc-1', name: 'EOC Responder', role: 'eoc_personnel', email };

        localStorage.setItem('pdrrmo_user', JSON.stringify(user));
        localStorage.setItem('pdrrmo_token', 'mock-token-' + user.role);
        return { user, token: 'mock-token-' + user.role };
      },
      register: async (data) => {
        const user = { id: Math.random().toString(36).substr(2, 9), ...data, role: 'citizen' };
        localStorage.setItem('pdrrmo_user', JSON.stringify(user));
        return user;
      },
      logout: (url) => {
        localStorage.removeItem('pdrrmo_user');
        localStorage.removeItem('pdrrmo_token');
        if (url) window.location.href = '/'; else window.location.reload();
      },
      redirectToLogin: (url) => {
        window.location.href = '/login';
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
