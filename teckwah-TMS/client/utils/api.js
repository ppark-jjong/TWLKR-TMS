import axios from 'axios';

// API 기본 설정
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

// Axios 인스턴스 생성
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // 쿠키를 포함한 요청
});

// 요청 인터셉터 - 토큰 추가
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 응답 인터셉터 - 401 에러 처리 (토큰 만료)
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    // 401 에러이고, 재시도하지 않은 경우
    if (error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        // 토큰 갱신 요청
        const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, {}, {
          withCredentials: true,
        });
        
        if (data.success && data.data.access_token) {
          // 새 토큰 저장
          localStorage.setItem('access_token', data.data.access_token);
          // 기존 요청의 헤더에 새 토큰 설정
          originalRequest.headers.Authorization = `Bearer ${data.data.access_token}`;
          // 기존 요청 재시도
          return api(originalRequest);
        }
      } catch (refreshError) {
        // 리프레시 토큰도 만료된 경우 로그인 페이지로 이동
        console.error('토큰 갱신 실패:', refreshError);
        localStorage.removeItem('access_token');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

// API 함수들
const apiService = {
  // 인증 관련 API
  auth: {
    login: async (credentials) => {
      const response = await api.post('/auth/login', credentials);
      return response.data;
    },
    logout: async () => {
      const response = await api.post('/auth/logout');
      localStorage.removeItem('access_token');
      return response.data;
    },
    refreshToken: async () => {
      const response = await api.post('/auth/refresh');
      return response.data;
    },
    getCurrentUser: async () => {
      const response = await api.get('/auth/me');
      return response.data;
    }
  },
  
  // 대시보드 관련 API
  dashboard: {
    getList: async (params) => {
      const response = await api.get('/dashboard/list', { params });
      return response.data;
    },
    getById: async (id) => {
      const response = await api.get(`/dashboard/${id}`);
      return response.data;
    },
    create: async (data) => {
      const response = await api.post('/dashboard', data);
      return response.data;
    },
    update: async (id, data) => {
      const response = await api.put(`/dashboard/${id}`, data);
      return response.data;
    },
    delete: async (id) => {
      const response = await api.delete(`/dashboard/${id}`);
      return response.data;
    },
    lockItem: async (id) => {
      const response = await api.post(`/dashboard/${id}/lock`);
      return response.data;
    },
    unlockItem: async (id) => {
      const response = await api.post(`/dashboard/${id}/unlock`);
      return response.data;
    },
    getVisualization: async (params) => {
      const response = await api.get('/dashboard/visualization', { params });
      return response.data;
    },
    getDrivers: async (params) => {
      const response = await api.get('/dashboard/drivers', { params });
      return response.data;
    }
  },
  
  // 인수인계 관련 API
  handover: {
    getList: async (params) => {
      const response = await api.get('/handover/list', { params });
      return response.data;
    },
    getById: async (id) => {
      const response = await api.get(`/handover/${id}`);
      return response.data;
    },
    create: async (data) => {
      const response = await api.post('/handover', data);
      return response.data;
    },
    update: async (id, data) => {
      const response = await api.put(`/handover/${id}`, data);
      return response.data;
    },
    delete: async (id) => {
      const response = await api.delete(`/handover/${id}`);
      return response.data;
    }
  },
  
  // 사용자 관련 API
  users: {
    getList: async (params) => {
      const response = await api.get('/users/list', { params });
      return response.data;
    },
    getById: async (id) => {
      const response = await api.get(`/users/${id}`);
      return response.data;
    },
    create: async (data) => {
      const response = await api.post('/users', data);
      return response.data;
    },
    update: async (id, data) => {
      const response = await api.put(`/users/${id}`, data);
      return response.data;
    },
    delete: async (id) => {
      const response = await api.delete(`/users/${id}`);
      return response.data;
    },
    changePassword: async (data) => {
      const response = await api.put('/users/password/change', data);
      return response.data;
    },
    getDepartments: async () => {
      const response = await api.get('/users/departments/list');
      return response.data;
    }
  }
};

export default apiService;