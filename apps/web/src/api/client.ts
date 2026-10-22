import axios from 'axios';

const api = axios.create({
  baseURL: (import.meta as any).env?.VITE_API_URL || '/api',
  withCredentials: true, // Envía cookies HttpOnly si están presentes
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para enviar Bearer Token si está disponible en localStorage
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('newsflow_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
