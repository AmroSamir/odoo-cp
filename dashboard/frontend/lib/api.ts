import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true, // send httpOnly cookie automatically
});

// On 401, redirect to login (but not if already on login page)
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (
      err.response?.status === 401 &&
      typeof window !== 'undefined' &&
      !window.location.pathname.startsWith('/login')
    ) {
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;
