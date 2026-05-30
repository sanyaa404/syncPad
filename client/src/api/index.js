import axios from 'axios';

const axiosInstance = axios.create({
  baseURL: '/api'
});

// Attach token to every request automatically
axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// If any response is 401, clear token
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const api = {
  auth: {
    register: (data) => axiosInstance.post('/auth/register', data),
    login: (data) => axiosInstance.post('/auth/login', data),
    me: () => axiosInstance.get('/auth/me'),
  },
  rooms: {
    create: (data) => axiosInstance.post('/rooms/create', data),
    join: (roomId) => axiosInstance.post(`/rooms/join/${roomId}`),
    getRoom: (roomId) => axiosInstance.get(`/rooms/${roomId}`),
    getMyRooms: () => axiosInstance.get('/rooms'),
  },
  execute: {
    run: (data) => axiosInstance.post('/execute', data),
  },
};