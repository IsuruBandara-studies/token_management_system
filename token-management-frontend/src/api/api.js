import axios from 'axios';

const API_BASE = 'http://localhost:5000/api';

export const api = axios.create({
  baseURL: API_BASE
});

// Automatically attach the staff token to every request, if logged in
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('staffToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth
export const loginStaff = (data) => api.post('/auth/login', data);

// Services
export const getServices = () => api.get('/services');
export const createService = (data) => api.post('/services', data);
export const updateService = (id, data) => api.put(`/services/${id}`, data);
export const deleteService = (id) => api.delete(`/services/${id}`);

// Counters
export const getCounters = () => api.get('/counters');
export const createCounter = (data) => api.post('/counters', data);

// Tokens
export const createToken = (data) => api.post('/tokens', data);
export const getQueue = () => api.get('/tokens/queue');
export const callNext = (counterId) => api.post('/tokens/call-next', { counterId });
export const completeToken = (tokenId) => api.post('/tokens/complete', { tokenId });