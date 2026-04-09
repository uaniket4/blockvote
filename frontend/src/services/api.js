import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
});

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

export default api;
