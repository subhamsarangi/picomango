import axios from 'axios';

const API_BASE_URL = 'http://127.0.0.1:8000/api/';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Intercept requests to add the Authorization header
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Intercept responses to handle token expiration (401)
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // If the error is 401 and we haven't retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('refreshToken');
      
      if (refreshToken) {
        try {
          // Attempt to refresh the token
          const res = await axios.post(`${API_BASE_URL}auth/refresh/`, {
            refresh: refreshToken,
          });
          
          if (res.status === 200) {
            localStorage.setItem('accessToken', res.data.access);
            // Re-attempt the original request with the new token
            originalRequest.headers.Authorization = `Bearer ${res.data.access}`;
            return api(originalRequest);
          }
        } catch (refreshError) {
          // If refresh fails, clear tokens (forces logout)
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          // We could dispatch a custom event here to let AuthContext know
          window.dispatchEvent(new Event('auth:logout'));
        }
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;
