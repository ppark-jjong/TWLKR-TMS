// frontend/src/services/driverService.js

const DriverService = {
  getDriverList: async () => {
    try {
      const response = await api.get('/drivers');
      return response.data;
    } catch (error) {
      throw new Error('기사 목록 조회 실패');
    }
  }
};