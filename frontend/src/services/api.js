import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
});

const clearAuthAndRedirect = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');

  if (window.location.pathname !== '/login') {
    window.location.href = '/login';
  }
};

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  const publicIp = localStorage.getItem('clientPublicIp');
  const existingAuth = config.headers?.Authorization || config.headers?.authorization;

  if (token && !existingAuth) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  if (publicIp) {
    config.headers['x-client-public-ip'] = publicIp;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const message = error?.response?.data?.message || '';

    if (
      status === 401
      && (message === 'Invalid or expired token' || message === 'Access token missing')
    ) {
      clearAuthAndRedirect();
    }

    return Promise.reject(error);
  }
);

export default api;
