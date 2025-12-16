import axios from 'axios';
import { API_BASE_URL } from '../config';
import AuthService from './auth.service';

const client = axios.create({
  baseURL: `${API_BASE_URL}/api/assistant`,
  headers: { 'Content-Type': 'application/json' }
});

client.interceptors.request.use((config) => {
  const token = AuthService.getToken();
  if (token) config.headers['Authorization'] = `Bearer ${token}`;
  return config;
});

export const AssistantService = {
  chat: async (messages) => {
    const res = await client.post('/chat', { messages });
    return res.data;
  }
};

export default AssistantService;
