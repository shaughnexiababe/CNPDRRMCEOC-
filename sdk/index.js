// This is the core SDK logic. For now, we will move the logic from our mock here.
import axios from 'axios';

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

export const createClient = ({ appId, token, appBaseUrl }) => {
  const entityHandler = {
    get: (target, entityName) => {
      return {
        list: async (order, limit) => {
          // This will eventually call the real Vercel API
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
      me: async () => ({ id: 'prod-user', name: 'Authorized User', role: 'admin' }),
      logout: (url) => {
        localStorage.clear();
        if (url) window.location.href = url;
      },
      redirectToLogin: (url) => {
        window.location.href = `https://cnpdrrmceoc.vercel.app/login?returnTo=${url}`;
      }
    },
    entities: new Proxy({}, entityHandler)
  };
};
