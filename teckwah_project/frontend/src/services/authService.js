import api from './api';

export const authService = {
  login: async (userId, password) => {
    const response = await api.post('/auth/login', {
      user_id: userId,
      password: password
    });
    return response.data;
  },
  logout: async () => {
    const response = await api.post('/auth/logout');
    return response.data;
  }
};
