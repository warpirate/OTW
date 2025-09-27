import axios from 'axios';
import { API_BASE_URL } from '../config';
import AuthService from './auth.service';

const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/api/customer/verifications`,
  headers: { 'Content-Type': 'application/json' }
});

apiClient.interceptors.request.use((config) => {
  const token = AuthService.getToken('customer');
  if (token) config.headers['Authorization'] = `Bearer ${token}`;
  return config;
});

const CustomerVerificationsService = {
  presignUpload: async ({ file_name, content_type, customer_type }) => {
    const { data } = await apiClient.post('/presign', { file_name, content_type, customer_type });
    return data;
  },
  confirmUpload: async ({ customer_type, object_key }) => {
    const { data } = await apiClient.post('/confirm', { customer_type, object_key });
    return data;
  },
  list: async () => {
    const { data } = await apiClient.get('/');
    return data;
  },
  presignView: async (id) => {
    const { data } = await apiClient.get(`/${id}/presign`);
    return data;
  },
  getDiscountInfo: async () => {
    const { data } = await apiClient.get('/discount-info');
    return data;
  },
  updateStatus: async (id, status) => {
    const { data } = await apiClient.put(`/${id}/status`, { status });
    return data;
  }
};

export default CustomerVerificationsService;
