// This is the core SDK logic.
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
          const storedItems = localStorage.getItem(`pdrrmo_cache_${entityName}`);
          return storedItems ? JSON.parse(storedItems) : [];
        },
        get: async (id) => ({ id }),
        create: async (data) => {
           const id = Math.random().toString(36).substr(2, 9);
           const item = { id, ...data, created_date: new Date().toISOString() };
           return item;
        },
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
        // Bootstrap: Specific email automatically becomes admin
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
        localStorage.setItem('pdrrmo_token', 'token-' + user.role);
        return { user, token: 'token-' + user.role };
      },
      register: async (data) => {
        // Bootstrap: New registration with this email automatically gets Admin role
        const role = data.email === 'i.am.sam052408@gmail.com' ? 'admin' : 'citizen';
        const user = { id: Math.random().toString(36).substr(2, 9), ...data, role };
        localStorage.setItem('pdrrmo_user', JSON.stringify(user));
        return user;
      },
      logout: (url) => {
        localStorage.removeItem('pdrrmo_user');
        localStorage.removeItem('pdrrmo_token');
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
          // Use readAsDataURL to handle Unicode characters and large files correctly
          return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
              resolve({ file_url: e.target.result });
            };
            reader.readAsDataURL(file);
          });
        }
      }
    }
  };
};
